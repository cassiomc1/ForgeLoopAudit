import { app, ipcMain, dialog, BrowserWindow } from 'electron';
import { PathBoundary } from '@main/security/path-boundary';
import { ForgeLoopStudioError } from '@shared/errors';
import type { ProjectDetectionResult, ProjectKind, RecentProject, StudioError } from '@shared/domain';
import { resolveRecentProjectKind } from './project-kind';
import { IPC_CHANNELS } from '@shared/ipc';
import { createProjectSnapshotBuilder, normalizePolicyStatus, type ProjectSnapshotBuilder, type ProjectCompatibilityContext } from '@main/core/project/project-snapshot';
import { createProjectDetector, createProjectReader, type ProjectReader } from '@main/core/project/project-reader';
import { ForgeCli } from '@main/core/cli/forge-cli';
import { createProjectWatcher } from '@main/watcher/project-watcher';
import { createExecutionReader, type ExecutionReader } from '@main/core/executions/execution-reader';
import { createTaskIndexer, createTaskSnapshotBuilder, createGateReader, type TaskIndexer, type TaskSnapshotBuilder } from '@main/core/tasks/task-index';
import { createEventLedgerReader, type EventLedgerReader } from '@main/core/events/ledger-reader';
import { createForgeLoopIntegration, type ForgeLoopIntegrationAdapter } from '@main/core/integration/forgeloop-integration';
import { normalizeCanonicalProtocolInfo, negotiateCompatibilityMode } from '@main/core/protocol/protocol-capabilities';
import { runStudioReadCommand } from '@main/core/integration/studio-read-commands';
import Store from 'electron-store';
import { z } from 'zod';
import { basename } from 'path';
import { resolveTrustedSchemaDirectory, SchemaValidator } from '@main/core/protocol/validator';
import { isFixtureProjectMode as resolveFixtureProjectMode } from './fixture-mode';
import { resolveBundledDemoPath } from '@main/demo/demo-path';
import { buildStudioDiagnostics } from '@main/core/diagnostics/diagnostics';
import { assertTrustedSender as assertSenderUrl } from '@main/security/sender-policy';

const store = new Store<{ recentProjects: RecentProject[] }>({
  name: 'forgeloop-studio-settings',
  defaults: { recentProjects: [] },
});

let currentProjectBoundary: PathBoundary | null = null;
let currentProjectReader: ProjectReader | null = null;
let currentTaskIndexer: TaskIndexer | null = null;
let currentTaskSnapshotBuilder: TaskSnapshotBuilder | null = null;
let currentEventReader: EventLedgerReader | null = null;
let currentExecutionReader: ExecutionReader | null = null;
let currentForgeCli: ForgeCli | null = null;
let currentIntegration: ForgeLoopIntegrationAdapter | null = null;
let currentCompatibilityMode: string | null = null;
let currentWatcher: ReturnType<typeof createProjectWatcher> | null = null;
let currentSnapshotBuilder: ProjectSnapshotBuilder | null = null;
let currentMainWindow: BrowserWindow | null = null;
let snapshotRefreshScheduled = false;
let snapshotGeneration = 0;
const TaskIdSchema = z.string().min(1).max(200);
const ProjectPathSchema = z.string().min(1).max(4096);
const EventQuerySchema = z.object({ taskId: TaskIdSchema, cursor: z.string().max(256).optional(), limit: z.number().int().min(1).max(500).optional() });
const RecentProjectSchema = z.object({ path: z.string().min(1).max(4096), name: z.string().max(300), lastOpenedAt: z.string().max(100), kind: z.enum(['PROJECT', 'DEMO']).optional() });
const RawArtifactSchema = z.object({ taskId: TaskIdSchema, artifact: z.enum(['task.json', 'contract.json', 'routing-result.json', 'preflight.json', 'work-state.json', 'continuity.json', 'recovery.json', 'execution-receipt.json', 'policy-snapshot.json', 'events.ndjson']) });
const ExecutionQuerySchema = z.object({ taskId: TaskIdSchema, limit: z.number().int().min(1).max(100).optional() });

