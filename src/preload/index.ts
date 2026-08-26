import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  ProjectDetectionResult,
  ProjectSnapshot,
  TaskSnapshot,
  EventPage,
  ProjectUpdate,
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
} from '@shared/domain';
import { IPC_CHANNELS } from '@shared/ipc';

const api = {
  selectProject: (): Promise<ProjectDetectionResult | null> => ipcRenderer.invoke(IPC_CHANNELS.SELECT_PROJECT),
  openRecentProject: (path: string): Promise<ProjectDetectionResult> => ipcRenderer.invoke(IPC_CHANNELS.OPEN_RECENT_PROJECT, path),
  openDemoProject: (): Promise<ProjectDetectionResult> => ipcRenderer.invoke(IPC_CHANNELS.OPEN_DEMO_PROJECT),
  closeProject: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_PROJECT),
  getProjectSnapshot: (): Promise<ProjectSnapshot> => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT_SNAPSHOT),
  getTask: (taskId: string): Promise<TaskSnapshot> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK, taskId),
  getTaskEvents: (taskId: string, cursor?: string, limit?: number): Promise<EventPage> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_EVENTS, taskId, cursor, limit),
  validateEventLedger: (taskId: string) => ipcRenderer.invoke(IPC_CHANNELS.VALIDATE_EVENT_LEDGER, taskId),
  getPolicyStatus: (taskId?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_POLICY_STATUS, taskId),
  getRawArtifact: (request: RawArtifactRequest): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.GET_RAW_ARTIFACT, request),
  getRawCollectionArtifact: (request: RawCollectionArtifactRequest): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.GET_RAW_COLLECTION_ARTIFACT, request),
  getTaskHistory: (taskId: string): Promise<TaskHistoryView> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_HISTORY, taskId),
  getTaskTrace: (taskId: string): Promise<TaskTraceView> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_TRACE, taskId),
  getTaskReflection: (taskId: string): Promise<TaskReflectionView> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_REFLECTION, taskId),
  getTaskInspection: (taskId: string): Promise<TaskInspectionView> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_INSPECTION, taskId),
  getTaskActions: (taskId: string): Promise<TaskActionsView> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_ACTIONS, taskId),
  getTaskAction: (taskId: string, actionId: string): Promise<DurableActionView | null> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_ACTION, taskId, actionId),
  getTaskApprovals: (taskId: string): Promise<DurableApprovalView[]> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_APPROVALS, taskId),
  getTaskMetrics: (taskId: string): Promise<TrajectoryMetricsView> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_METRICS, taskId),
  getTaskEvaluations: (taskId: string): Promise<TrajectoryEvaluationsView> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_EVALUATIONS, taskId),
  getCapabilityPolicy: (): Promise<CapabilityPolicyView> => ipcRenderer.invoke(IPC_CHANNELS.GET_CAPABILITY_POLICY),
  getTaskExecutions: (taskId: string, limit?: number): Promise<ExecutionPage> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_EXECUTIONS, taskId, limit),
  getRecentProjects: (): Promise<RecentProject[]> => ipcRenderer.invoke(IPC_CHANNELS.GET_RECENT_PROJECTS),
  addRecentProject: (project: RecentProject): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.ADD_RECENT_PROJECT, project),
  removeRecentProject: (path: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.REMOVE_RECENT_PROJECT, path),
  notifyRendererReady: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.RENDERER_READY),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),
  getDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DIAGNOSTICS),
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.MINIMIZE_WINDOW),
  toggleMaximizeWindow: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_MAXIMIZE_WINDOW),

  subscribeProjectUpdates: (listener: (update: ProjectUpdate) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, update: ProjectUpdate) => listener(update);
    ipcRenderer.on(IPC_CHANNELS.PROJECT_UPDATE, handler);
    return () => ipcRenderer.off(IPC_CHANNELS.PROJECT_UPDATE, handler);
  },
};

contextBridge.exposeInMainWorld('forgeLoopStudio', api);

export type ForgeLoopStudioApi = typeof api;

declare global {
  interface Window {
    forgeLoopStudio: ForgeLoopStudioApi;
  }
}
