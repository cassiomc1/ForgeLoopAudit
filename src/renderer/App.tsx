import { useState, useEffect, useCallback } from 'react';
import type { ProjectDetectionResult, ProjectSnapshot, ProjectUpdate, WatcherStatus, StudioError, RecentProject, ForgeLoopStudioAPI } from '@shared/domain';
import { AppShell } from './components/app-shell/AppShell';
import { ProjectPicker } from './pages/ProjectPicker';
import { Overview } from './pages/Overview';
import { Tasks } from './pages/Tasks';
import { Flow } from './pages/Flow';
import { Contract } from './pages/Contract';
import { Evidence } from './pages/Evidence';
import { Events } from './pages/Events';
import { Executions } from './pages/Executions';
import { Continuity } from './pages/Continuity';
import { Policy } from './pages/Policy';
import { Diagnostics } from './pages/Diagnostics';
import { Actions } from './pages/Actions';
import { Settings } from './pages/Settings';
import { EmptyState } from './components/ui/EmptyState';
import { LoadingState } from './components/ui/LoadingState';
import {
  createProjectionRefreshEpochs,
  reduceProjectionRefresh,
  taskProjectionRefreshEpoch,
} from './projection-refresh';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
  { id: 'tasks', label: 'Tasks', icon: 'list-check' },
  { id: 'flow', label: 'Flow', icon: 'git-branch' },
  { id: 'contract', label: 'Contract', icon: 'file-text' },
  { id: 'evidence', label: 'Evidence', icon: 'clipboard-check' },
  { id: 'events', label: 'Events', icon: 'history' },
  { id: 'executions', label: 'Executions', icon: 'terminal' },
  { id: 'continuity', label: 'Continuity', icon: 'repeat' },
  { id: 'diagnostics', label: 'Diagnostics', icon: 'activity' },
  { id: 'actions', label: 'Actions', icon: 'activity' },
  { id: 'policy', label: 'Policy', icon: 'shield' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
] as const;

export type NavItemId = typeof NAV_ITEMS[number]['id'];

function getApi(): ForgeLoopStudioAPI {
  return (window as any).forgeLoopStudio;
}

