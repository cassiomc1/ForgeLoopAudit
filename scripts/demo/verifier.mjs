import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { SCHEMA_FILES, assertSchemaValid } from './fixtures.mjs';

const REGISTERED_ARTIFACT_TYPES = Object.keys(SCHEMA_FILES);

const REQUIRED_FILES = [
  '.forgeloop/config.json',
  '.forgeloop/sources.json',
  '.forgeloop/policy/rules.json',
  '.forgeloop/policy/discovery.json',
  '.forgeloop/policy/baseline.json',
  '.forgeloop/policy/policy.lock',
  'README.md',
  'package.json',
  'src/app.ts',
  'src/catalog.ts',
  'src/cart.ts',
  'src/checkout.ts',
  'tests/catalog.test.ts',
  'tests/cart.test.ts',
  'tests/checkout.test.ts',
];

const EXPECTED_PHASES = ['COMPLETE', 'VERIFYING', 'EXECUTING', 'BLOCKED', 'PLANNED'];

const SCHEMA_BY_FILE = {
  'config.json': 'config.json',
  'sources.json': 'sources.json',
  'task.json': 'task.json',
  'contract.json': 'contract.json',
  'routing-result.json': 'routing-result.json',
  'preflight.json': 'preflight.json',
  'work-state.json': 'work-state.json',
  'continuity.json': 'continuity.json',
  'execution-receipt.json': 'execution-receipt.json',
  'session.json': 'session.json',
  'policy-snapshot.json': 'policy-snapshot.json',
};

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function eventHash(event) {
  const { hash: _hash, ...body } = event;
  return createHash('sha256').update(JSON.stringify(canonicalize(body))).digest('hex');
}

function isInsideRoot(root, candidate) {
  const resolved = resolve(root, candidate);
  return resolved === root || resolved.startsWith(`${root}${sep}`);
}

