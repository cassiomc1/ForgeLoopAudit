import { ForgeLoopStudioError } from '@shared/errors';
import type { ForgeLoopCanonicalError, ForgeLoopReadOnlyResult } from './types';
import { STUDIO_READ_ONLY_COMMANDS } from './forgeloop-integration';

export { STUDIO_READ_ONLY_COMMANDS };

export function isStudioReadOnlyCommand(command: string): boolean {
  return STUDIO_READ_ONLY_COMMANDS.has(command);
}

export type StudioReadOutcome<T> =
  | { kind: 'DOMAIN_OUTCOME'; exitCode: number; data: T | null; error: null }
  | { kind: 'INVOCATION_FAILURE'; exitCode: number; data: null; error: ForgeLoopCanonicalError | null };

interface StudioReadCommandAdapter {
  executeReadOnly<T>(
    projectRoot: string,
    command: string,
    input?: Record<string, unknown>,
  ): Promise<ForgeLoopReadOnlyResult<T>>;
}

/**
 * Run a canonical ForgeLoop read command through the bundled Integration API.
 *
 * `ok:true` means the command executed and its exit code is a domain
 * outcome (the loop may legitimately report "nothing to do" with a non-zero
 * exit code). `ok:false` is an invocation failure. Commands outside the
 * Studio allowlist are refused before ever reaching the ForgeLoop runtime.
 */
export async function runStudioReadCommand<T = Record<string, unknown>>(
  adapter: StudioReadCommandAdapter,
  projectRoot: string,
  command: string,
  input: Record<string, unknown> = {},
): Promise<StudioReadOutcome<T>> {
  if (!isStudioReadOnlyCommand(command)) {
    throw ForgeLoopStudioError.cliFailed(command, -1, `Command not in Studio read allowlist: ${command}`);
  }

  const result = await adapter.executeReadOnly<T>(projectRoot, command, input);
  if (result.ok) {
    return { kind: 'DOMAIN_OUTCOME', exitCode: result.exitCode, data: result.result, error: null };
  }
  return { kind: 'INVOCATION_FAILURE', exitCode: result.exitCode, data: null, error: result.error };
}
