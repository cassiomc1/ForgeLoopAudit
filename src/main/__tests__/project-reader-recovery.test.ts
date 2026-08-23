import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PathBoundary } from '@main/security/path-boundary';
import { SchemaValidator } from '@main/core/protocol/validator';
import { createProjectReader } from '@main/core/project/project-reader';

const CONFIG = {
  schemaVersion: 1,
  protocolVersion: 1,
  projectName: 'Recovery Fixture',
};

const KEY = 'a'.repeat(64);

const TASK_JSON = {
  schemaVersion: 1,
  protocolVersion: 1,
  taskId: 'TASK-001',
  taskKey: KEY,
  createdAt: '2026-08-20T09:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
  writeClaims: [],
};

const RECOVERY = {
  schemaVersion: 1,
  protocolVersion: 1,
  taskId: 'TASK-001',
  status: 'RECOVERED',
  recoveredAt: '2026-08-20T10:00:00.000Z',
  recoveryId: 'recovery-abc123',
  recoveryEventSeq: 7,
  classificationAtRecovery: 'STALE',
  reasonCodes: ['E_TASK_CLAIM_STALE'],
  releasedClaims: ['src/a/**'],
  previousPhase: 'EXECUTING',
  previousRevision: 3,
  repositoryFingerprint: { branch: 'main', head: null },
  authority: { kind: 'HOST_ATTESTED' },
};

describe('project-reader recovery artifact', () => {
  let root: string;
  let reader: ReturnType<typeof createProjectReader>;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'forgeloop-recovery-'));
    const taskDir = join(root, '.forgeloop', 'task-state', KEY);
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(root, '.forgeloop', 'config.json'), JSON.stringify(CONFIG));
    writeFileSync(join(taskDir, 'task.json'), JSON.stringify(TASK_JSON));
    reader = createProjectReader(new PathBoundary(root), new SchemaValidator('schemas'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('reads a valid recovery.json as a raw task artifact', () => {
    writeFileSync(join(root, '.forgeloop', 'task-state', KEY, 'recovery.json'), JSON.stringify(RECOVERY));
    const artifacts = reader.readTaskSummaryArtifacts(KEY);
    expect(artifacts['recovery.json']).toBeDefined();
    expect((artifacts['recovery.json'] as Record<string, unknown>).recoveryId).toBe('recovery-abc123');
    expect(artifacts.artifactErrors as string[] | undefined).toBeUndefined();
  });

  it('surfaces schema-invalid recovery instead of silently accepting it', () => {
    writeFileSync(
      join(root, '.forgeloop', 'task-state', KEY, 'recovery.json'),
      JSON.stringify({ ...RECOVERY, status: 'NOT_RECOVERED_AT_ALL' }),
    );
    const artifacts = reader.readTaskSummaryArtifacts(KEY);
    expect(artifacts['recovery.json']).toBeUndefined();
    expect(((artifacts.artifactErrors as string[] | undefined) || []).some((entry) => entry.startsWith('recovery.json:'))).toBe(true);
  });

  it('rejects symbolic link recovery artifacts', () => {
    symlinkSync('/etc/hostname', join(root, '.forgeloop', 'task-state', KEY, 'recovery.json'));
    const artifacts = reader.readTaskSummaryArtifacts(KEY);
    expect(artifacts['recovery.json']).toBeUndefined();
    expect(((artifacts.artifactErrors as string[] | undefined) || []).join('\n')).toMatch(/symbolic links/);
  });
});