function listTaskDirs(forgeLoopRoot) {
  const taskStateDir = join(forgeLoopRoot, 'task-state');
  if (!existsSync(taskStateDir)) return [];
  return readdirSync(taskStateDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .map((entry) => entry.name);
}

export function verifyDemoProject(root) {
  const errors = [];
  const warn = (message) => errors.push(message);

  if (!existsSync(root) || !lstatSync(root).isDirectory()) {
    return { ok: false, errors: [`demo directory does not exist at ${root}`], stats: {} };
  }

  for (const required of REQUIRED_FILES) {
    if (!existsSync(join(root, required))) warn(`required file missing: ${required}`);
  }
  if (errors.length > 0) return { ok: false, errors, stats: {} };

  const forgeLoopRoot = join(root, '.forgeloop');

  // No symlink bypass anywhere under the demo project.
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) warn(`symlink bypass detected: ${relative(root, join(dir, entry.name))}`);
      else if (entry.isDirectory()) walk(join(dir, entry.name));
    }
  };
  walk(root);

  // Project detection + protocol compatibility.
  let config;
  try {
    config = JSON.parse(readFileSync(join(forgeLoopRoot, 'config.json'), 'utf8'));
  } catch (error) {
    return { ok: false, errors: [`config.json does not parse: ${error.message}`], stats: {} };
  }
  assertSchemaValid('config.json', config);
  if (config.protocolVersion !== 1) warn(`unsupported protocolVersion: ${config.protocolVersion}`);

  // Every JSON artifact parses and validates against the trusted schemas.
  const represented = new Set(['config.json', 'sources.json']);
  const sessionFiles = readdirSync(join(forgeLoopRoot, 'sessions')).filter((name) => name.endsWith('.json'));
  if (sessionFiles.length > 0) represented.add('session.json');
  for (const name of sessionFiles) {
    const value = JSON.parse(readFileSync(join(forgeLoopRoot, 'sessions', name), 'utf8'));
    assertSchemaValid('session.json', value);
  }
  for (const [name, artifact] of [['rules.json', 'policy/rules.json'], ['discovery.json', 'policy/discovery.json'], ['baseline.json', 'policy/baseline.json'], ['policy.lock', 'policy/policy.lock']]) {
    const value = JSON.parse(readFileSync(join(forgeLoopRoot, 'policy', name), 'utf8'));
    assertSchemaValid(artifact, value);
    represented.add(artifact);
  }

  // Task state.
  const seenTaskIds = new Map();
  const phases = new Set();
  let eventCount = 0;
  const pathReferences = [];

  for (const taskKey of listTaskDirs(forgeLoopRoot)) {
    if (!/^[a-f0-9]{64}$/.test(taskKey)) warn(`task directory is not a sha256 hex key: ${taskKey}`);
    const taskDir = join(forgeLoopRoot, 'task-state', taskKey);
    const artifacts = {};
    for (const entry of readdirSync(taskDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === 'gates') {
          for (const gateFile of readdirSync(join(taskDir, 'gates')).filter((name) => name.endsWith('.json'))) {
            const value = JSON.parse(readFileSync(join(taskDir, 'gates', gateFile), 'utf8'));
            assertSchemaValid('gate.json', value);
            represented.add('gate.json');
            for (const artifactRef of value.artifacts ?? []) pathReferences.push({ taskId: value.taskId, path: artifactRef.path });
          }
        }
        continue;
      }
      if (!entry.name.endsWith('.json')) continue;
      const value = JSON.parse(readFileSync(join(taskDir, entry.name), 'utf8'));
      const schemaName = SCHEMA_BY_FILE[entry.name];
      if (schemaName) {
        assertSchemaValid(schemaName, value);
        represented.add(schemaName);
      }
      artifacts[entry.name] = value;
    }

    const descriptor = artifacts['task.json'];
    if (!descriptor) {
      warn(`task ${taskKey} has no task.json`);
      continue;
    }
    const expectedKey = createHash('sha256').update(descriptor.taskId).digest('hex');
    if (descriptor.taskKey !== expectedKey) warn(`task ${descriptor.taskId}: taskKey is not sha256(taskId)`);
    if (taskKey !== expectedKey) warn(`task directory ${taskKey} does not match sha256(taskId)`);
    if (seenTaskIds.has(descriptor.taskId)) warn(`duplicate task id: ${descriptor.taskId}`);
    seenTaskIds.set(descriptor.taskId, { taskKey, phase: artifacts['work-state.json']?.phase });

    const workState = artifacts['work-state.json'];
    if (typeof workState?.phase === 'string') phases.add(workState.phase);
    if (descriptor.taskId && workState && workState.taskId !== descriptor.taskId) warn(`task ${descriptor.taskId}: work-state taskId mismatch`);

    // Completed tasks must carry an execution receipt.
    if (workState?.phase === 'COMPLETE' && !artifacts['execution-receipt.json']) {
      warn(`task ${descriptor.taskId}: COMPLETE without execution-receipt.json`);
    }

    // Contract and continuity references resolve inside the demo project.
    for (const ref of artifacts['contract.json']?.sourceRefs ?? []) {
      pathReferences.push({ taskId: descriptor.taskId, path: ref });
    }
    for (const ref of [...(artifacts['continuity.json']?.changedAreas ?? []), ...(artifacts['continuity.json']?.inspectFirst ?? [])]) {
      pathReferences.push({ taskId: descriptor.taskId, path: ref });
    }
    for (const ref of artifacts['execution-receipt.json']?.changedPaths ?? []) {
      pathReferences.push({ taskId: descriptor.taskId, path: ref });
    }

    // Event ledger integrity (same canonical hash chain as the Studio reader).
    const ledgerPath = join(taskDir, 'events.ndjson');
    if (!existsSync(ledgerPath)) {
      warn(`task ${descriptor.taskId} has no events.ndjson`);
      continue;
    }
    represented.add('event');
    const lines = readFileSync(ledgerPath, 'utf8').split('\n').filter((line) => line.trim());
    if (lines.length === 0) warn(`task ${descriptor.taskId}: empty event ledger`);
    let previous;
    lines.forEach((line, index) => {
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        warn(`event ledger ${descriptor.taskId} line ${index + 1}: invalid JSON`);
        return;
      }
      try {
        assertSchemaValid('event', parsed);
      } catch (error) {
        warn(`event ledger ${descriptor.taskId} line ${index + 1}: ${error.message}`);
        return;
      }
      if (parsed.taskId !== descriptor.taskId) warn(`event ledger ${descriptor.taskId} line ${index + 1}: foreign taskId ${parsed.taskId}`);
      if (!previous && (parsed.seq !== 1 || parsed.previousHash !== null)) warn(`event ledger ${descriptor.taskId} line 1: invalid first sequence`);
      if (previous && parsed.seq !== previous.seq + 1) warn(`event ledger ${descriptor.taskId}: sequence gap at seq ${parsed.seq}`);
      if (previous && parsed.previousHash !== previous.hash) warn(`event ledger ${descriptor.taskId}: previousHash mismatch at seq ${parsed.seq}`);
      if (parsed.hash !== eventHash(parsed)) warn(`event ledger ${descriptor.taskId}: stored hash mismatch at seq ${parsed.seq}`);
      previous = parsed;
      eventCount++;
    });
  }

  if (seenTaskIds.size < 6) warn(`expected at least 6 tasks, found ${seenTaskIds.size}`);
  for (const phase of EXPECTED_PHASES) {
    if (!phases.has(phase)) warn(`expected lifecycle phase not represented: ${phase}`);
  }

  // Demo must represent every registered ForgeLoop artifact category.
  const missingArtifactTypes = REGISTERED_ARTIFACT_TYPES.filter((artifact) => !represented.has(artifact));
  for (const artifact of missingArtifactTypes) {
    warn(`demo does not represent registered artifact category: ${artifact}`);
  }

  // Policy lock digests recompute from the locked artifacts.
  const rulesText = readFileSync(join(forgeLoopRoot, 'policy', 'rules.json'), 'utf8');
  const baselineText = readFileSync(join(forgeLoopRoot, 'policy', 'baseline.json'), 'utf8');
  const lock = JSON.parse(readFileSync(join(forgeLoopRoot, 'policy', 'policy.lock'), 'utf8'));
  const digestOf = (text) => createHash(lock.algorithm || 'sha256').update(text).digest('hex');
  if (lock.rulesDigest !== digestOf(rulesText)) warn('policy.lock rulesDigest mismatch');
  if (lock.baselineDigest !== digestOf(baselineText)) warn('policy.lock baselineDigest mismatch');
  if (lock.digest !== digestOf(rulesText + baselineText)) warn('policy.lock combined digest mismatch');

  // Referenced paths exist and never escape the demo root.
  const unresolved = [];
  for (const reference of pathReferences) {
    if (!isInsideRoot(root, reference.path)) {
      unresolved.push(`${reference.taskId}: ${reference.path} escapes the demo root`);
      continue;
    }
    if (!existsSync(join(root, reference.path))) unresolved.push(`${reference.taskId}: ${reference.path} does not exist`);
  }
  for (const message of unresolved.slice(0, 10)) warn(`unresolved reference — ${message}`);

  return {
    ok: errors.length === 0,
    errors,
    stats: {
      tasks: seenTaskIds.size,
      events: eventCount,
      phases: [...phases].sort(),
      sessions: sessionFiles.length,
      checkedReferences: pathReferences.length,
      artifactCoverage: {
        represented: REGISTERED_ARTIFACT_TYPES.length - missingArtifactTypes.length,
        total: REGISTERED_ARTIFACT_TYPES.length,
        missing: missingArtifactTypes,
      },
    },
  };
}
