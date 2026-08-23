import { ForgeCli, type CliResult } from '@main/core/cli/forge-cli';
import { isAllowedCommand } from '@main/core/cli/allowed-commands';
import { ForgeLoopStudioError } from '@shared/errors';

/**
 * Legacy read-only compatibility adapter over the external ForgeLoop CLI.
 *
 * This adapter only exists for LEGACY_CLI_READ_ONLY / ARTIFACT_ONLY modes
 * (ForgeLoop <= 1.3 projects without the bundled Integration API). In
 * INTEGRATION_V1 mode the normal snapshot never spawns an external CLI.
 *
 * Security invariants preserved:
 * - spawn uses shell:false;
 * - commands are restricted to the legacy allowlist;
 * - the CLI binary path is resolved outside the project boundary.
 */
export class LegacyCliReadAdapter {
  constructor(private readonly cli: ForgeCli) {}

  async next<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    this.assertAllowed('next');
    return this.cli.next<T>(taskId);
  }

  async status<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    this.assertAllowed('status');
    return this.cli.status<T>(taskId);
  }

  async progress<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    this.assertAllowed('progress');
    return this.cli.progress<T>(taskId);
  }

  async audit<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    this.assertAllowed('audit');
    return this.cli.audit<T>(taskId);
  }

  async report<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    this.assertAllowed('report');
    return this.cli.report<T>(taskId);
  }

  async policyStatus<T = Record<string, unknown>>(taskId?: string): Promise<CliResult<T>> {
    this.assertAllowed('policy-status');
    return this.cli.policyStatus<T>(taskId);
  }

  private assertAllowed(command: string): void {
    if (!isAllowedCommand(command)) {
      throw ForgeLoopStudioError.cliFailed(command, -1, `Command not in legacy CLI allowlist: ${command}`);
    }
  }
}
