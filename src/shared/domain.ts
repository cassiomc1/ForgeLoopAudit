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

export interface ProjectDetectionResult {
  projectRoot: string;
  forgeLoopRoot: string;
  protocolVersion: number;
  schemaVersion: number;
  forgeLoopVersion?: string;
  compatible: boolean;
  warnings: string[];
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

export interface ContinuityWorkItem { id: string; summary: string; }

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
  writeClaims?: string[];
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
export type ForgeLoopHealthSource = 'FORGELOOP_STATUS_AGGREGATE' | 'FORGELOOP_VALIDATE_STATE' | 'ARTIFACT_VALIDATION' | 'UNKNOWN';

export interface ProjectHealth {
  status: ForgeLoopHealthStatus;
  source: ForgeLoopHealthSource;
}

export interface ProjectObservations {
  taskCount: number;
  evidence: Pick<EvidenceCoverageSummary, 'covered' | 'partial' | 'notVerified' | 'blocked'>;
  continuity: { present: number; missing: number };
  artifactValidationErrors: number;
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
}

export type AllowedArtifact =
  | 'contract.json'
  | 'routing-result.json'
  | 'preflight.json'
  | 'work-state.json'
  | 'continuity.json'
  | 'execution-receipt.json'
  | 'policy-snapshot.json'
  | 'events.ndjson'
  | 'task.json';

export interface RawArtifactRequest {
  taskId: string;
  artifact: AllowedArtifact;
}

export interface WatcherStatus {
  active: boolean;
  lastEventAt?: string;
  error?: string;
}

export interface ForgeLoopStudioAPI {
  selectProject(): Promise<ProjectDetectionResult | null>;
  openRecentProject(path: string): Promise<ProjectDetectionResult>;
  closeProject(): Promise<void>;
  getProjectSnapshot(): Promise<ProjectSnapshot>;
  getTask(taskId: string): Promise<TaskSnapshot>;
  getTaskEvents(taskId: string, cursor?: string, limit?: number): Promise<EventPage>;
  getPolicyStatus(taskId?: string): Promise<PolicySummary | null>;
  getRawArtifact(request: RawArtifactRequest): Promise<string>;
  getRecentProjects(): Promise<RecentProject[]>;
  addRecentProject(project: RecentProject): Promise<void>;
  removeRecentProject(path: string): Promise<void>;
  notifyRendererReady(): Promise<void>;
  subscribeProjectUpdates(listener: (update: ProjectUpdate) => void): () => void;
}

export interface ProjectUpdate {
  type: 'task-added' | 'task-updated' | 'task-removed' | 'project-health-changed' | 'policy-changed' | 'session-changed' | 'snapshot-refreshed' | 'project-opened' | 'watcher-status' | 'error';
  taskId?: string;
  snapshot?: ProjectSnapshot;
  detection?: ProjectDetectionResult;
  data?: unknown;
  timestamp: string;
  generation?: number;
}
