import type {
  ProjectDetectionResult,
  ProjectSnapshot,
  TaskSnapshot,
  EventPage,
  PolicySummary,
  StudioError,
  RecentProject,
  RawArtifactRequest,
  ExecutionPage,
} from './domain';
import type { StudioDiagnostics } from './diagnostics';

export interface ForgeLoopStudioAPI {
  selectProject(): Promise<ProjectDetectionResult | null>;
  openRecentProject(path: string): Promise<ProjectDetectionResult>;
  openDemoProject(): Promise<ProjectDetectionResult>;
  closeProject(): Promise<void>;
  getProjectSnapshot(): Promise<ProjectSnapshot>;
  getTask(taskId: string): Promise<TaskSnapshot>;
  getTaskEvents(taskId: string, cursor?: string, limit?: number): Promise<EventPage>;
  validateEventLedger(taskId: string): Promise<NonNullable<EventPage['validation']>>;
  getPolicyStatus(taskId?: string): Promise<PolicySummary | null>;
  getRawArtifact(request: RawArtifactRequest): Promise<string>;
  getTaskExecutions(taskId: string, limit?: number): Promise<ExecutionPage>;
  getRecentProjects(): Promise<RecentProject[]>;
  addRecentProject(project: RecentProject): Promise<void>;
  removeRecentProject(path: string): Promise<void>;
  notifyRendererReady(): Promise<void>;
  getAppVersion(): Promise<string>;
  getDiagnostics(): Promise<StudioDiagnostics>;
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<boolean>;

  subscribeProjectUpdates(
    listener: (update: ProjectUpdate) => void
  ): () => void;
}

export interface ProjectUpdate {
  type: 'task-added' | 'task-updated' | 'task-removed' | 'project-health-changed' | 'policy-changed' | 'session-changed' | 'snapshot-refreshed' | 'project-opened';
  taskId?: string;
  snapshot?: ProjectSnapshot;
  detection?: ProjectDetectionResult;
  timestamp: string;
}

export interface MainToRendererEvents {
  'project-update': (update: ProjectUpdate) => void;
  'watcher-status': (status: WatcherStatus) => void;
  'error': (error: StudioError) => void;
}

export interface WatcherStatus {
  active: boolean;
  lastEventAt?: string;
  error?: string;
}

export const IPC_CHANNELS = {
  SELECT_PROJECT: 'studio:select-project',
  OPEN_RECENT_PROJECT: 'studio:open-recent-project',
  OPEN_DEMO_PROJECT: 'studio:open-demo-project',
  CLOSE_PROJECT: 'studio:close-project',
  GET_PROJECT_SNAPSHOT: 'studio:get-project-snapshot',
  GET_TASK: 'studio:get-task',
  GET_TASK_EVENTS: 'studio:get-task-events',
  GET_POLICY_STATUS: 'studio:get-policy-status',
  VALIDATE_EVENT_LEDGER: 'studio:validate-event-ledger',
  GET_RAW_ARTIFACT: 'studio:get-raw-artifact',
  GET_TASK_EXECUTIONS: 'studio:get-task-executions',
  GET_RECENT_PROJECTS: 'studio:get-recent-projects',
  ADD_RECENT_PROJECT: 'studio:add-recent-project',
  REMOVE_RECENT_PROJECT: 'studio:remove-recent-project',
  RENDERER_READY: 'studio:renderer-ready',
  GET_APP_VERSION: 'studio:get-app-version',
  GET_DIAGNOSTICS: 'studio:get-diagnostics',
  MINIMIZE_WINDOW: 'studio:minimize-window',
  TOGGLE_MAXIMIZE_WINDOW: 'studio:toggle-maximize-window',
  SUBSCRIBE_UPDATES: 'studio:subscribe-updates',
  UNSUBSCRIBE_UPDATES: 'studio:unsubscribe-updates',
  PROJECT_UPDATE: 'studio:project-update',
  WATCHER_STATUS: 'studio:watcher-status',
  ERROR: 'studio:error',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
