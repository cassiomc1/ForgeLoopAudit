import type { StudioDiagnostics } from '@shared/diagnostics';

export function buildStudioDiagnostics(input: Partial<StudioDiagnostics> = {}): StudioDiagnostics {
  return {
    studioVersion: input.studioVersion || 'unknown',
    electronVersion: input.electronVersion || process.versions.electron || 'unknown',
    nodeVersion: input.nodeVersion || process.versions.node || 'unknown',
    platform: input.platform || process.platform,
    arch: input.arch || process.arch,
    forgeLoopCompatibilityMode: input.forgeLoopCompatibilityMode || 'ARTIFACT_ONLY',
    protocolVersion: input.protocolVersion,
    watcherStatus: input.watcherStatus || 'unknown',
    lastReconcileDurationMs: input.lastReconcileDurationMs,
    lastErrorCode: input.lastErrorCode,
  };
}
