export type ForgeLoopPhase =
  | 'RECEIVED'
  | 'DISCOVERING'
  | 'CONTRACT_READY'
  | 'ROUTED'
  | 'DESIGNING'
  | 'PLANNED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'DIAGNOSING'
  | 'CORRECTING'
  | 'REVIEWING'
  | 'COMPLETE'
  | 'BLOCKED';

export const FORGELOOP_PHASES: ForgeLoopPhase[] = [
  'RECEIVED',
  'DISCOVERING',
  'CONTRACT_READY',
  'ROUTED',
  'DESIGNING',
  'PLANNED',
  'EXECUTING',
  'VERIFYING',
  'DIAGNOSING',
  'CORRECTING',
  'REVIEWING',
  'COMPLETE',
  'BLOCKED',
];

export const PHASE_ORDER: Record<ForgeLoopPhase, number> = {
  RECEIVED: 0,
  DISCOVERING: 1,
  CONTRACT_READY: 2,
  ROUTED: 3,
  DESIGNING: 4,
  PLANNED: 5,
  EXECUTING: 6,
  VERIFYING: 7,
  DIAGNOSING: 8,
  CORRECTING: 9,
  REVIEWING: 10,
  COMPLETE: 11,
  BLOCKED: 99,
};

export type PhaseState = 'completed' | 'current' | 'pending' | 'blocked' | 'failed';

export type ProjectKind = 'PROJECT' | 'DEMO';

export type ForgeLoopCompatibilityMode =
  | 'INTEGRATION_V1'
  | 'ARTIFACT_ONLY'
  | 'INCOMPATIBLE';

export interface ProjectDetectionResult {
  projectRoot: string;
  forgeLoopRoot: string;
  protocolVersion: number;
  schemaVersion: number;
  forgeLoopVersion?: string;
  compatible: boolean;
  warnings: string[];
  projectKind: ProjectKind;
  compatibilityMode?: ForgeLoopCompatibilityMode;
}

export interface ProjectSummary {
  name: string;
  rootPath: string;
  branch?: string;
  head?: string;
}

export interface ProtocolSummary {
  protocolVersion: number;
  schemaVersion: number;
  packageVersion?: string;
  compatible: boolean;
  compatibilitySource?: 'PROTOCOL_INFO' | 'ARTIFACT_ONLY';
  compatibilityMode?: ForgeLoopCompatibilityMode;
  featureSupport?: ForgeLoopFeatureSupport;
}

export interface ForgeLoopFeatureSupport {
  canonicalOwnership: boolean;
  observability: boolean;
  structuredDiagnostics: boolean;
  durableActions: boolean;
  approvals: boolean;
  capabilityPolicy: boolean;
  trajectoryMetrics: boolean;
  trajectoryEvaluations: boolean;
}

export interface BlockerSummary {
  id: string;
  message: string;
  phase?: ForgeLoopPhase;
}

export interface FailureSummary {
  id: string;
  message: string;
  phase?: ForgeLoopPhase;
  verificationCycle?: number;
}

export interface CheckSummary {
  id: string;
  requirement: string;
  status: 'passed' | 'failed' | 'blocked' | 'not-run';
  evidenceKind: EvidenceKind;
  verificationCycle?: number;
  timestamp?: string;
}

export interface GateSummary {
  id: string;
  name: string;
  status: 'satisfied' | 'unverified' | 'blocked';
  requiredBy?: string[];
  decisions?: string[];
  unknowns?: string[];
  approvedAssumptions?: string[];
  artifacts?: Array<{ path: string; sha256: string }>;
  evidence?: Array<Record<string, unknown>>;
}

export type EvidenceKind = 'OBSERVED' | 'INFERRED' | 'NOT_VERIFIED' | 'BLOCKED' | 'HYPOTHESIS';

export interface EvidenceCoverageSummary {
  total: number;
  covered: number;
  partial: number;
  notVerified: number;
  blocked: number;
  coveragePercent: number;
}

export interface NextActionSummary {
  type: 'progress' | 'recovery' | 'blocker' | 'inconsistency' | 'terminal';
  action: string;
  currentPhase?: ForgeLoopPhase;
  terminal?: boolean;
  reasonCodes?: string[];
  reasons?: Array<{ code: string; message: string; artifacts?: string[]; resolution?: unknown }>;
  missingArtifacts?: string[];
  commandSynopses?: string[];
  expectedPhase?: ForgeLoopPhase;
  details?: string;
}

