import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProjectDetectionResult, ProjectSnapshot, ProjectUpdate, WatcherStatus, AuditAppError, RecentProject, ForgeLoopAuditAPI } from '@shared/domain';
import type { ProjectAuditSnapshot } from '@shared/audit';
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
import { PolicyTrust } from './pages/PolicyTrust';
import { Diagnostics } from './pages/Diagnostics';
import { Actions } from './pages/Actions';
import { Settings } from './pages/Settings';
import { AuditSummary } from './pages/AuditSummary';
import { Findings } from './pages/Findings';
import { Quality } from './pages/Quality';
import { AuditHistory } from './pages/AuditHistory';
import { Reports } from './pages/Reports';
import { TaskAudit } from './pages/TaskAudit';
import { EmptyState } from './components/ui/EmptyState';
import { LoadingState } from './components/ui/LoadingState';
import {
  createProjectionRefreshEpochs,
  reduceProjectionRefresh,
  shouldApplySnapshotGeneration,
  taskProjectionRefreshEpoch,
} from './projection-refresh';

export const NAV_ITEMS = [
  { id: 'audit-summary', label: 'Audit Summary', icon: 'layout-dashboard' },
  { id: 'findings', label: 'Findings', icon: 'clipboard-check' },
  { id: 'tasks', label: 'Tasks', icon: 'list-check' },
  { id: 'evidence', label: 'Evidence', icon: 'clipboard-check' },
  { id: 'quality', label: 'Quality', icon: 'activity' },
  { id: 'policy-trust', label: 'Policy & Trust', icon: 'shield' },
  { id: 'audit-history', label: 'Audit History', icon: 'history' },
  { id: 'reports', label: 'Reports', icon: 'file-text' },
  { id: 'diagnostics', label: 'Diagnostics', icon: 'activity' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
] as const;

export const TASK_DETAIL_ITEMS = [
  { id: 'task-audit', label: 'Audit', icon: 'clipboard-check' },
  { id: 'contract', label: 'Contract', icon: 'file-text' },
  { id: 'evidence', label: 'Evidence', icon: 'clipboard-check' },
  { id: 'flow', label: 'Lifecycle', icon: 'git-branch' },
  { id: 'events', label: 'Events', icon: 'repeat' },
  { id: 'executions', label: 'Executions', icon: 'activity' },
  { id: 'continuity', label: 'Continuity', icon: 'repeat' },
  { id: 'actions', label: 'Actions', icon: 'zap' },
  { id: 'overview', label: 'Boundaries', icon: 'shield' },
] as const;

export type NavItemId = typeof NAV_ITEMS[number]['id'] | typeof TASK_DETAIL_ITEMS[number]['id'] | 'policy';

function getApi(): ForgeLoopAuditAPI {
  return (window as any).forgeLoopAudit;
}

export function App() {
  const [detectionResult, setDetectionResult] = useState<ProjectDetectionResult | null>(null);
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [audit, setAudit] = useState<ProjectAuditSnapshot | null>(null);
  const [activeNav, setActiveNav] = useState<NavItemId>('audit-summary');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [error, setError] = useState<AuditAppError | null>(null);
  const [watcherStatus, setWatcherStatus] = useState<WatcherStatus>({ active: false });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectionRefreshEpochs, setProjectionRefreshEpochs] = useState(createProjectionRefreshEpochs);
  const latestSnapshotGeneration = useRef(0);

  const api = getApi();

  const loadRecentProjects = useCallback(async () => {
    try {
      const projects = await api.getRecentProjects();
      setRecentProjects(projects);
    } catch (err) {
      console.error('Failed to load recent projects:', err);
    }
  }, [api]);

  const refreshAudit = useCallback(async () => {
    try {
      setAudit(await api.getProjectAudit());
    } catch (err) {
      console.error('Failed to load ForgeLoopAudit audit:', err);
      setAudit(null);
    }
  }, [api]);

  const handleProjectUpdate = useCallback((update: ProjectUpdate) => {
    if (update.type === 'project-opened') {
      latestSnapshotGeneration.current = update.generation ?? 0;
    } else if (!shouldApplySnapshotGeneration(latestSnapshotGeneration.current, update.generation)) {
      // Snapshot builds are asynchronous. A slower build may finish after a
      // newer one; its generation must never roll the UI back to stale data.
      return;
    } else if (update.generation !== undefined) {
      latestSnapshotGeneration.current = update.generation;
    }

    setProjectionRefreshEpochs((current) => reduceProjectionRefresh(current, update));
    switch (update.type) {
      case 'project-opened':
        if (update.detection) setDetectionResult(update.detection);
        if (update.snapshot) setSnapshot(update.snapshot);
        setSelectedTaskId(null);
        setAudit(null);
        setActiveNav('audit-summary');
        break;
      case 'snapshot-refreshed':
        if (update.snapshot) {
          setSnapshot(update.snapshot);
          setAudit(null);
          setSelectedTaskId((current) => current && update.snapshot?.tasks.some((task) => task.taskId === current) ? current : null);
        }
        break;
      case 'audit-invalidated':
      case 'finding-changed':
        setAudit(null);
        break;
      case 'watcher-status':
        if (update.data) {
          setWatcherStatus(update.data as WatcherStatus);
        }
        break;
      case 'error':
        if (update.data) {
          setError(update.data as AuditAppError);
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
        setActiveNav('audit-summary');
        setSnapshot(await api.getProjectSnapshot());
        await refreshAudit();
      }
    } catch (err) {
      const auditError: AuditAppError = err instanceof Error
        ? { code: 'UNKNOWN_ERROR', message: err.message, recoverable: true }
        : { code: 'UNKNOWN_ERROR', message: 'Failed to open project', recoverable: true };
      setError(auditError);
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
      setActiveNav('audit-summary');
      setSnapshot(await api.getProjectSnapshot());
      await refreshAudit();
    } catch (err) {
      const auditError: AuditAppError = err instanceof Error
        ? { code: 'UNKNOWN_ERROR', message: err.message, recoverable: true }
        : { code: 'UNKNOWN_ERROR', message: 'Failed to open project', recoverable: true };
      setError(auditError);
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
      setActiveNav('audit-summary');
      setSnapshot(await api.getProjectSnapshot());
      await refreshAudit();
    } catch (err) {
      const auditError: AuditAppError = err instanceof Error
        ? { code: 'UNKNOWN_ERROR', message: err.message, recoverable: true }
        : { code: 'UNKNOWN_ERROR', message: 'Failed to open the demo project', recoverable: true };
      setError(auditError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseProject = async () => {
    try {
      await api.closeProject();
      setDetectionResult(null);
      setSnapshot(null);
      setAudit(null);
      setActiveNav('audit-summary');
      setSelectedTaskId(null);
      setWatcherStatus({ active: false });
      latestSnapshotGeneration.current = 0;
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
      case 'audit-summary':
        return <AuditSummary audit={audit} snapshot={snapshot} detection={detectionResult} onRefresh={refreshAudit} onTaskSelect={(taskId) => { setSelectedTaskId(taskId); setActiveNav('findings'); }} onViewFindings={() => setActiveNav('findings')} />;
      case 'findings':
        return <Findings audit={audit} onTaskSelect={(taskId) => { setSelectedTaskId(taskId); setActiveNav('tasks'); }} />;
      case 'task-audit':
        return <TaskAudit snapshot={snapshot} audit={audit} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} onRefreshAudit={refreshAudit} />;
      case 'overview':
        return <Overview
          snapshot={snapshot}
          detection={detectionResult}
          watcherStatus={watcherStatus}
          selectedTaskId={selectedTaskId}
          genericTaskRefreshToken={projectionRefreshEpochs.genericTask}
          actionsRefreshToken={taskRefresh('actions')}
          taskBoundaryRefreshTokens={{
            workspaceBinding: taskRefresh('workspaceBinding'),
            handoffs: taskRefresh('handoffs'),
            responsibility: taskRefresh('responsibility'),
          }}
          onTaskSelect={(taskId) => { setSelectedTaskId(taskId); setActiveNav('task-audit'); }}
          onViewAllTasks={() => setActiveNav('tasks')}
        />;
      case 'tasks':
        return <Tasks snapshot={snapshot} audit={audit} isDemoProject={isDemoProject} onTaskSelect={(taskId) => { setSelectedTaskId(taskId); setActiveNav('task-audit'); }} />;
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
        return <Events snapshot={snapshot} selectedTaskId={selectedTaskId} eventsRefreshToken={taskRefresh('events')} onSelectedTaskChange={setSelectedTaskId} />;
      case 'executions':
        return <Executions snapshot={snapshot} selectedTaskId={selectedTaskId} executionsRefreshToken={taskRefresh('executions')} onSelectedTaskChange={setSelectedTaskId} />;
      case 'continuity':
        return <Continuity snapshot={snapshot} selectedTaskId={selectedTaskId} handoffRefreshToken={taskRefresh('handoffs')} onSelectedTaskChange={setSelectedTaskId} onOpenDiagnostics={() => setActiveNav('diagnostics')} />;
      case 'quality':
        return <Quality snapshot={snapshot} selectedTaskId={selectedTaskId} onSelectedTaskChange={setSelectedTaskId} />;
      case 'audit-history':
        return <AuditHistory audit={audit} onRefreshAudit={refreshAudit} />;
      case 'reports':
        return <Reports audit={audit} onRefreshAudit={refreshAudit} />;
      case 'diagnostics':
        return <Diagnostics snapshot={snapshot} selectedTaskId={selectedTaskId} genericTaskRefreshToken={projectionRefreshEpochs.genericTask} evaluationsRefreshToken={taskRefresh('evaluations')} onSelectedTaskChange={setSelectedTaskId} />;
      case 'actions':
        return <Actions snapshot={snapshot} selectedTaskId={selectedTaskId} actionsRefreshToken={taskRefresh('actions')} onSelectedTaskChange={setSelectedTaskId} />;
      case 'policy-trust':
        return <PolicyTrust snapshot={snapshot} selectedTaskId={selectedTaskId} capabilityPolicyRefreshToken={projectionRefreshEpochs.capabilityPolicy} onSelectedTaskChange={setSelectedTaskId} />;
      case 'policy':
        return <Policy snapshot={snapshot} selectedTaskId={selectedTaskId} capabilityPolicyRefreshToken={projectionRefreshEpochs.capabilityPolicy} onSelectedTaskChange={setSelectedTaskId} />;
      case 'settings':
        return <Settings snapshot={snapshot} detection={detectionResult} watcherStatus={watcherStatus} />;
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
      health={audit?.verdict.integrity ?? snapshot?.health.status ?? 'UNKNOWN'}
      watcherStatus={watcherStatus}
      activeNav={activeNav}
      onNavChange={setActiveNav}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      onCloseProject={handleCloseProject}
      navItems={NAV_ITEMS}
      taskDetailItems={TASK_DETAIL_ITEMS}
      selectedTaskId={selectedTaskId}
      isLoading={isLoading}
      error={error}
    >
      {renderPage()}
    </AppShell>
  );
}
