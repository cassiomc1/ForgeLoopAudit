import { describe, it, expect } from 'vitest';
import { runStudioReadCommand, isStudioReadOnlyCommand, STUDIO_READ_ONLY_COMMANDS } from '@main/core/integration/studio-read-commands';
import type { ForgeLoopReadOnlyResult } from '@main/core/integration/types';
import { ForgeLoopStudioError } from '@shared/errors';

function adapterWith(result: Partial<ForgeLoopReadOnlyResult<Record<string, unknown>>>, calls: string[] = []) {
  return {
    async executeReadOnly<T>(_root: string, command: string): Promise<ForgeLoopReadOnlyResult<T>> {
      calls.push(command);
      return {
        ok: true,
        command,
        exitCode: 0,
        result: null as T | null,
        error: null,
        metadata: null,
        ...result,
      } as ForgeLoopReadOnlyResult<T>;
    },
  };
}

describe('core/integration/studio-read-commands', () => {
  it('allowlists exactly the Studio read-only commands', () => {
    expect([...STUDIO_READ_ONLY_COMMANDS].sort()).toEqual(
      [
        'action-show',
        'audit',
        'history',
        'handoff-list',
        'handoff-show',
        'inspect',
        'metrics',
        'next',
        'policy-status',
        'progress',
        'reflect',
        'reconcile-continuity',
        'report',
        'trace',
        'validate-receipt',
        'validate-state',
      ].sort(),
    );
    expect(isStudioReadOnlyCommand('next')).toBe(true);
    expect(isStudioReadOnlyCommand('reconcile-continuity')).toBe(true);
    expect(isStudioReadOnlyCommand('complete')).toBe(false);
    expect(isStudioReadOnlyCommand('task-resume')).toBe(false);
    expect(isStudioReadOnlyCommand('run-check')).toBe(false);
  });

  it('treats ok:true with non-zero exitCode as a domain outcome', async () => {
    const outcome = await runStudioReadCommand(
      adapterWith({ ok: true, exitCode: 3, result: { action: 'WAIT' } }),
      '/tmp/project',
      'next',
    );
    expect(outcome.kind).toBe('DOMAIN_OUTCOME');
    if (outcome.kind === 'DOMAIN_OUTCOME') {
      expect(outcome.exitCode).toBe(3);
      expect(outcome.data).toEqual({ action: 'WAIT' });
    }
  });

  it('treats ok:false as an invocation failure preserving the canonical code', async () => {
    const outcome = await runStudioReadCommand(
      adapterWith({ ok: false, exitCode: 1, error: { code: 'E_COMMAND_UNSUPPORTED', message: 'nope' } }),
      '/tmp/project',
      'validate-state',
    );
    expect(outcome.kind).toBe('INVOCATION_FAILURE');
    if (outcome.kind === 'INVOCATION_FAILURE') {
      expect(outcome.error?.code).toBe('E_COMMAND_UNSUPPORTED');
    }
  });

  it('rejects commands outside the Studio allowlist before invoking ForgeLoop', async () => {
    const calls: string[] = [];
    for (const command of ['advance', 'complete', 'task-recover']) {
      const outcome = await runStudioReadCommand(adapterWith({}, calls), '/tmp/project', command).then(
        () => null,
        (error: unknown) => error,
      );
      expect(outcome).toBeInstanceOf(ForgeLoopStudioError);
      expect((outcome as ForgeLoopStudioError).details).toMatch(/not in Studio read allowlist/);
    }
    expect(calls).toEqual([]);
  });
});
