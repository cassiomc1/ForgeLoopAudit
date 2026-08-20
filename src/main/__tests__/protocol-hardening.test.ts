import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { PathBoundary } from '@main/security/path-boundary';
import { ProjectReader } from '@main/core/project/project-reader';
import { SchemaValidator } from '@main/core/protocol/validator';
import { GateReader } from '@main/core/tasks/task-index';
import { EventLedgerReader } from '@main/core/events/ledger-reader';

const schemasDir = resolve(process.cwd(), 'schemas');
const sha = 'a'.repeat(64);

function makeProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'forgeloop-studio-hardening-'));
  mkdirSync(join(root, '.forgeloop', 'task-state', 'task-1', 'gates'), { recursive: true });
  mkdirSync(join(root, '.forgeloop', 'sessions'), { recursive: true });
  return root;
}

function validWorkState(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    protocolVersion: 1,
    taskId: 'task-1',
    contractFingerprint: sha,
    repositoryFingerprint: { branch: 'main', head: sha },
    phase: 'EXECUTING',
    selectedGuides: [],
    completedSteps: [],
    pendingSteps: ['verify'],
    checks: [],
    failures: [],
    blockers: [],
    lastUpdated: '2026-08-20T00:00:00.000Z',
  };
}

describe('sixth review protocol hardening', () => {
  it('accepts canonical activation sessions and rejects policy snapshots', () => {
    const root = makeProject();
    try {
      writeFileSync(join(root, '.forgeloop', 'sessions', 'session-1.json'), JSON.stringify({
        schemaVersion: 1,
        protocolVersion: 1,
        sessionId: 'session-1',
        activationMarker: 'activated',
        createdAt: '2026-08-20T00:00:00.000Z',
      }));
      writeFileSync(join(root, '.forgeloop', 'sessions', 'snapshot.json'), JSON.stringify({
        schemaVersion: 1,
        policyDigest: sha,
        rules: [],
      }));
      const reader = new ProjectReader(new PathBoundary(root), new SchemaValidator(schemasDir));
      expect(reader.readSession('session-1')).toMatchObject({ sessionId: 'session-1', activationMarker: 'activated' });
      expect(() => reader.readSession('snapshot')).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('retains the last valid artifact when the next JSON write is malformed', () => {
    const root = makeProject();
    const workStatePath = join(root, '.forgeloop', 'task-state', 'task-1', 'work-state.json');
    try {
      writeFileSync(workStatePath, JSON.stringify(validWorkState()));
      const reader = new ProjectReader(new PathBoundary(root), new SchemaValidator(schemasDir));
      reader.readTaskSummaryArtifacts('task-1');
      writeFileSync(workStatePath, '{');
      const result = reader.readTaskSummaryArtifacts('task-1');
      expect(result['work-state.json']).toMatchObject({ phase: 'EXECUTING' });
      expect(result.artifactErrors).toEqual(expect.arrayContaining([expect.stringContaining('work-state.json')]));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('retains a valid artifact across schema-invalid and restored writes', () => {
    const root = makeProject();
    const workStatePath = join(root, '.forgeloop', 'task-state', 'task-1', 'work-state.json');
    try {
      writeFileSync(workStatePath, JSON.stringify(validWorkState()));
      const reader = new ProjectReader(new PathBoundary(root), new SchemaValidator(schemasDir));
      reader.readTaskSummaryArtifacts('task-1');
      writeFileSync(workStatePath, JSON.stringify({ ...validWorkState(), phase: 'NOT_A_PHASE' }));
      const invalid = reader.readTaskSummaryArtifacts('task-1');
      expect(invalid['work-state.json']).toMatchObject({ phase: 'EXECUTING' });
      expect(invalid.artifactErrors).toEqual(expect.arrayContaining([expect.stringContaining('work-state.json')]));
      writeFileSync(workStatePath, JSON.stringify({ ...validWorkState(), phase: 'COMPLETE' }));
      const restored = reader.readTaskSummaryArtifacts('task-1');
      expect(restored['work-state.json']).toMatchObject({ phase: 'COMPLETE' });
      expect(restored.artifactErrors).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not expose a symlinked task artifact outside the project', () => {
    const root = makeProject();
    const outside = join(root, '..', `outside-${Date.now()}.json`);
    try {
      writeFileSync(outside, JSON.stringify({ phase: 'COMPLETE', secret: 'outside' }));
      symlinkSync(outside, join(root, '.forgeloop', 'task-state', 'task-1', 'work-state.json'));
      const reader = new ProjectReader(new PathBoundary(root), new SchemaValidator(schemasDir));
      const result = reader.readTaskSummaryArtifacts('task-1');
      expect(result['work-state.json']).toBeUndefined();
      expect(result.artifactErrors).toEqual(expect.arrayContaining([expect.stringContaining('work-state.json')]));
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { force: true });
    }
  });

  it('adapts the canonical gate shape through Ajv', () => {
    const root = makeProject();
    try {
      writeFileSync(join(root, '.forgeloop', 'task-state', 'task-1', 'gates', 'compile.json'), JSON.stringify({
        schemaVersion: 1,
        protocolVersion: 1,
        taskId: 'task-1',
        gate: 'compile',
        status: 'satisfied',
        requiredBy: ['release'],
        artifacts: [{ path: 'dist/app.js', sha256: sha }],
        decisions: [],
        unknowns: [],
        approvedAssumptions: [],
        evidence: [{ kind: 'OBSERVED', result: 'build passed' }],
      }));
      const reader = new GateReader(new PathBoundary(root), new SchemaValidator(schemasDir));
      expect(reader.readGates('task-1')).toEqual([expect.objectContaining({
        id: 'compile',
        artifacts: [{ path: 'dist/app.js', sha256: sha }],
        evidence: [{ kind: 'OBSERVED', result: 'build passed' }],
      })]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('validates persisted events with the canonical schema', () => {
    const root = makeProject();
    try {
      writeFileSync(join(root, '.forgeloop', 'task-state', 'task-1', 'events.ndjson'), JSON.stringify({
        seq: 1,
        schemaVersion: 1,
        protocolVersion: 1,
        taskId: 'task-1',
        event: 'TASK_CREATED',
        at: '2026-08-20T00:00:00.000Z',
        previousHash: null,
        hash: sha,
        details: 'must be object',
      }) + '\n');
      const reader = new EventLedgerReader(new PathBoundary(root), new SchemaValidator(schemasDir));
      expect(reader.readEventsPaginated('task-1').validation).toMatchObject({ schema: 'INVALID', invalidLineCount: 1 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