export interface ContinuitySummary {
  taskId?: string;
  phase?: string;
  updatedAt?: string;
  currentFocus?: unknown;
  remainingWork?: ContinuityWorkItem[];
  knownIssues?: ContinuityWorkItem[];
  changedAreas?: string[];
  inspectFirst?: string[];
  resumeNote?: string;
  repositoryFingerprint?: unknown;
  verificationCycle?: number;
  diagnosticContext?: DiagnosticContextSummary;
  /** @deprecated Canonical continuity no longer exposes harness/session fields. */
  previousHarness?: never;
  previousSession?: never;
  currentHarness?: never;
  currentSession?: never;
  lastCompletedWork?: never;
  nextIntendedStep?: never;
  knownBlockers?: never;
  reconciliationRequired?: never;
}

export interface DiagnosticContextSummary {
  activeFailureSignatures: string[];
  activeFailedRequirements: string[];
  doNotRepeat: Array<{ id?: string; summary: string; reason?: string }>;
  verificationCycle?: number;
  guidance?: string[];
  stall?: boolean;
}

export type CanonicalProjectionSource = 'FORGELOOP_INTEGRATION' | 'UNAVAILABLE';

export interface CanonicalProjectionError {
  code: string;
  message: string;
}

export interface CanonicalProjectionView<T = Record<string, unknown>> {
  available: boolean;
  source: CanonicalProjectionSource;
  feature: string;
  data: T | null;
  result: T | null;
  exitCode: number | null;
  error: CanonicalProjectionError | null;
}

export type TaskHistoryView = CanonicalProjectionView<Record<string, unknown>>;
export type TaskTraceView = CanonicalProjectionView<Record<string, unknown>>;
export type TaskReflectionView = CanonicalProjectionView<Record<string, unknown>>;
export type TaskInspectionView = CanonicalProjectionView<Record<string, unknown>>;

export type DurableActionState =
  | 'PROPOSED'
  | 'AUTHORIZED'
  | 'STARTED'
  | 'COMMITTED'
  | 'VERIFIED'
  | 'FAILED'
  | 'COMMIT_UNKNOWN'
  | 'CANCELLED'
  | 'UNKNOWN';

export type DurableActionEffectClass =
  | 'READ_ONLY'
  | 'REVERSIBLE_WRITE'
  | 'IRREVERSIBLE_WRITE'
  | 'EXTERNAL_PUBLICATION'
  | 'DESTRUCTIVE'
  | 'UNKNOWN';

export interface DurableActionView {
  actionId: string;
  actionFingerprint: string | null;
  effectClass: DurableActionEffectClass;
  capability: string | null;
  operation: string | null;
  target: string | null;
  idempotencyKey: string | null;
  requiredForCompletion: boolean;
  requirement: string | null;
  provenance: string | null;
  state: DurableActionState;
  revision: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastEvidenceRef: string | null;
  lastReconciliationAt: string | null;
  commitResultCode: string | null;
}

export type ActionReadinessStatus = 'SATISFIED' | 'PENDING' | 'FAILED' | 'AMBIGUOUS' | 'UNTRUSTED' | 'UNKNOWN';

export interface ActionReadinessSummary {
  total: number | null;
  satisfied: number | null;
  unresolved: number | null;
  failed: number | null;
  ambiguous: number | null;
  pending: number | null;
  untrusted: number | null;
  source: 'FORGELOOP_INTEGRATION' | 'UNAVAILABLE';
}

export interface DurableApprovalView {
  approvalId: string;
  actionId: string | null;
  actionFingerprint: string | null;
  contractFingerprint: string | null;
  taskRevision: number | null;
  capability: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNKNOWN';
  requestedAt: string | null;
  reason: string | null;
  decision: 'APPROVED' | 'REJECTED' | null;
  resolvedAt: string | null;
  authorityKind: 'CALLER_ACKNOWLEDGED' | 'HOST_ATTESTED' | null;
  hostGrantRef: string | null;
}

export interface TaskActionsView {
  available: boolean;
  source: CanonicalProjectionSource;
  actions: DurableActionView[];
  approvals: DurableApprovalView[];
  readiness: ActionReadinessSummary | null;
  error: CanonicalProjectionError | null;
}

