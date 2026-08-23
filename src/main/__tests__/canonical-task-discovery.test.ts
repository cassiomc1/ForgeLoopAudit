import { describe, it, expect } from 'vitest';
import { discoverCanonicalTasks, type CanonicalTaskDiscoveryAdapter } from '@main/core/integration/task-projection';

function adapterWith(entries: Array<{ taskId: string; phase: string | null; mutationAllowed?: boolean }>, options: { throwOnList?: Error } = {}): CanonicalTaskDiscoveryAdapter {
  return {
    async listTasks() {
      if (options.throwOnList) throw options.throwOnList;
      return {
        count: entries.length,
        tasks: entries.map((entry) => ({
          taskId: entry.taskId,
          healthy: true,
          phase: entry.phase,
          mutationAllowed: entry.mutationAllowed !== false,
        })),
      };
    },
  };
}

describe('core/integration/task-projection', () => {
  it('prefers the canonical task list as the semantic source', async () => {
    const result = await discoverCanonicalTasks(
      adapterWith([{ taskId: 'TASK-001', phase: 'COMPLETE' }, { taskId: 'TASK-002', phase: 'EXECUTING' }]),
      '/tmp/project',
      ['abc123', 'def456'],
    );
    expect(result.source).toBe('FORGELOOP_INTEGRATION');
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].taskId).toBe('TASK-001');
  });

  it('records a diagnostic when canonical and filesystem views diverge', async () => {
    const result = await discoverCanonicalTasks(
      adapterWith([{ taskId: 'TASK-001', phase: 'EXECUTING' }]),
      '/tmp/project',
      ['key-a', 'key-b', 'key-c'],
    );
    expect(result.diagnostics.some((entry) => entry.includes('parity'))).toBe(true);
  });

  it('does not emit a parity diagnostic when counts agree', async () => {
    const result = await discoverCanonicalTasks(
      adapterWith([{ taskId: 'TASK-001', phase: 'PLANNED' }]),
      '/tmp/project',
      ['key-a'],
    );
    expect(result.diagnostics).toEqual([]);
  });

  it('fails closed to UNAVAILABLE without inventing tasks when discovery errors', async () => {
    const result = await discoverCanonicalTasks(
      adapterWith([], { throwOnList: new Error('E_TASK_DESCRIPTOR_INVALID') }),
      '/tmp/project',
      ['key-a'],
    );
    expect(result.source).toBe('UNAVAILABLE');
    expect(result.tasks).toEqual([]);
    expect(result.diagnostics.some((entry) => entry.includes('E_TASK_DESCRIPTOR_INVALID'))).toBe(true);
  });
});
