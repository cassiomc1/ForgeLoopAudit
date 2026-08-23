import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PathBoundary } from '@main/security/path-boundary';
import { SchemaValidator } from '@main/core/protocol/validator';
import { createExecutionReader } from '@main/core/executions/execution-reader';

const VALID_EXECUTION = {
  schemaVersion: 1,
  protocolVersion: 1,
  executionId: 'exec-1',
  taskId: 'TASK-001',
  checkId: 'check-tests',
  requirement: 'Tests must pass',
  verificationCycle: 1,
  kind: 'COMMAND_EXECUTION',
  argv: ['npm', 'test'],
  cwd: '/repo',
  resolution: { resolutionMode: 'direct', mayInstall: false, installer: null, tool: null },
  startedAt: '2026-08-20T10:00:00.000Z',
  finishedAt: '2026-08-20T10:01:00.000Z',
  status: 'passed',
  exitCode: 0,
};

describe('core/executions/execution-reader', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'forgeloop-executions-'));
    const execDir = join(root, '.forgeloop', 'task-state', 'a'.repeat(64), 'executions');
    mkdirSync(execDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function reader() {
    return createExecutionReader(new PathBoundary(root), new SchemaValidator('schemas'));
  }

  it('reads valid executions in deterministic order', () => {
    const dir = join(root, '.forgeloop', 'task-state', 'a'.repeat(64), 'executions');
    for (const id of ['exec-c', 'exec-a', 'exec-b']) {
      writeFileSync(join(dir, `${id}.json`), JSON.stringify({ ...VALID_EXECUTION, executionId: id }));
    }
    const page = reader().readExecutions('a'.repeat(64));
    expect(page.executions.map((entry) => entry.executionId)).toEqual(['exec-a', 'exec-b', 'exec-c']);
    expect(page.invalidCount).toBe(0);
  });

  it('surfaces invalid executions without dropping the valid ones', () => {
    const dir = join(root, '.forgeloop', 'task-state', 'a'.repeat(64), 'executions');
    writeFileSync(join(dir, 'exec-good.json'), JSON.stringify(VALID_EXECUTION));
    writeFileSync(join(dir, 'exec-bad.json'), JSON.stringify({ ...VALID_EXECUTION, status: 'meh' }));
    const page = reader().readExecutions('a'.repeat(64));
    expect(page.executions).toHaveLength(1);
    expect(page.invalidCount).toBe(1);
  });

  it('rejects symlinked execution files', () => {
    const dir = join(root, '.forgeloop', 'task-state', 'a'.repeat(64), 'executions');
    symlinkSync('/etc/hostname', join(dir, 'exec-link.json'));
    const page = reader().readExecutions('a'.repeat(64));
    expect(page.executions).toHaveLength(0);
    expect(page.invalidCount).toBe(1);
  });

  it('only accepts exec-*.json file names', () => {
    const dir = join(root, '.forgeloop', 'task-state', 'a'.repeat(64), 'executions');
    writeFileSync(join(dir, 'notes.json'), JSON.stringify(VALID_EXECUTION));
    const page = reader().readExecutions('a'.repeat(64));
    expect(page.executions).toHaveLength(0);
    expect(page.invalidCount).toBe(0);
  });

  it('returns an empty bounded result when the directory is missing', () => {
    const page = reader().readExecutions('b'.repeat(64));
    expect(page.executions).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  it('bounds the number of returned executions', () => {
    const dir = join(root, '.forgeloop', 'task-state', 'a'.repeat(64), 'executions');
    for (let i = 0; i < 5; i += 1) {
      writeFileSync(join(dir, `exec-${i}.json`), JSON.stringify({ ...VALID_EXECUTION, executionId: `exec-${i}` }));
    }
    const page = reader().readExecutions('a'.repeat(64), { limit: 2 });
    expect(page.executions).toHaveLength(2);
    expect(page.hasMore).toBe(true);
  });

  it('rejects path escape attempts through the task key', () => {
    expect(() => reader().readExecutions('../../escape')).toThrow();
  });

  it('rejects a symlinked executions directory', () => {
    const key = 'c'.repeat(64);
    mkdirSync(join(root, '.forgeloop', 'task-state', key), { recursive: true });
    symlinkSync('/etc', join(root, '.forgeloop', 'task-state', key, 'executions'));
    expect(() => reader().readExecutions(key)).toThrow(/Path traversal|symbolic link/i);
  });

  it('rejects when the executions path resolves to a regular file instead of a directory', () => {
    const key = 'd'.repeat(64);
    mkdirSync(join(root, '.forgeloop', 'task-state', key), { recursive: true });
    writeFileSync(join(root, '.forgeloop', 'task-state', key, 'executions'), 'not a directory');
    expect(() => reader().readExecutions(key)).toThrow();
  });
});
