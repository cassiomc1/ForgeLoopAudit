export interface ForgeLoopRecoveryFeatureSummary {
  version: number;
  durableRecoveryState: boolean;
  explicitResume: boolean;
  validatedClaimProjection: boolean;
}

export interface ForgeLoopCapabilitiesSummary {
  packageVersion: string | null;
  protocolVersion: number;
  integrationApiVersion: number;
  executorParity: boolean;
  features: {
    taskClaimRecovery: ForgeLoopRecoveryFeatureSummary;
  };
  resources: string[];
}

export interface CanonicalTaskListEntry {
  taskId: string;
  healthy: boolean;
  phase: string | null;
  mutationAllowed: boolean;
}

export interface CanonicalTaskList {
  count: number;
  tasks: CanonicalTaskListEntry[];
}

export type CanonicalOwnershipResource = {
  taskId: string;
  phase: string | null;
  claimState: string;
  mutationAllowed: boolean;
  ownershipValid: boolean;
  recoveryStatus: string | null;
  historicalWriteClaims: string[];
  effectiveWriteClaims: string[];
  reasonCodes: string[];
};

export interface ForgeLoopCanonicalError {
  code: string;
  message: string;
}

export interface ForgeLoopReadOnlyResult<T> {
  ok: boolean;
  command: string;
  exitCode: number;
  result: T | null;
  error: ForgeLoopCanonicalError | null;
  metadata: Record<string, unknown> | null;
}