export function App() {
  const [detectionResult, setDetectionResult] = useState<ProjectDetectionResult | null>(null);
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [activeNav, setActiveNav] = useState<NavItemId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [error, setError] = useState<StudioError | null>(null);
  const [watcherStatus, setWatcherStatus] = useState<WatcherStatus>({ active: false });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectionRefreshEpochs, setProjectionRefreshEpochs] = useState(createProjectionRefreshEpochs);

  const api = getApi();

  const loadRecentProjects = useCallback(async () => {
    try {
      const projects = await api.getRecentProjects();
      setRecentProjects(projects);
    } catch (err) {
      console.error('Failed to load recent projects:', err);
    }
  }, [api]);

  const handleProjectUpdate = useCallback((update: ProjectUpdate) => {
    setProjectionRefreshEpochs((current) => reduceProjectionRefresh(current, update));
    switch (update.type) {
      case 'project-opened':
        if (update.detection) setDetectionResult(update.detection);
        if (update.snapshot) setSnapshot(update.snapshot);
        setActiveNav('overview');
        break;
      case 'snapshot-refreshed':
        if (update.snapshot) {
          setSnapshot(update.snapshot);
        }
        break;
      case 'watcher-status':
        if (update.data) {
          setWatcherStatus(update.data as WatcherStatus);
        }
        break;
      case 'error':
        if (update.data) {
          setError(update.data as StudioError);
          setTimeout(() => setError(null), 5000);
        }
        break;
    }
  }, []);

  useEffect(() => {
    void loadRecentProjects();
    const unsubscribe = api.subscribeProjectUpdates(handleProjectUpdate);
    void api.notifyRendererReady().catch((err) => console.error('Failed to notify renderer readiness:', err));
    return unsubscribe;
  }, [api, handleProjectUpdate, loadRecentProjects]);

  const handleOpenProject = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await api.selectProject();
      if (result) {
        setDetectionResult(result);
        setActiveNav('overview');
        setSnapshot(await api.getProjectSnapshot());
      }
    } catch (err) {
      const studioError: StudioError = err instanceof Error
        ? { code: 'UNKNOWN_ERROR', message: err.message, recoverable: true }
        : { code: 'UNKNOWN_ERROR', message: 'Failed to open project', recoverable: true };
      setError(studioError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRecentProject = async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await api.openRecentProject(path);
      setDetectionResult(result);
      setActiveNav('overview');
      setSnapshot(await api.getProjectSnapshot());
    } catch (err) {
      const studioError: StudioError = err instanceof Error
        ? { code: 'UNKNOWN_ERROR', message: err.message, recoverable: true }
        : { code: 'UNKNOWN_ERROR', message: 'Failed to open project', recoverable: true };
      setError(studioError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDemoProject = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await api.openDemoProject();
      setDetectionResult(result);
      setActiveNav('overview');
      setSnapshot(await api.getProjectSnapshot());
    } catch (err) {
      const studioError: StudioError = err instanceof Error
        ? { code: 'UNKNOWN_ERROR', message: err.message, recoverable: true }
        : { code: 'UNKNOWN_ERROR', message: 'Failed to open the demo project', recoverable: true };
      setError(studioError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseProject = async () => {
    try {
      await api.closeProject();
      setDetectionResult(null);
      setSnapshot(null);
      setActiveNav('overview');
      setProjectionRefreshEpochs(createProjectionRefreshEpochs());
    } catch (err) {
      console.error('Failed to close project:', err);
    }
  };

  if (!detectionResult) {
    return (
      <ProjectPicker
        onOpenProject={handleOpenProject}
        onOpenDemoProject={handleOpenDemoProject}
        onOpenRecentProject={handleOpenRecentProject}
        recentProjects={recentProjects}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  const isDemoProject = detectionResult.projectKind === 'DEMO';
  const selectedProjectionTaskId = snapshot
    ? selectedTaskId || snapshot.activeTaskId || snapshot.tasks[0]?.taskId || null
    : null;
  const taskRefresh = (key: Parameters<typeof taskProjectionRefreshEpoch>[1]) =>
    taskProjectionRefreshEpoch(projectionRefreshEpochs, key, selectedProjectionTaskId);

  const renderPage = () => {
    if (!snapshot) {
      return <LoadingState />;
    }

    switch (activeNav) {
      case 'overview':
        return <Overview
          snapshot={snapshot}
          watcherStatus={watcherStatus}
          selectedTaskId={selectedTaskId}
          genericTaskRefreshToken={projectionRefreshEpochs.genericTask}
          actionsRefreshToken={taskRefresh('actions')}
          taskBoundaryRefreshTokens={{
            workspaceBinding: taskRefresh('workspaceBinding'),
            handoffs: taskRefresh('handoffs'),
            responsibility: taskRefresh('responsibility'),
          }}
          onTaskSelect={(taskId) => { setSelectedTaskId(taskId); setActiveNav('flow'); }}
          onViewAllTasks={() => setActiveNav('tasks')}
        />;
      case 'tasks':
        return <Tasks snapshot={snapshot} isDemoProject={isDemoProject} onTaskSelect={(taskId) => { setSelectedTaskId(taskId); setActiveNav('flow'); }} />;
      case 'flow':
        return <Flow snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'contract':
        return <Contract snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'evidence':
        return <Evidence
          snapshot={snapshot}
          selectedTaskId={selectedTaskId}
          genericTaskRefreshToken={projectionRefreshEpochs.genericTask}
          verificationScopeRefreshToken={taskRefresh('verificationScope')}
          attestationRefreshToken={taskRefresh('attestation')}
          onSelectedTaskChange={setSelectedTaskId}
          onOpenActions={() => setActiveNav('actions')}
        />;
      case 'events':
        return <Events snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'executions':
        return <Executions snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'continuity':
        return <Continuity snapshot={snapshot} selectedTaskId={selectedTaskId} handoffRefreshToken={taskRefresh('handoffs')} onSelectedTaskChange={setSelectedTaskId} onOpenDiagnostics={() => setActiveNav('diagnostics')} />;
      case 'diagnostics':
        return <Diagnostics snapshot={snapshot} selectedTaskId={selectedTaskId} genericTaskRefreshToken={projectionRefreshEpochs.genericTask} evaluationsRefreshToken={taskRefresh('evaluations')} onSelectedTaskChange={setSelectedTaskId} />;
      case 'actions':
        return <Actions snapshot={snapshot} selectedTaskId={selectedTaskId} actionsRefreshToken={taskRefresh('actions')} onSelectedTaskChange={setSelectedTaskId} />;
      case 'policy':
        return <Policy snapshot={snapshot} selectedTaskId={selectedTaskId} capabilityPolicyRefreshToken={projectionRefreshEpochs.capabilityPolicy} onSelectedTaskChange={setSelectedTaskId} />;
      case 'settings':
        return <Settings snapshot={snapshot} detection={detectionResult} />;
      default:
        return <EmptyState title="Unknown page" />;
    }
  };

  return (
    <AppShell
      projectName={snapshot?.project.name || 'Project'}
      isDemoProject={isDemoProject}
      branch={snapshot?.project.branch}
      head={snapshot?.project.head}
      protocolVersion={detectionResult.protocolVersion}
      health={snapshot?.health.status ?? 'UNKNOWN'}
      watcherStatus={watcherStatus}
      activeNav={activeNav}
      onNavChange={setActiveNav}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      onCloseProject={handleCloseProject}
      navItems={NAV_ITEMS}
      isLoading={isLoading}
      error={error}
    >
      {renderPage()}
    </AppShell>
  );
}