export interface CapabilityPolicyRuleView {
  capability: string;
  decision: 'ALLOW' | 'DENY' | 'REQUIRE_AUTHORITY' | 'REQUIRE_APPROVAL' | 'UNKNOWN';
}

export interface CapabilityPolicyView {
  available: boolean;
  source: CanonicalProjectionSource;
  defaultDecision: 'ALLOW' | 'DENY' | null;
  rules: CapabilityPolicyRuleView[];
  fingerprint: string | null;
  path: string | null;
  error: CanonicalProjectionError | null;
}

export interface TrajectoryMetricsView {
  available: boolean;
  source: CanonicalProjectionSource;
  metrics: Record<string, unknown> | null;
  error: CanonicalProjectionError | null;
}

export interface TrajectoryEvaluationsView {
  available: boolean;
  source: CanonicalProjectionSource;
  evaluations: Array<Record<string, unknown>>;
  error: CanonicalProjectionError | null;
}

export type ContinuityWorkItem = { id: string; summary: string };

export const FORGELOOP_CLAIM_STATES = [
  'ACTIVE',
  'RELEASED_BY_COMPLETION',
  'RELEASED_BY_RECOVERY',
  'INCONSISTENT',
] as const;

export type ForgeLoopClaimState = (typeof FORGELOOP_CLAIM_STATES)[number];

export type ForgeLoopClaimStateView = ForgeLoopClaimState | 'UNKNOWN';

export function parseClaimState(value: unknown): ForgeLoopClaimStateView {
  return typeof value === 'string' && (FORGELOOP_CLAIM_STATES as readonly string[]).includes(value)
    ? (value as ForgeLoopClaimState)
    : 'UNKNOWN';
}

export function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

export interface TaskOwnershipSummary {
  claimState: ForgeLoopClaimStateView;
  mutationAllowed: boolean | null;
  ownershipValid: boolean | null;
  historicalWriteClaims: string[];
  effectiveWriteClaims: string[];
  reasonCodes: string[];
  source: 'FORGELOOP_INTEGRATION' | 'UNAVAILABLE';
}

export interface TaskRecoverySummary {
  status: 'RECOVERED' | 'NONE' | 'UNKNOWN';
  recoveryId?: string;
  recoveredAt?: string;
  classificationAtRecovery?: string;
  releasedClaims: string[];
  reasonCodes: string[];
  previousPhase?: string;
  previousRevision?: number;
  authorityKind?: 'CALLER_ACKNOWLEDGED' | 'HOST_ATTESTED';
  grantRef?: string;
  resumeRequired: boolean;
  source: 'FORGELOOP_INTEGRATION' | 'RAW_ARTIFACT' | 'UNAVAILABLE';
}

export type TaskOperationalState =
  | 'ACTIVE'
  | 'RECOVERY_RESUME_REQUIRED'
  | 'COMPLETED_RELEASED'
  | 'BLOCKED'
  | 'OWNERSHIP_INCONSISTENT'
  | 'READ_ONLY_UNKNOWN';

export interface ForgeLoopIntegrationCapabilitiesSummary {
  available: boolean;
  integrationApiVersion?: number;
  protocolVersion?: number;
  executorParity?: boolean;
  taskClaimRecovery?: {
    version: number;
    durableRecoveryState: boolean;
    explicitResume: boolean;
    validatedClaimProjection: boolean;
  };
  features?: ForgeLoopFeatureSupport;
  resources?: string[];
  commands?: Array<{
    name: string;
    baseRiskClass?: string;
    mayExecuteExternalProcess?: boolean;
  }>;
}

export interface TaskSummary {
  taskId: string;
  taskKey: string;
  objective?: string;
  phase: ForgeLoopPhase;
  previousPhase?: ForgeLoopPhase;
  selectedGuides: string[];
  completedSteps: string[];
  pendingSteps: string[];
  blockers: BlockerSummary[];
  failures: FailureSummary[];
  checks: CheckSummary[];
  gates: GateSummary[];
  evidenceCoverage: EvidenceCoverageSummary;
  verificationCycle?: number;
  publicationStatus?: string;
  lastUpdated?: string;
  nextAction?: NextActionSummary;
  continuity?: ContinuitySummary;
  /** @deprecated Historical raw artifact field. Never represents active ownership; use `ownership.effectiveWriteClaims`. */
  writeClaims?: string[];
  historicalWriteClaims?: string[];
  effectiveWriteClaims?: string[];
  ownership: TaskOwnershipSummary;
  recovery?: TaskRecoverySummary;
  operationalState: TaskOperationalState;
  policySnapshot?: Record<string, unknown>;
  artifactErrors?: string[];
  gateErrors?: string[];
  protocolConflicts?: Array<{ field: string; artifactValue: unknown; cliValue: unknown }>;
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  activationMarker?: string;
  taskId?: string;
  isActive?: boolean;
}

