import { spawn, SpawnOptions } from 'child_process';
import { existsSync, realpathSync } from 'fs';
import { delimiter, isAbsolute, join, sep } from 'path';
import { ForgeLoopStudioError } from '@shared/errors';
import { ALLOWED_CLI_COMMANDS, CLI_TIMEOUT_MS, CLI_MAX_STDOUT_BYTES } from '@shared/constants';
import { parseJsonSafely } from '@main/security/resource-limits';

export interface CliResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  exitCode?: number;
}

export class ForgeCli {
  private readonly projectRoot: string;
  private readonly forgeLoopPath: string;

  constructor(projectRoot: string, forgeLoopPath: string = 'forgeloop') {
    this.projectRoot = projectRoot;
    this.forgeLoopPath = resolveTrustedForgeLoopPath(forgeLoopPath, projectRoot);
  }

  private async executeCommand(args: string[]): Promise<CliResult<unknown>> {
    const commandName = args[0];

    if (!ALLOWED_CLI_COMMANDS.includes(commandName as typeof ALLOWED_CLI_COMMANDS[number])) {
      throw ForgeLoopStudioError.cliFailed(commandName, -1, `Command not in allowlist: ${commandName}`);
    }

    const options: SpawnOptions = {
      cwd: this.projectRoot,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORGELOOP_NO_COLOR: '1',
      },
    };

