import { ipcMain, dialog, BrowserWindow } from 'electron';
import { PathBoundary } from '@main/security/path-boundary';
import { ForgeLoopStudioError } from '@shared/errors';
import type { ProjectDetectionResult, RecentProject, StudioError } from '@shared/domain';
import { IPC_CHANNELS } from '@shared/ipc';
import { createProjectSnapshotBuilder, normalizePolicyStatus, type ProjectSnapshotBuilder, type ProjectCompatibilityContext } from '@main/core/project/project-snapshot';
import { createProjectDetector, createProjectReader, type ProjectReader } from '@main/core/project/project-reader';
import { ForgeCli } from '@main/core/cli/forge-cli';
import { createProjectWatcher } from '@main/watcher/project-watcher';
import { createTaskIndexer, createTaskSnapshotBuilder, createGateReader, type TaskIndexer, type TaskSnapshotBuilder } from '@main/core/tasks/task-index';
import { createEventLedgerReader, type EventLedgerReader } from '@main/core/events/ledger-reader';
import Store from 'electron-store';
import { z } from 'zod';
import { basename } from 'path';

const store = new Store<{ recentProjects: RecentProject[] }>({
  name: 'forgeloop-studio-settings',
  defaults: { recentProjects: [] },
});

let currentProjectBoundary: PathBoundary | null = null;
let currentProjectReader: ProjectReader | null = null;
let currentTaskIndexer: TaskIndexer | null = null;
let currentTaskSnapshotBuilder: TaskSnapshotBuilder | null = null;
let currentEventReader: EventLedgerReader | null = null;
let currentForgeCli: ForgeCli | null = null;
let currentWatcher: ReturnType<typeof createProjectWatcher> | null = null;
let currentSnapshotBuilder: ProjectSnapshotBuilder | null = null;
let currentMainWindow: BrowserWindow | null = null;
let snapshotRefreshScheduled = false;
const TaskIdSchema = z.string().min(1).max(200);
const ProjectPathSchema = z.string().min(1).max(4096);
const EventQuerySchema = z.object({ taskId: TaskIdSchema, cursor: z.string().max(256).optional(), limit: z.number().int().min(1).max(500).optional() });
const RecentProjectSchema = z.object({ path: z.string().min(1).max(4096), name: z.string().max(300), lastOpenedAt: z.string().max(100) });
const RawArtifactSchema = z.object({ taskId: TaskIdSchema, artifact: z.enum(['task.json', 'contract.json', 'routing-result.json', 'preflight.json', 'work-state.json', 'continuity.json', 'execution-receipt.json', 'policy-snapshot.json', 'events.ndjson']) });

function assertTrustedSender(event: Electron.IpcMainInvokeEvent): void {
  if (!currentMainWindow || event.sender.id !== currentMainWindow.webContents.id) throw ForgeLoopStudioError.unknown('Untrusted IPC sender');
  const url = event.senderFrame?.url || '';
  const expected = currentMainWindow.webContents.getURL();
  const allowedDevelopment = url.startsWith('http://localhost:5173/');
  const allowedPackaged = url === expected && url.startsWith('file://');
  if (!allowedDevelopment && !allowedPackaged) throw ForgeLoopStudioError.unknown('Untrusted IPC sender');
}

