import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outputRoot = resolve(process.argv[2] || 'tests/fixtures');
const validNames = ['received', 'executing', 'verifying', 'diagnosing', 'complete', 'blocked'];
const invalidNames = ['unknown-protocol', 'schema-mismatch', 'malformed-config'];
const timestamp = '2026-01-01T00:00:00.000Z';

function writeJson(path, value) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function createValidFixture(name) {
  const root = join(outputRoot, 'protocol-valid', name);
  rmSync(root, { recursive: true, force: true });
  const taskId = `conformance-${name}`;
  const taskKey = createHash('sha256').update(taskId).digest('hex');
  const taskRoot = join(root, '.forgeloop', 'task-state', taskKey);
  const fingerprint = 'a'.repeat(64);
  mkdirSync(taskRoot, { recursive: true });
  writeJson(join(root, 'fixture.json'), {
    forgeloopVersion: '1.3.0',
    protocolVersion: 1,
    expectedStudioHealth: 'VALID',
    expectedPhase: name.toUpperCase(),
  });
  writeJson(join(root, '.forgeloop', 'config.json'), { schemaVersion: 1, protocolVersion: 1, complianceMode: 'advisory' });
  writeJson(join(root, '.forgeloop', 'sources.json'), { schemaVersion: 1, protocolVersion: 1, sources: {} });
  writeJson(join(taskRoot, 'task.json'), {
    schemaVersion: 1, protocolVersion: 1, taskId, taskKey, createdAt: timestamp, updatedAt: timestamp, writeClaims: [],
  });
  writeJson(join(taskRoot, 'work-state.json'), {
    schemaVersion: 1, protocolVersion: 1, taskId, contractFingerprint: fingerprint,
    repositoryFingerprint: { branch: 'main', head: 'fixture' }, phase: name.toUpperCase(),
    selectedGuides: [], completedSteps: [], pendingSteps: [], checks: [], failures: [], blockers: [], lastUpdated: timestamp,
  });
}

function createInvalidFixture(name) {
  const root = join(outputRoot, 'protocol-invalid', name);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(join(root, '.forgeloop'), { recursive: true });
  writeJson(join(root, 'fixture.json'), { forgeloopVersion: '1.3.0', protocolVersion: name === 'unknown-protocol' ? 2 : 1 });
  if (name === 'malformed-config') {
    writeFileSync(join(root, '.forgeloop', 'config.json'), '{"schemaVersion":');
    return;
  }
  writeJson(join(root, '.forgeloop', 'config.json'), {
    schemaVersion: name === 'schema-mismatch' ? 2 : 1,
    protocolVersion: name === 'unknown-protocol' ? 2 : 1,
    complianceMode: 'advisory',
  });
}

for (const name of validNames) createValidFixture(name);
for (const name of invalidNames) createInvalidFixture(name);
console.log(`Generated ${validNames.length} valid and ${invalidNames.length} invalid ForgeLoop fixtures`);
