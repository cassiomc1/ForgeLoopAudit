export interface StudioDiagnostics {
  studioVersion: string;
  electronVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  forgeLoopCompatibilityMode: 'CLI_ENHANCED' | 'ARTIFACT_ONLY';
  protocolVersion?: number;
  watcherStatus: string;
  lastReconcileDurationMs?: number;
  lastErrorCode?: string;
}
