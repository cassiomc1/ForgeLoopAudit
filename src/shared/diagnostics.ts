import type { ForgeLoopCompatibilityMode } from './domain';

export interface StudioDiagnostics {
  studioVersion: string;
  electronVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  forgeLoopCompatibilityMode: ForgeLoopCompatibilityMode;
  protocolVersion?: number;
  watcherStatus: string;
  lastReconcileDurationMs?: number;
  lastErrorCode?: string;
}
