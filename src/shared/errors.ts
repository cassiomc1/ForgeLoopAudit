import type { StudioError, StudioErrorCode } from './domain';
export type { StudioError, StudioErrorCode } from './domain';

export class ForgeLoopStudioError extends Error {
  public readonly code: StudioErrorCode;
  public readonly recoverable: boolean;
  public readonly details?: string;

  constructor(code: StudioErrorCode, message: string, recoverable: boolean, details?: string) {
    super(message);
    this.name = 'ForgeLoopStudioError';
    this.code = code;
    this.recoverable = recoverable;
    this.details = details;
  }

  static projectNotForgeLoop(path: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'PROJECT_NOT_FORGELOOP',
      `The selected directory does not contain a ForgeLoop project (.forgeloop/ not found)`,
      true,
      `Path: ${path}`
    );
  }

  static protocolUnsupported(version: number, path: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'PROTOCOL_UNSUPPORTED',
      `ForgeLoop protocol version ${version} is not supported by this version of ForgeLoop Studio`,
      false,
      `Path: ${path}, Protocol version: ${version}`
    );
  }

  static artifactInvalid(artifact: string, reason: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'ARTIFACT_INVALID',
      `Invalid ForgeLoop artifact: ${artifact}`,
      true,
      reason
    );
  }

  static artifactUnreadable(artifact: string, reason: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'ARTIFACT_UNREADABLE',
      `Cannot read ForgeLoop artifact: ${artifact}`,
      true,
      reason
    );
  }

  static cliNotFound(command: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'CLI_NOT_FOUND',
      `ForgeLoop CLI not found. Please ensure 'forgeloop' is in your PATH.`,
      false,
      `Command: ${command}`
    );
  }

  static cliFailed(command: string, exitCode: number, stderr: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'CLI_FAILED',
      `ForgeLoop CLI command failed with exit code ${exitCode}`,
      true,
      `Command: ${command}, stderr: ${stderr}`
    );
  }

  static pathBoundaryViolation(path: string, boundary: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'PATH_BOUNDARY_VIOLATION',
      `Path traversal attempt detected`,
      false,
      `Attempted path: ${path}, Boundary: ${boundary}`
    );
  }

  static ledgerInvalid(line: number, reason: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'LEDGER_INVALID',
      `Invalid event ledger at line ${line}`,
      true,
      reason
    );
  }

  static watcherFailed(reason: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'WATCHER_FAILED',
      `Filesystem watcher failed`,
      true,
      reason
    );
  }

  static projectRemoved(path: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'PROJECT_REMOVED',
      `The selected project directory no longer exists`,
      true,
      `Path: ${path}`
    );
  }

  static permissionDenied(path: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError(
      'PERMISSION_DENIED',
      `Permission denied accessing project`,
      false,
      `Path: ${path}`
    );
  }

  static unknown(message: string, details?: string): ForgeLoopStudioError {
    return new ForgeLoopStudioError('UNKNOWN_ERROR', message, true, details);
  }

  toJSON(): StudioError {
    return {
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      details: this.details,
    };
  }
}