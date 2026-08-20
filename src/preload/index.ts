import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  ProjectDetectionResult,
  ProjectSnapshot,
  TaskSnapshot,
  EventPage,
  ProjectUpdate,
  RecentProject,
  RawArtifactRequest,
} from '@shared/domain';
import { IPC_CHANNELS } from '@shared/ipc';

const api = {
  selectProject: (): Promise<ProjectDetectionResult | null> => ipcRenderer.invoke(IPC_CHANNELS.SELECT_PROJECT),
  openRecentProject: (path: string): Promise<ProjectDetectionResult> => ipcRenderer.invoke(IPC_CHANNELS.OPEN_RECENT_PROJECT, path),
  closeProject: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_PROJECT),
  getProjectSnapshot: (): Promise<ProjectSnapshot> => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT_SNAPSHOT),
  getTask: (taskId: string): Promise<TaskSnapshot> => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK, taskId),
  getTaskEvents: (taskId: string, cursor?: string, limit?: number): Promise<EventPage> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_EVENTS, taskId, cursor, limit),
  validateEventLedger: (taskId: string) => ipcRenderer.invoke(IPC_CHANNELS.VALIDATE_EVENT_LEDGER, taskId),
  getPolicyStatus: (taskId?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_POLICY_STATUS, taskId),
  getRawArtifact: (request: RawArtifactRequest): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.GET_RAW_ARTIFACT, request),
  getRecentProjects: (): Promise<RecentProject[]> => ipcRenderer.invoke(IPC_CHANNELS.GET_RECENT_PROJECTS),
  addRecentProject: (project: RecentProject): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.ADD_RECENT_PROJECT, project),
  removeRecentProject: (path: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.REMOVE_RECENT_PROJECT, path),
  notifyRendererReady: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.RENDERER_READY),

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
