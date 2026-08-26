export interface ForgeLoopRecoveryFeatureSummary {
  version: number;
  durableRecoveryState: boolean;
  explicitResume: boolean;
  validatedClaimProjection: boolean;
}

export interface ForgeLoopDurableActionsFeatureSummary {
  version: number;
  readOnlyResources: boolean;
  externalExecutionOverMcp: boolean;
}

export interface ForgeLoopTrajectoryEvaluationFeatureSummary {
  version: number;
  readOnlyMetrics: boolean;
  projectLocalReference: boolean;
}

export interface ForgeLoopCommandCapabilitySummary {
  name: string;
  baseRiskClass?: string;
  mayExecuteExternalProcess?: boolean;
  mutatesProtocol?: boolean;
}

export interface ForgeLoopCapabilitiesSummary {
  packageVersion: string | null;
  protocolVersion: number;
  integrationApiVersion: number;
  executorParity: boolean;
  features: {
    taskClaimRecovery: ForgeLoopRecoveryFeatureSummary;
    durableActions?: ForgeLoopDurableActionsFeatureSummary;
    trajectoryEvaluation?: ForgeLoopTrajectoryEvaluationFeatureSummary;
  };
  resources: string[];
  commands?: ForgeLoopCommandCapabilitySummary[];
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

export interface ForgeLoopResourceReadOptions {
  projectPath?: string;
  packageRoot?: string;
  packageVersion?: string | null;
  taskId?: string | null;
  actionId?: string | null;
}
