import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PathBoundary } from '@main/security/path-boundary';
import { ProjectWatcher } from '@main/watcher/project-watcher';

const TASK_KEY = 'a'.repeat(64);

async function makeProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'forgeloop-watcher-recovery-'));
  await mkdir(join(root, '.forgeloop', 'task-state', TASK_KEY, 'executions'), { recursive: true });
  await mkdir(join(root, '.forgeloop', 'task-state', TASK_KEY, 'actions'), { recursive: true });
  await mkdir(join(root, '.forgeloop', 'task-state', TASK_KEY, 'approvals'), { recursive: true });
  await mkdir(join(root, '.forgeloop', 'task-state', TASK_KEY, 'evaluations'), { recursive: true });
  await mkdir(join(root, '.forgeloop', 'policy'), { recursive: true });
  return root;
}

async function waitForEvent(events: unknown[], predicate: (event: unknown) => boolean): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if (events.some(predicate)) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  expect(events).toEqual(expect.arrayContaining([expect.any(Object)]));
  throw new Error('Timed out waiting for watcher event');
}

describe('watcher recovery and execution artifacts', () => {
  it('emits an artifact-changed event when recovery.json appears', async () => {
    const root = await makeProject();
    const boundary = new PathBoundary(root);
    const events: unknown[] = [];
    const watcher = new ProjectWatcher(boundary, (event) => events.push(event), vi.fn(), vi.fn());
    watcher.start();
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await writeFile(
        join(root, '.forgeloop', 'task-state', TASK_KEY, 'recovery.json'),
        JSON.stringify({ schemaVersion: 1 }),
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'artifact-changed', artifact: 'recovery.json', taskKey: TASK_KEY }),
      ]));
    } finally {
      watcher.stop();
    }
  });

  it('classifies execution artifact changes as bounded execution-changed events', async () => {
    const root = await makeProject();
    const boundary = new PathBoundary(root);
    const events: unknown[] = [];
    const watcher = new ProjectWatcher(boundary, (event) => events.push(event), vi.fn(), vi.fn());
    watcher.start();
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await writeFile(
        join(root, '.forgeloop', 'task-state', TASK_KEY, 'executions', 'exec-1.json'),
        JSON.stringify({ schemaVersion: 1 }),
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'execution-changed', taskKey: TASK_KEY }),
      ]));
      expect(events).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'artifact-changed', artifact: 'exec-1.json' }),
      ]));
    } finally {
      watcher.stop();
    }
  }, 10000);

  it.each([
    ['actions', 'action-added', 'action-changed'],
    ['approvals', 'approval-added', 'approval-changed'],
    ['evaluations', 'eval-added', 'evaluation-changed'],
  ])('classifies %s collection files without promoting their directories to tasks', async (collection, fileStem, eventType) => {
    const root = await makeProject();
    const boundary = new PathBoundary(root);
    const events: unknown[] = [];
    const watcher = new ProjectWatcher(boundary, (event) => events.push(event), vi.fn(), vi.fn());
    const fileName = `${fileStem}.json`;
    const filePath = join(root, '.forgeloop', 'task-state', TASK_KEY, collection, fileName);
    watcher.start();
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await writeFile(filePath, JSON.stringify({ schemaVersion: 1 }));
      await waitForEvent(events, (event) => (
        typeof event === 'object' && event !== null
          && (event as { type?: string }).type === eventType
          && (event as { taskKey?: string }).taskKey === TASK_KEY
      ));
      expect(events).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'task-added', taskKey: TASK_KEY }),
      ]));
    } finally {
      watcher.stop();
    }
  }, 10000);

  it('classifies collection file changes and removals as bounded typed events', async () => {
    const root = await makeProject();
    const boundary = new PathBoundary(root);
    const events: unknown[] = [];
    const watcher = new ProjectWatcher(boundary, (event) => events.push(event), vi.fn(), vi.fn());
    const actionPath = join(root, '.forgeloop', 'task-state', TASK_KEY, 'actions', 'action-cycle.json');
    await writeFile(actionPath, JSON.stringify({ schemaVersion: 1, state: 'PLANNED' }));
    watcher.start();
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await writeFile(actionPath, JSON.stringify({ schemaVersion: 1, state: 'VERIFIED' }));
      await waitForEvent(events, (event) => (
        typeof event === 'object' && event !== null
          && (event as { type?: string }).type === 'action-changed'
          && (event as { taskKey?: string }).taskKey === TASK_KEY
      ));
      await unlink(actionPath);
      await waitForEvent(events, (event) => (
        typeof event === 'object' && event !== null
          && (event as { type?: string }).type === 'action-changed'
          && (event as { artifact?: string }).artifact === 'action-cycle.json'
      ));
    } finally {
      watcher.stop();
    }
  }, 10000);

  it('classifies policy capabilities separately from generic policy changes', async () => {
    const root = await makeProject();
    const boundary = new PathBoundary(root);
    const events: unknown[] = [];
    const watcher = new ProjectWatcher(boundary, (event) => events.push(event), vi.fn(), vi.fn());
    watcher.start();
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await writeFile(
        join(root, '.forgeloop', 'policy', 'capabilities.json'),
        JSON.stringify({ schemaVersion: 1, policy: { default: 'DENY', rules: [] } }),
      );
      await waitForEvent(events, (event) => (
        typeof event === 'object' && event !== null
          && (event as { type?: string }).type === 'capability-policy-changed'
      ));
      expect(events).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'policy-changed', path: expect.stringContaining('capabilities.json') }),
      ]));
    } finally {
      watcher.stop();
    }
  }, 10000);
});