export interface PolicyDriftSummary {
  detected: boolean;
  classification?: string;
  changeCount?: number;
  snapshotDigest?: string;
  currentDigest?: string;
  changes?: unknown[];
}

export interface PolicySummary {
  overallStatus: 'valid' | 'invalid' | 'unknown';
  complianceMode: string;
  ruleCount?: number;
  provenRules?: number;
  inertRules?: number;
  unsupportedRules?: number;
  baselineViolations?: number;
  newViolations?: number;
  lockStatus: 'valid' | 'invalid' | 'not-applicable' | 'unknown';
  drift: PolicyDriftSummary | null;
  integritySource: 'POLICY_STATUS' | 'ARTIFACTS' | 'UNKNOWN';
  integrityMessage?: string;
  errors?: string[];
  warnings?: string[];
}

export type ForgeLoopHealthStatus = 'VALID' | 'INCOMPLETE' | 'STALE' | 'INCONSISTENT' | 'INVALID' | 'UNKNOWN';
export type ForgeLoopHealthSource = 'FORGELOOP_STATUS_AGGREGATE' | 'FORGELOOP_OWNERSHIP' | 'FORGELOOP_VALIDATE_STATE' | 'ARTIFACT_VALIDATION' | 'UNKNOWN';

export interface ProjectHealth {
  status: ForgeLoopHealthStatus;
  source: ForgeLoopHealthSource;
}

export interface ProjectObservations {
  taskCount: number;
  evidence: Pick<EvidenceCoverageSummary, 'covered' | 'partial' | 'notVerified' | 'blocked'>;
  continuity: { present: number; missing: number };
  artifactValidationErrors: number;
  ownership: {
    activeCount: number;
    recoveredResumeRequiredCount: number;
    inconsistentCount: number;
    unavailableCount: number;
  };
}

export interface ProjectSnapshot {
  project: ProjectSummary;
  protocol: ProtocolSummary;
  health: ProjectHealth;
  observations: ProjectObservations;
  tasks: TaskSummary[];
  activeTaskId?: string;
  sessions: SessionSummary[];
  policy?: PolicySummary;
  diagnostics?: string[];
  updatedAt: string;
}

export interface EventRecord {
  seq: number;
  schemaVersion: number;
  protocolVersion: number;
  taskId: string;
  event: string;
  at: string;
  fingerprint?: string;
  previousHash: string | null;
  hash: string;
  details?: Record<string, unknown>;
}

export interface EventPage {
  events: EventRecord[];
  cursor?: string;
  hasMore: boolean;
  totalCount?: number;
  validation?: {
    schema: 'VALID' | 'INVALID' | 'NOT_RUN';
    chain: 'VALID' | 'INVALID' | 'NOT_RUN';
    cursor?: 'FOUND' | 'NOT_FOUND' | 'NOT_RUN';
    scope?: 'PAGE' | 'LEDGER';
    invalidLineCount?: number;
    errors?: string[];
  };
}

export interface TaskSnapshot {
  summary: TaskSummary;
  contract?: Record<string, unknown>;
  routing?: Record<string, unknown>;
  preflight?: Record<string, unknown>;
  workState?: Record<string, unknown>;
  continuity?: Record<string, unknown>;
  executionReceipt?: Record<string, unknown>;
  events: EventRecord[];
  policySnapshot?: Record<string, unknown>;
}

export type StudioErrorCode =
  | 'PROJECT_NOT_FORGELOOP'
  | 'PROTOCOL_UNSUPPORTED'
  | 'ARTIFACT_INVALID'
  | 'ARTIFACT_UNREADABLE'
  | 'CLI_NOT_FOUND'
  | 'CLI_FAILED'
  | 'PATH_BOUNDARY_VIOLATION'
  | 'LEDGER_INVALID'
  | 'WATCHER_FAILED'
  | 'PROJECT_REMOVED'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR';

