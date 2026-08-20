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
import { Continuity } from './pages/Continuity';
import { Policy } from './pages/Policy';
import { Settings } from './pages/Settings';
import { EmptyState } from './components/ui/EmptyState';
import { LoadingState } from './components/ui/LoadingState';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
  { id: 'tasks', label: 'Tasks', icon: 'list-check' },
  { id: 'flow', label: 'Flow', icon: 'git-branch' },
  { id: 'contract', label: 'Contract', icon: 'file-text' },
  { id: 'evidence', label: 'Evidence', icon: 'clipboard-check' },
  { id: 'events', label: 'Events', icon: 'history' },
  { id: 'continuity', label: 'Continuity', icon: 'repeat' },
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
      case 'task-updated':
      case 'task-added':
      case 'task-removed':
      case 'project-health-changed':
      case 'policy-changed':
      case 'session-changed':
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

  const handleCloseProject = async () => {
    try {
      await api.closeProject();
      setDetectionResult(null);
      setSnapshot(null);
      setActiveNav('overview');
    } catch (err) {
      console.error('Failed to close project:', err);
    }
  };

  if (!detectionResult) {
    return (
      <ProjectPicker
        onOpenProject={handleOpenProject}
        onOpenRecentProject={handleOpenRecentProject}
        recentProjects={recentProjects}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  const renderPage = () => {
    if (!snapshot) {
      return <LoadingState />;
    }

    switch (activeNav) {
      case 'overview':
        return <Overview snapshot={snapshot} watcherStatus={watcherStatus} onTaskSelect={(taskId) => { setSelectedTaskId(taskId); setActiveNav('flow'); }} onViewAllTasks={() => setActiveNav('tasks')} />;
      case 'tasks':
        return <Tasks snapshot={snapshot} onTaskSelect={(taskId) => { setSelectedTaskId(taskId); setActiveNav('flow'); }} />;
      case 'flow':
        return <Flow snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'contract':
        return <Contract snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'evidence':
        return <Evidence snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'events':
        return <Events snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'continuity':
        return <Continuity snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'policy':
        return <Policy snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'settings':
        return <Settings />;
      default:
        return <EmptyState title="Unknown page" />;
    }
  };

  return (
    <AppShell
      projectName={snapshot?.project.name || 'Project'}
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
