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

export type ForgeLoopVerificationIsolationMode =
  | 'NATIVE_PROJECT'
  | 'PROJECT_ISOLATED'
  | 'SYSTEM_ISOLATED';

export interface ForgeLoopVerificationExecutionIsolationFeatureSummary {
  version: number;
  supported: boolean;
  adapter: boolean;
  modes: ForgeLoopVerificationIsolationMode[];
  protocolProjectRootSeparateFromExecutionCwd: boolean;
}

export interface ForgeLoopWorkspaceBindingFeatureSummary {
  version: number;
  supported: boolean;
  optional: boolean;
  explicitRebinding: boolean;
}

export interface ForgeLoopCanonicalHandoffsFeatureSummary {
  version: number;
  supported: boolean;
  immutable: boolean;
  lifecycleAuthority: boolean;
}

export interface ForgeLoopResponsibilityConstraintsFeatureSummary {
  version: number;
  supported: boolean;
  immutableDuringPass: boolean;
  completionEnforced: boolean;
}

export type ForgeLoopVerificationScopeMode = 'AUTO' | 'CHANGED' | 'CLAIMED' | 'FULL';

export interface ForgeLoopDifferentialVerificationScopeFeatureSummary {
  version: number;
  supported: boolean;
  modes: ForgeLoopVerificationScopeMode[];
  impactedMode: boolean;
}

export interface ForgeLoopCodeAttestationFeatureSummary {
  version: number;
  supported: boolean;
  modes: Array<'off' | 'optional' | 'required'>;
  revisionProviders: string[];
  signingProviders: string[];
  completionLedgerBound: boolean;
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
    verificationExecutionIsolation?: ForgeLoopVerificationExecutionIsolationFeatureSummary;
    workspaceBinding?: ForgeLoopWorkspaceBindingFeatureSummary;
    canonicalHandoffs?: ForgeLoopCanonicalHandoffsFeatureSummary;
    responsibilityConstraints?: ForgeLoopResponsibilityConstraintsFeatureSummary;
    differentialVerificationScope?: ForgeLoopDifferentialVerificationScopeFeatureSummary;
    codeAttestation?: ForgeLoopCodeAttestationFeatureSummary;
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
  next?: string;
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