export interface StudioError {
  code: StudioErrorCode;
  message: string;
  recoverable: boolean;
  details?: string;
}

export interface RecentProject {
  path: string;
  name: string;
  lastOpenedAt: string;
  kind?: ProjectKind;
}

export type AllowedArtifact =
  | 'contract.json'
  | 'routing-result.json'
  | 'preflight.json'
  | 'work-state.json'
  | 'continuity.json'
  | 'recovery.json'
  | 'execution-receipt.json'
  | 'policy-snapshot.json'
  | 'events.ndjson'
  | 'task.json';

export interface RawArtifactRequest {
  taskId: string;
  artifact: AllowedArtifact;
}

export type RawCollectionArtifactRequest =
  | { kind: 'action'; taskId: string; actionId: string }
  | { kind: 'approval'; taskId: string; approvalId: string }
  | { kind: 'evaluation'; taskId: string; evaluationId: string }
  | { kind: 'capability-policy' };

export interface ExecutionRecord {
  executionId: string;
  taskId: string;
  checkId: string;
  requirement: string;
  verificationCycle: number;
  kind: string;
  argv: string[];
  cwd: string;
  resolution: Record<string, unknown>;
  dispatch?: Record<string, unknown>;
  startedAt: string;
  finishedAt: string;
  status: 'passed' | 'failed';
  exitCode: number | null;
  durationMs?: number;
  termination?: string;
  signal?: string | null;
  stdoutSha256?: string;
  stderrSha256?: string;
}

export interface ExecutionPage {
  executions: ExecutionRecord[];
  invalidCount: number;
  hasMore: boolean;
}

export interface WatcherStatus {
  active: boolean;
  lastEventAt?: string;
  error?: string;
}

export interface ForgeLoopStudioAPI {
  selectProject(): Promise<ProjectDetectionResult | null>;
  openRecentProject(path: string): Promise<ProjectDetectionResult>;
  openDemoProject(): Promise<ProjectDetectionResult>;
  closeProject(): Promise<void>;
  getProjectSnapshot(): Promise<ProjectSnapshot>;
  getTask(taskId: string): Promise<TaskSnapshot>;
  getTaskEvents(taskId: string, cursor?: string, limit?: number): Promise<EventPage>;
  getPolicyStatus(taskId?: string): Promise<PolicySummary | null>;
  getRawArtifact(request: RawArtifactRequest): Promise<string>;
  getRawCollectionArtifact(request: RawCollectionArtifactRequest): Promise<string>;
  getTaskHistory(taskId: string): Promise<TaskHistoryView>;
  getTaskTrace(taskId: string): Promise<TaskTraceView>;
  getTaskReflection(taskId: string): Promise<TaskReflectionView>;
  getTaskInspection(taskId: string): Promise<TaskInspectionView>;
  getTaskActions(taskId: string): Promise<TaskActionsView>;
  getTaskAction(taskId: string, actionId: string): Promise<DurableActionView | null>;
  getTaskApprovals(taskId: string): Promise<DurableApprovalView[]>;
  getTaskMetrics(taskId: string): Promise<TrajectoryMetricsView>;
  getTaskEvaluations(taskId: string): Promise<TrajectoryEvaluationsView>;
  getCapabilityPolicy(): Promise<CapabilityPolicyView>;
  getRecentProjects(): Promise<RecentProject[]>;
  addRecentProject(project: RecentProject): Promise<void>;
  removeRecentProject(path: string): Promise<void>;
  notifyRendererReady(): Promise<void>;
  subscribeProjectUpdates(listener: (update: ProjectUpdate) => void): () => void;
}

export interface ProjectUpdate {
  type: 'task-added' | 'task-updated' | 'task-removed' | 'project-health-changed' | 'policy-changed' | 'session-changed' | 'action-changed' | 'approval-changed' | 'evaluation-changed' | 'capability-policy-changed' | 'snapshot-refreshed' | 'project-opened' | 'watcher-status' | 'error';
  taskId?: string;
  snapshot?: ProjectSnapshot;
  detection?: ProjectDetectionResult;
  data?: unknown;
  timestamp: string;
  generation?: number;
}
