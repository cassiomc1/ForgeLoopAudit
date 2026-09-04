import type {
  ProjectDetectionResult,
  ProjectSnapshot,
  TaskSnapshot,
  EventPage,
  PolicySummary,
  AuditAppError,
  RecentProject,
  RawArtifactRequest,
  RawCollectionArtifactRequest,
  ExecutionPage,
  TaskHistoryView,
  TaskTraceView,
  TaskReflectionView,
  TaskInspectionView,
  TaskActionsView,
  DurableActionView,
  DurableApprovalView,
  TrajectoryMetricsView,
  TrajectoryEvaluationsView,
  CapabilityPolicyView,
  WorkspaceBindingView,
  TaskHandoffsView,
  ContinuityLintView,
  ResponsibilityView,
  VerificationScopeView,
  TaskAttestationView,
  ExecutionProfileContextView,
} from './domain';
import type {
  AuditDiff,
  AuditExportOptions,
  AuditExportResult,
  AuditFinding,
  AuditFindingFilter,
  AuditSnapshotMetadata,
  ProjectAuditSnapshot,
  StructuralQualityAuditView,
  TaskAuditSnapshot,
} from './audit';
import type { AuditRuntimeDiagnostics } from './diagnostics';

export interface ForgeLoopAuditAPI {
  selectProject(): Promise<ProjectDetectionResult | null>;
  openRecentProject(path: string): Promise<ProjectDetectionResult>;
  openDemoProject(): Promise<ProjectDetectionResult>;
  closeProject(): Promise<void>;
  getProjectAudit(): Promise<ProjectAuditSnapshot>;
  getTaskAudit(taskId: string): Promise<TaskAuditSnapshot>;
  getAuditFindings(filter?: AuditFindingFilter): Promise<AuditFinding[]>;
  getTaskStructuralQuality(taskId: string): Promise<StructuralQualityAuditView>;
  saveAuditBaseline(): Promise<AuditSnapshotMetadata>;
  listAuditHistory(): Promise<AuditSnapshotMetadata[]>;
  compareAudits(baseAuditId: string, currentAuditId?: string): Promise<AuditDiff>;
  exportAuditReport(options: AuditExportOptions): Promise<AuditExportResult>;
  getProjectSnapshot(): Promise<ProjectSnapshot>;
  getTask(taskId: string): Promise<TaskSnapshot>;
  getTaskEvents(taskId: string, cursor?: string, limit?: number): Promise<EventPage>;
  validateEventLedger(taskId: string): Promise<NonNullable<EventPage['validation']>>;
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
  getTaskWorkspaceBinding(taskId: string): Promise<WorkspaceBindingView>;
  getTaskHandoffs(taskId: string): Promise<TaskHandoffsView>;
  getTaskContinuityLint(taskId: string): Promise<ContinuityLintView>;
  getTaskResponsibility(taskId: string): Promise<ResponsibilityView>;
  getTaskVerificationScope(taskId: string): Promise<VerificationScopeView>;
  getTaskAttestation(taskId: string): Promise<TaskAttestationView>;
  getTaskExecutionProfileContext(taskId: string): Promise<ExecutionProfileContextView>;
  getTaskExecutions(taskId: string, limit?: number): Promise<ExecutionPage>;
  getRecentProjects(): Promise<RecentProject[]>;
  addRecentProject(project: RecentProject): Promise<void>;
  removeRecentProject(path: string): Promise<void>;
  notifyRendererReady(): Promise<void>;
  getAppVersion(): Promise<string>;
  getDiagnostics(): Promise<AuditRuntimeDiagnostics>;
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<boolean>;

  subscribeProjectUpdates(
    listener: (update: ProjectUpdate) => void
  ): () => void;
}

export interface ProjectUpdate {
  type: 'task-added' | 'task-updated' | 'task-removed' | 'project-health-changed' | 'policy-changed' | 'session-changed' | 'action-changed' | 'approval-changed' | 'evaluation-changed' | 'capability-policy-changed' | 'workspace-binding-changed' | 'handoff-changed' | 'responsibility-changed' | 'verification-scope-changed' | 'attestation-changed' | 'audit-invalidated' | 'audit-refreshed' | 'finding-changed' | 'snapshot-refreshed' | 'project-opened' | 'watcher-status' | 'error';
  taskId?: string;
  snapshot?: ProjectSnapshot;
  detection?: ProjectDetectionResult;
  data?: unknown;
  timestamp: string;
  generation?: number;
}

