import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PathBoundary } from '@main/security/path-boundary';
import { ProjectWatcher } from '@main/watcher/project-watcher';

const TASK_KEY = 'a'.repeat(64);

async function makeProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'forgeloop-watcher-recovery-'));
  await mkdir(join(root, '.forgeloop', 'task-state', TASK_KEY, 'executions'), { recursive: true });
  return root;
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
});