    return new Promise((resolve) => {
      const child = spawn(this.forgeLoopPath, args, options);
      let stdout = '';
      let stderr = '';
      let stdoutBytes = 0;

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: `Command timed out after ${CLI_TIMEOUT_MS}ms`,
          exitCode: -1,
        });
      }, CLI_TIMEOUT_MS);

      child.stdout?.on('data', (chunk: Buffer) => {
        stdoutBytes += chunk.length;
        if (stdoutBytes > CLI_MAX_STDOUT_BYTES) {
          child.kill('SIGTERM');
          clearTimeout(timeout);
          resolve({
            success: false,
            error: `Command output exceeded maximum size of ${CLI_MAX_STDOUT_BYTES} bytes`,
            exitCode: -1,
          });
        }
        stdout += chunk.toString('utf8');
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') {
          resolve({
            success: false,
            error: `ForgeLoop CLI not found: ${this.forgeLoopPath}`,
            exitCode: -1,
          });
        } else {
          resolve({
            success: false,
            error: `Failed to spawn process: ${error.message}`,
            exitCode: -1,
          });
        }
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve({
            success: true,
            data: stdout,
            exitCode: code,
          });
        } else {
          resolve({
            success: false,
            data: stdout,
            error: stderr || `Process exited with code ${code}`,
            exitCode: code ?? -1,
          });
        }
      });
    });
  }

  async protocolInfo<T = Record<string, unknown>>(): Promise<CliResult<T>> {
    const result = await this.executeCommand(['protocol-info', '--json']);
    if (!result.success) {
      return result as CliResult<T>;
    }
    try {
      const parsed = parseJsonSafely<T>(result.data as string);
      return { success: true, data: parsed, exitCode: result.exitCode };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse protocol-info output: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: result.exitCode,
      };
    }
  }

  async taskList<T = Record<string, unknown>[]>(): Promise<CliResult<T>> {
    const result = await this.executeCommand(['task-list', '--json']);
    if (!result.success) {
      return result as CliResult<T>;
    }
    try {
      const parsed = parseJsonSafely<T>(result.data as string);
      return { success: true, data: parsed, exitCode: result.exitCode };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse task-list output: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: result.exitCode,
      };
    }
  }

  async taskShow<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    const result = await this.executeCommand(['task-show', '--task', taskId, '--json']);
    if (!result.success) {
      return result as CliResult<T>;
    }
    try {
      const parsed = parseJsonSafely<T>(result.data as string);
      return { success: true, data: parsed, exitCode: result.exitCode };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse task-show output: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: result.exitCode,
      };
    }
  }

  async status<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    const result = await this.executeCommand(['status', '--task', taskId, '--json']);
    if (!result.success) {
      return result as CliResult<T>;
    }
    try {
      const parsed = parseJsonSafely<T>(result.data as string);
      return { success: true, data: parsed, exitCode: result.exitCode };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse status output: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: result.exitCode,
      };
    }
  }

  async progress<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    const result = await this.executeCommand(['progress', '--task', taskId, '--json']);
    if (!result.success) {
      return result as CliResult<T>;
    }
    try {
      const parsed = parseJsonSafely<T>(result.data as string);
      return { success: true, data: parsed, exitCode: result.exitCode };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse progress output: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: result.exitCode,
      };
    }
  }

  async continuity<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    const result = await this.executeCommand(['continuity', '--task', taskId, '--json']);
    if (!result.success) {
      return result as CliResult<T>;
    }
    try {
      const parsed = parseJsonSafely<T>(result.data as string);
      return { success: true, data: parsed, exitCode: result.exitCode };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse continuity output: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: result.exitCode,
      };
    }
  }

  async next<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    const result = await this.executeCommand(['next', '--task', taskId, '--json']);
    if (!result.success) {
      return result as CliResult<T>;
    }
    try {
      const parsed = parseJsonSafely<T>(result.data as string);
      return { success: true, data: parsed, exitCode: result.exitCode };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse next output: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: result.exitCode,
      };
    }
  }

  async audit<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    const result = await this.executeCommand(['audit', '--task', taskId, '--json']);
    if (!result.success) {
      return result as CliResult<T>;
    }
    try {
      const parsed = parseJsonSafely<T>(result.data as string);
      return { success: true, data: parsed, exitCode: result.exitCode };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse audit output: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: result.exitCode,
      };
    }
  }

  async report<T = Record<string, unknown>>(taskId: string): Promise<CliResult<T>> {
    const result = await this.executeCommand(['report', '--task', taskId, '--json']);
    if (!result.success) {
      return result as CliResult<T>;
    }
    try {
      const parsed = parseJsonSafely<T>(result.data as string);
      return { success: true, data: parsed, exitCode: result.exitCode };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse report output: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: result.exitCode,
      };
    }
  }

  async policyStatus<T = Record<string, unknown>>(): Promise<CliResult<T>> {
    const result = await this.executeCommand(['policy-status', '--json']);
    if (!result.success) {
      return result as CliResult<T>;
    }
    try {
      const parsed = parseJsonSafely<T>(result.data as string);
      return { success: true, data: parsed, exitCode: result.exitCode };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse policy-status output: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: result.exitCode,
      };
    }
  }

  async checkCliAvailable(): Promise<boolean> {
    try {
      const result = await new Promise<CliResult<unknown>>((resolve) => {
        const child = spawn(this.forgeLoopPath, ['--version'], { cwd: this.projectRoot, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FORGELOOP_NO_COLOR: '1' } });
        let settled = false;
        const finish = (value: CliResult<unknown>) => { if (!settled) { settled = true; resolve(value); } };
        const timeout = setTimeout(() => { child.kill('SIGTERM'); finish({ success: false, error: 'Version probe timed out', exitCode: -1 }); }, CLI_TIMEOUT_MS);
        child.on('error', (error) => { clearTimeout(timeout); finish({ success: false, error: error.message, exitCode: -1 }); });
        child.on('close', (code) => { clearTimeout(timeout); finish({ success: code === 0, exitCode: code ?? -1 }); });
      });
      return result.success;
    } catch { return false; }
  }
}

export function resolveTrustedForgeLoopPath(requested: string, projectRoot: string): string {
  const candidates = isAbsolute(requested) ? [requested] : (process.env.PATH || '').split(delimiter).flatMap((dir) => [join(dir, requested), ...(process.platform === 'win32' ? [join(dir, `${requested}.exe`)] : [])]);
  const projectReal = realpathSync(projectRoot);
  const resolved = candidates.find((candidate) => {
    try { return existsSync(candidate) && !realpathSync(candidate).startsWith(`${projectReal}${sep}`); } catch { return false; }
  });
  if (!resolved) throw ForgeLoopStudioError.cliFailed(requested, -1, `Trusted ForgeLoop CLI not found outside project: ${requested}`);
  return realpathSync(resolved);
}