export function registerProjectIpc(mainWindow: BrowserWindow): void {
  currentMainWindow = mainWindow;

  ipcMain.handle(IPC_CHANNELS.SELECT_PROJECT, async (event): Promise<ProjectDetectionResult | null> => {
    assertTrustedSender(event);
    const result = await dialog.showOpenDialog(currentMainWindow || mainWindow, {
      title: 'Select ForgeLoop Project',
      buttonLabel: 'Open Project',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const projectRoot = result.filePaths[0];
    return openProject(projectRoot);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_RECENT_PROJECT, async (event, path: string): Promise<ProjectDetectionResult> => {
    assertTrustedSender(event); ProjectPathSchema.parse(path);
    return openProject(path);
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_PROJECT, async (event): Promise<void> => {
    assertTrustedSender(event);
    closeProject();
  });

  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_SNAPSHOT, async (event): Promise<any> => {
    assertTrustedSender(event);
    if (!currentSnapshotBuilder) {
      throw ForgeLoopStudioError.unknown('No project open');
    }
    return currentSnapshotBuilder.build();
  });

  ipcMain.handle(IPC_CHANNELS.GET_TASK, async (event, taskId: string): Promise<any> => {
    assertTrustedSender(event); TaskIdSchema.parse(taskId);
    if (!currentTaskSnapshotBuilder || !currentTaskIndexer || !currentEventReader) {
      throw ForgeLoopStudioError.unknown('No project open');
    }

    const tasks = currentTaskIndexer.listTasks();
    const task = tasks.find((t) => t.taskId === taskId || t.taskKey === taskId);
    if (!task) {
      throw ForgeLoopStudioError.artifactUnreadable(taskId, 'Task not found');
    }

    const artifacts = currentProjectReader!.readTaskSummaryArtifacts(task.taskKey);
    const nextResult = await currentForgeCli!.next(taskId);
    const { summary, events } = currentTaskSnapshotBuilder.buildSnapshot(task.taskKey, artifacts, nextResult.success ? nextResult.data : undefined);

    return {
      summary,
      contract: artifacts['contract.json'],
      routing: artifacts['routing-result.json'],
      preflight: artifacts['preflight.json'],
      workState: artifacts['work-state.json'],
      continuity: artifacts['continuity.json'],
      executionReceipt: artifacts['execution-receipt.json'],
      events,
      policySnapshot: artifacts['policy-snapshot.json'],
    };
  });

  ipcMain.handle(IPC_CHANNELS.GET_POLICY_STATUS, async (event, taskId?: string): Promise<any> => {
    assertTrustedSender(event);
    const safeTaskId = taskId === undefined ? undefined : TaskIdSchema.parse(taskId);
    if (!currentForgeCli || !currentProjectReader) throw ForgeLoopStudioError.unknown('No project open');
    const result = await currentForgeCli.policyStatus<Record<string, unknown>>(safeTaskId);
    if (!result.success) return null;
    const config = currentProjectReader.readConfig();
    return normalizePolicyStatus(result.data, typeof config.complianceMode === 'string' ? config.complianceMode : 'Unknown', 'POLICY_STATUS');
  });

  ipcMain.handle(IPC_CHANNELS.GET_TASK_EVENTS, async (event, taskId: string, cursor?: string, limit?: number): Promise<any> => {
    assertTrustedSender(event); const query = EventQuerySchema.parse({ taskId, cursor, limit });
    if (!currentTaskIndexer || !currentEventReader) {
      throw ForgeLoopStudioError.unknown('No project open');
    }

    const tasks = currentTaskIndexer.listTasks();
    const task = tasks.find((t) => t.taskId === query.taskId || t.taskKey === query.taskId);
    if (!task) {
      throw ForgeLoopStudioError.artifactUnreadable(taskId, 'Task not found');
    }

    return currentEventReader.readEventsPaginated(task.taskKey, query.cursor, query.limit);
  });

  ipcMain.handle(IPC_CHANNELS.VALIDATE_EVENT_LEDGER, async (event, taskId: string): Promise<any> => {
    assertTrustedSender(event); const safeTaskId = TaskIdSchema.parse(taskId);
    if (!currentTaskIndexer || !currentEventReader) throw ForgeLoopStudioError.unknown('No project open');
    const task = currentTaskIndexer.listTasks().find((entry) => entry.taskId === safeTaskId || entry.taskKey === safeTaskId);
    if (!task) throw ForgeLoopStudioError.artifactUnreadable(safeTaskId, 'Task not found');
    const result = currentEventReader.validateIntegrity(task.taskKey);
    return { ...result, scope: 'LEDGER' };
  });

  ipcMain.handle(IPC_CHANNELS.GET_RAW_ARTIFACT, async (event, request: { taskId: string; artifact: string }): Promise<string> => {
    assertTrustedSender(event); const safeRequest = RawArtifactSchema.parse(request);
    if (!currentTaskIndexer || !currentProjectReader) {
      throw ForgeLoopStudioError.unknown('No project open');
    }

    const tasks = currentTaskIndexer.listTasks();
    const task = tasks.find((t) => t.taskId === safeRequest.taskId || t.taskKey === safeRequest.taskId);
    if (!task) {
      throw ForgeLoopStudioError.artifactUnreadable(request.taskId, 'Task not found');
    }

    if (safeRequest.artifact === 'events.ndjson') return currentProjectReader.readEventPreview(task.taskKey);
    const artifacts = currentProjectReader.readTaskSummaryArtifacts(task.taskKey);
    const content = artifacts[safeRequest.artifact as keyof typeof artifacts];
    if (content === undefined) {
      throw ForgeLoopStudioError.artifactUnreadable(safeRequest.artifact, 'Artifact not found');
    }

    return typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  });

  ipcMain.handle(IPC_CHANNELS.GET_RECENT_PROJECTS, async (event): Promise<RecentProject[]> => {
    assertTrustedSender(event);
    return store.get('recentProjects') || [];
  });

  ipcMain.handle(IPC_CHANNELS.ADD_RECENT_PROJECT, async (event, project: RecentProject): Promise<void> => {
    assertTrustedSender(event); RecentProjectSchema.parse(project);
    const recent = store.get('recentProjects') || [];
    const filtered = recent.filter((p) => p.path !== project.path);
    filtered.unshift(project);
    store.set('recentProjects', filtered.slice(0, 10));
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_RECENT_PROJECT, async (event, path: string): Promise<void> => {
    assertTrustedSender(event); z.string().min(1).max(4096).parse(path);
    const recent = store.get('recentProjects') || [];
    store.set('recentProjects', recent.filter((p) => p.path !== path));
  });

}

export function updateProjectIpcWindow(mainWindow: BrowserWindow): void {
  currentMainWindow = mainWindow;
}

async function openProject(projectRoot: string): Promise<ProjectDetectionResult> {
  closeProject();

  const pathBoundary = new PathBoundary(projectRoot);

  const detector = createProjectDetector(pathBoundary);
  const detectionResult = detector.detect(projectRoot);

  if (!detectionResult.compatible) {
    throw ForgeLoopStudioError.protocolUnsupported(detectionResult.protocolVersion, projectRoot);
  }

  currentProjectBoundary = pathBoundary;
  currentProjectReader = createProjectReader(pathBoundary);
  currentForgeCli = new ForgeCli(projectRoot);
  const protocolInfo = await currentForgeCli.protocolInfo<{ protocolVersion: number; schemaVersion: number; packageVersion?: string }>();
  if (protocolInfo.success && protocolInfo.data) {
    if (protocolInfo.data.protocolVersion !== detectionResult.protocolVersion || protocolInfo.data.schemaVersion !== detectionResult.schemaVersion) {
      throw ForgeLoopStudioError.protocolUnsupported(protocolInfo.data.protocolVersion, projectRoot);
    }
    detectionResult.forgeLoopVersion = protocolInfo.data.packageVersion;
    detectionResult.warnings = [...detectionResult.warnings, 'Compatibility verified by forgeloop protocol-info.'];
  } else {
    detectionResult.warnings = [...detectionResult.warnings, 'ForgeLoop CLI unavailable; compatibility is artifact-only.'];
  }

  const taskEventReader = createEventLedgerReader(pathBoundary);
  const gateReader = createGateReader(pathBoundary);
  currentTaskIndexer = createTaskIndexer(pathBoundary);
  currentEventReader = taskEventReader;
  currentTaskSnapshotBuilder = createTaskSnapshotBuilder(pathBoundary, taskEventReader, gateReader);

  const compatibilityContext: ProjectCompatibilityContext = {
    source: protocolInfo.success ? 'PROTOCOL_INFO' : 'ARTIFACT_ONLY',
    protocolVersion: protocolInfo.data?.protocolVersion ?? detectionResult.protocolVersion,
    schemaVersion: protocolInfo.data?.schemaVersion ?? detectionResult.schemaVersion,
    packageVersion: protocolInfo.data?.packageVersion,
  };
  currentSnapshotBuilder = createProjectSnapshotBuilder(
    pathBoundary,
    currentProjectReader,
    currentForgeCli,
    compatibilityContext
  );

  currentWatcher = createProjectWatcher(
    pathBoundary,
    handleWatcherEvent,
    handleWatcherError,
    handleWatcherStatusChange
  );
  currentWatcher.start();

  const recentProject: RecentProject = {
    path: projectRoot,
    name: basename(projectRoot) || 'Unknown',
    lastOpenedAt: new Date().toISOString(),
  };
  store.set('recentProjects', [recentProject, ...(store.get('recentProjects') || []).filter((p) => p.path !== projectRoot)].slice(0, 10));

  notifyUpdate({ type: 'snapshot-refreshed', snapshot: await currentSnapshotBuilder.build(), timestamp: new Date().toISOString() });

  return detectionResult;
}

function closeProject(): void {
  if (currentWatcher) {
    currentWatcher.stop();
    currentWatcher = null;
  }
  currentProjectBoundary = null;
  currentProjectReader = null;
  currentTaskIndexer = null;
  currentTaskSnapshotBuilder = null;
  currentEventReader = null;
  currentForgeCli = null;
  currentSnapshotBuilder = null;
}

function handleWatcherEvent(event: any): void {
  notifyUpdate({
    type: 'task-updated',
    taskId: event.taskKey,
    data: event,
    timestamp: new Date().toISOString(),
  });

  if (currentSnapshotBuilder && !snapshotRefreshScheduled) {
    snapshotRefreshScheduled = true;
    setTimeout(() => { snapshotRefreshScheduled = false; if (!currentSnapshotBuilder) return; currentSnapshotBuilder.build().then((snapshot) => {
      notifyUpdate({ type: 'snapshot-refreshed', snapshot, timestamp: new Date().toISOString() });
    }).catch(console.error); }, 100);
  }
}

function handleWatcherError(error: Error): void {
  const studioError: StudioError = {
    code: 'WATCHER_FAILED',
    message: error.message,
    recoverable: true,
    details: error.stack,
  };
  notifyUpdate({ type: 'error', data: studioError, timestamp: new Date().toISOString() });
}

function handleWatcherStatusChange(active: boolean): void {
  notifyUpdate({
    type: 'watcher-status',
    data: { active, lastEventAt: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  });
}

function notifyUpdate(update: any): void {
  if (currentMainWindow && !currentMainWindow.isDestroyed()) {
    currentMainWindow.webContents.send(IPC_CHANNELS.PROJECT_UPDATE, update);
  }
}

export function getCurrentProjectRoot(): string | null {
  return currentProjectBoundary?.getProjectRoot() || null;
}