function assertTrustedSender(event: Electron.IpcMainInvokeEvent): void {
  if (!currentMainWindow || event.sender.id !== currentMainWindow.webContents.id) throw ForgeLoopStudioError.unknown('Untrusted IPC sender');
  const url = event.senderFrame?.url || '';
  assertSenderUrl(url, app.isPackaged, currentMainWindow.webContents.getURL());
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
    return openProject(projectRoot, 'PROJECT');
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_RECENT_PROJECT, async (event, path: string): Promise<ProjectDetectionResult> => {
    assertTrustedSender(event); ProjectPathSchema.parse(path);
    const kind = resolveRecentProjectKind(store.get('recentProjects'), path);
    return openProject(path, kind);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_DEMO_PROJECT, async (event): Promise<ProjectDetectionResult> => {
    assertTrustedSender(event);
    const demoRoot = resolveBundledDemoPath({ isPackaged: app.isPackaged, appPath: app.getAppPath(), resourcesPath: process.resourcesPath });
    if (!demoRoot) throw ForgeLoopStudioError.projectNotForgeLoop('bundled demo');
    return openProject(demoRoot, 'DEMO');
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
    const nextResult = await readNextAction(taskId);
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
    if (isFixtureProjectMode()) return null;
    let policyResult: { success: boolean; data?: Record<string, unknown> };
    if (currentIntegration && currentCompatibilityMode === 'INTEGRATION_V1' && getCurrentProjectRoot()) {
      const outcome = await runStudioReadCommand<Record<string, unknown>>(
        currentIntegration,
        getCurrentProjectRoot()!,
        'policy-status',
        safeTaskId ? { taskId: safeTaskId } : {},
      );
      policyResult = outcome.kind === 'DOMAIN_OUTCOME' ? { success: true, data: outcome.data ?? undefined } : { success: false };
    } else {
      const cliStatus = await currentForgeCli.policyStatus<Record<string, unknown>>(safeTaskId);
      policyResult = cliStatus;
    }
    if (!policyResult.success) return null;
    const config = currentProjectReader.readConfig();
    return normalizePolicyStatus(policyResult.data, typeof config.complianceMode === 'string' ? config.complianceMode : 'Unknown', 'POLICY_STATUS');
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

  ipcMain.handle(IPC_CHANNELS.GET_TASK_EXECUTIONS, async (event, taskId: string, limit?: number) => {
    assertTrustedSender(event);
    const query = ExecutionQuerySchema.parse({ taskId, limit });
    if (!currentTaskIndexer || !currentExecutionReader) {
      throw ForgeLoopStudioError.unknown('No project open');
    }
    const task = currentTaskIndexer.listTasks().find((t) => t.taskId === query.taskId || t.taskKey === query.taskId);
    if (!task) {
      throw ForgeLoopStudioError.artifactUnreadable(query.taskId, 'Task not found');
    }
    return currentExecutionReader.readExecutions(task.taskKey, { limit: query.limit });
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

  ipcMain.handle(IPC_CHANNELS.RENDERER_READY, async (event): Promise<void> => {
    assertTrustedSender(event);
    if (!app.isPackaged && process.env.FORGELOOP_STUDIO_SMOKE === '1' && process.env.FORGELOOP_STUDIO_FIXTURE_PROJECT) {
      await openProject(process.env.FORGELOOP_STUDIO_FIXTURE_PROJECT);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, async (event): Promise<string> => {
    assertTrustedSender(event);
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.GET_DIAGNOSTICS, async (event) => {
    assertTrustedSender(event);
    return buildStudioDiagnostics({ studioVersion: app.getVersion(), forgeLoopCompatibilityMode: currentForgeCli ? 'CLI_ENHANCED' : 'ARTIFACT_ONLY' });
  });

}

export function updateProjectIpcWindow(mainWindow: BrowserWindow): void {
  currentMainWindow = mainWindow;
}

async function openProject(projectRoot: string, projectKind: ProjectKind = 'PROJECT'): Promise<ProjectDetectionResult> {
  closeProject();

  const pathBoundary = new PathBoundary(projectRoot);

  const schemaDir = resolveTrustedSchemaDirectory({
    allowEnvironmentOverride: !app.isPackaged,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
    cwd: process.cwd(),
    moduleDir: __dirname,
  });
  const protocolSchemas = new SchemaValidator(schemaDir);
  const detector = createProjectDetector(pathBoundary, protocolSchemas);
  const detectionResult = detector.detect();

  if (!detectionResult.compatible) {
    throw ForgeLoopStudioError.protocolUnsupported(detectionResult.protocolVersion, projectRoot);
  }

  currentProjectBoundary = pathBoundary;
  currentProjectReader = createProjectReader(pathBoundary, protocolSchemas);
  const fixtureCliDisabled = isFixtureProjectMode();
  currentForgeCli = new ForgeCli(projectRoot, fixtureCliDisabled ? '__fixture_cli_unavailable__' : 'forgeloop');

  const integration = await createForgeLoopIntegration();
  let canonicalProtocolInfo: ReturnType<typeof normalizeCanonicalProtocolInfo> = null;
  try {
    canonicalProtocolInfo = normalizeCanonicalProtocolInfo(await integration.readProtocolInfo(projectRoot));
  } catch {
    canonicalProtocolInfo = null;
  }
  const capabilities = integration.getCapabilities();
  const negotiation = negotiateCompatibilityMode({ protocolInfo: canonicalProtocolInfo, capabilities });
  if (negotiation.mode === 'INCOMPATIBLE') {
    throw ForgeLoopStudioError.protocolUnsupported(
      canonicalProtocolInfo?.protocolVersion ?? detectionResult.protocolVersion,
      projectRoot,
    );
  }
  currentIntegration = integration;
  currentCompatibilityMode = negotiation.mode;
  detectionResult.forgeLoopVersion = canonicalProtocolInfo?.packageVersion ?? detectionResult.forgeLoopVersion;
  detectionResult.compatibilityMode = negotiation.mode;
  detectionResult.warnings = [
    ...detectionResult.warnings,
    negotiation.mode === 'INTEGRATION_V1'
      ? 'Compatibility negotiated through ForgeLoop Integration API v1.'
      : `Degraded compatibility mode: ${negotiation.mode}${negotiation.reason ? ` (${negotiation.reason})` : ''}.`,
  ];

  const taskEventReader = createEventLedgerReader(pathBoundary, protocolSchemas);
  const gateReader = createGateReader(pathBoundary, protocolSchemas);
  currentTaskIndexer = createTaskIndexer(pathBoundary, currentProjectReader);
  currentEventReader = taskEventReader;
  currentExecutionReader = createExecutionReader(pathBoundary, protocolSchemas);
  currentTaskSnapshotBuilder = createTaskSnapshotBuilder(pathBoundary, taskEventReader, gateReader);

  const compatibilityContext: ProjectCompatibilityContext = {
    source: canonicalProtocolInfo ? 'PROTOCOL_INFO' : 'ARTIFACT_ONLY',
    protocolVersion: canonicalProtocolInfo?.protocolVersion ?? detectionResult.protocolVersion,
    schemaVersion: canonicalProtocolInfo?.schemaVersion ?? detectionResult.schemaVersion,
    packageVersion: canonicalProtocolInfo?.packageVersion ?? undefined,
    compatibilityMode: negotiation.mode,
  };
  currentSnapshotBuilder = createProjectSnapshotBuilder(
    pathBoundary,
    currentProjectReader,
    currentForgeCli,
    compatibilityContext,
    !fixtureCliDisabled,
    integration
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
    kind: projectKind,
  };
  store.set('recentProjects', [recentProject, ...(store.get('recentProjects') || []).filter((p) => p.path !== projectRoot)].slice(0, 10));

  const classifiedDetection = classifyDetection(detectionResult, projectKind);

  notifyUpdate({ type: 'project-opened', detection: classifiedDetection, snapshot: await currentSnapshotBuilder.build(), timestamp: new Date().toISOString() });

  return classifiedDetection;
}

function classifyDetection(detectionResult: ProjectDetectionResult, projectKind: ProjectKind): ProjectDetectionResult {
  return { ...detectionResult, projectKind };
}

function isFixtureProjectMode(): boolean {
  return resolveFixtureProjectMode(app.isPackaged, process.env);
}

async function readNextAction(taskId: string): Promise<{ success: boolean; data?: Record<string, unknown> }> {
  if (currentIntegration && currentCompatibilityMode === 'INTEGRATION_V1' && getCurrentProjectRoot()) {
    const outcome = await runStudioReadCommand<Record<string, unknown>>(currentIntegration, getCurrentProjectRoot()!, 'next', { taskId });
    if (outcome.kind === 'DOMAIN_OUTCOME') return { success: true, data: outcome.data ?? undefined };
    return { success: false };
  }
  return currentForgeCli ? currentForgeCli.next(taskId) : { success: false };
}

export async function openProjectForAutomation(projectRoot: string): Promise<ProjectDetectionResult> {
  return openProject(projectRoot);
}

export function shutdownProject(): void {
  closeProject();
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
  currentExecutionReader = null;
  currentForgeCli = null;
  currentIntegration = null;
  currentCompatibilityMode = null;
  currentSnapshotBuilder = null;
}

function handleWatcherEvent(event: any): void {
  notifyUpdate({
    type: 'task-updated',
    taskId: event.taskKey,
    data: event,
    timestamp: new Date().toISOString(),
  });

  // Execution provenance is loaded lazily per task; a lightweight
  // notification is enough. Only recovery/artifact changes rebuild the full
  // snapshot, and the scheduled flag coalesces bursts into one rebuild.
  if (event.type === 'execution-changed') return;

  if (currentSnapshotBuilder && !snapshotRefreshScheduled) {
    snapshotRefreshScheduled = true;
    setTimeout(() => { snapshotRefreshScheduled = false; if (!currentSnapshotBuilder) return; currentSnapshotBuilder.build().then((snapshot) => {
      notifyUpdate({ type: 'snapshot-refreshed', snapshot, generation: ++snapshotGeneration, timestamp: new Date().toISOString() });
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
