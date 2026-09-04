import type { ForgeLoopCompatibilityMode } from './domain';

export interface AuditRuntimeDiagnostics {
  auditVersion: string;
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