export interface MainToRendererEvents {
  'project-update': (update: ProjectUpdate) => void;
  'watcher-status': (status: WatcherStatus) => void;
  'error': (error: AuditAppError) => void;
}

export interface WatcherStatus {
  active: boolean;
  lastEventAt?: string;
  lastEventType?: string;
  lastTaskId?: string;
  error?: string;
}

export const IPC_CHANNELS = {
  SELECT_PROJECT: 'audit:select-project',
  OPEN_RECENT_PROJECT: 'audit:open-recent-project',
  OPEN_DEMO_PROJECT: 'audit:open-demo-project',
  CLOSE_PROJECT: 'audit:close-project',
  GET_PROJECT_AUDIT: 'audit:get-project-audit',
  GET_TASK_AUDIT: 'audit:get-task-audit',
  GET_AUDIT_FINDINGS: 'audit:get-audit-findings',
  GET_TASK_STRUCTURAL_QUALITY: 'audit:get-task-structural-quality',
  SAVE_AUDIT_BASELINE: 'audit:save-audit-baseline',
  LIST_AUDIT_HISTORY: 'audit:list-audit-history',
  COMPARE_AUDITS: 'audit:compare-audits',
  EXPORT_AUDIT_REPORT: 'audit:export-audit-report',
  GET_PROJECT_SNAPSHOT: 'audit:get-project-snapshot',
  GET_TASK: 'audit:get-task',
  GET_TASK_EVENTS: 'audit:get-task-events',
  GET_POLICY_STATUS: 'audit:get-policy-status',
  VALIDATE_EVENT_LEDGER: 'audit:validate-event-ledger',
  GET_RAW_ARTIFACT: 'audit:get-raw-artifact',
  GET_RAW_COLLECTION_ARTIFACT: 'audit:get-raw-collection-artifact',
  GET_TASK_HISTORY: 'audit:get-task-history',
  GET_TASK_TRACE: 'audit:get-task-trace',
  GET_TASK_REFLECTION: 'audit:get-task-reflection',
  GET_TASK_INSPECTION: 'audit:get-task-inspection',
  GET_TASK_ACTIONS: 'audit:get-task-actions',
  GET_TASK_ACTION: 'audit:get-task-action',
  GET_TASK_APPROVALS: 'audit:get-task-approvals',
  GET_TASK_METRICS: 'audit:get-task-metrics',
  GET_TASK_EVALUATIONS: 'audit:get-task-evaluations',
  GET_CAPABILITY_POLICY: 'audit:get-capability-policy',
  GET_TASK_WORKSPACE_BINDING: 'audit:get-task-workspace-binding',
  GET_TASK_HANDOFFS: 'audit:get-task-handoffs',
  GET_TASK_CONTINUITY_LINT: 'audit:get-task-continuity-lint',
  GET_TASK_RESPONSIBILITY: 'audit:get-task-responsibility',
  GET_TASK_VERIFICATION_SCOPE: 'audit:get-task-verification-scope',
  GET_TASK_ATTESTATION: 'audit:get-task-attestation',
  GET_TASK_EXECUTION_PROFILE_CONTEXT: 'audit:get-task-execution-profile-context',
  GET_TASK_EXECUTIONS: 'audit:get-task-executions',
  GET_RECENT_PROJECTS: 'audit:get-recent-projects',
  ADD_RECENT_PROJECT: 'audit:add-recent-project',
  REMOVE_RECENT_PROJECT: 'audit:remove-recent-project',
  RENDERER_READY: 'audit:renderer-ready',
  GET_APP_VERSION: 'audit:get-app-version',
  GET_DIAGNOSTICS: 'audit:get-diagnostics',
  MINIMIZE_WINDOW: 'audit:minimize-window',
  TOGGLE_MAXIMIZE_WINDOW: 'audit:toggle-maximize-window',
  SUBSCRIBE_UPDATES: 'audit:subscribe-updates',
  UNSUBSCRIBE_UPDATES: 'audit:unsubscribe-updates',
  PROJECT_UPDATE: 'audit:project-update',
  WATCHER_STATUS: 'audit:watcher-status',
  ERROR: 'audit:error',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
