import { useState, useEffect } from 'react';
import type { ProjectSnapshot, TaskSummary } from '@shared/domain';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TaskRow } from '../components/tasks/TaskRow';
import { NextSafeAction } from '../components/ui/NextSafeAction';
import { cn } from '../lib/utils';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Shield,
  Zap,
  Box,
  ChevronRight,
} from 'lucide-react';

interface OverviewProps {
  snapshot: ProjectSnapshot;
  watcherStatus?: { active: boolean };
  onTaskSelect?: (taskId: string) => void;
}

export function Overview({ snapshot, watcherStatus: _watcherStatus, onTaskSelect }: OverviewProps) {
  const [activeTask, setActiveTask] = useState<TaskSummary | null>(null);

  useEffect(() => {
    if (snapshot.activeTaskId) {
      const task = snapshot.tasks.find((t) => t.taskId === snapshot.activeTaskId);
      setActiveTask(task || null);
    } else if (snapshot.tasks.length > 0) {
      setActiveTask(snapshot.tasks[0]);
    }
  }, [snapshot]);

  const activeTasks = snapshot.tasks.filter((t) => t.phase !== 'COMPLETE' && t.phase !== 'BLOCKED');
  const blockedTasks = snapshot.tasks.filter((t) => t.phase === 'BLOCKED');
  const completedTasks = snapshot.tasks.filter((t) => t.phase === 'COMPLETE');
  const totalTasks = snapshot.tasks.length;

  const avgCoverage = totalTasks > 0
    ? Math.round(snapshot.tasks.reduce((acc, t) => acc + t.evidenceCoverage.coveragePercent, 0) / totalTasks)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-forge-text-primary">Project Overview</h1>
          <p className="text-sm text-forge-text-muted mt-1">Real-time engineering state for {snapshot.project.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={snapshot.health.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active Tasks"
          value={activeTasks.length}
          icon={<Activity className="w-4 h-4" />}
          color="accent"
        />
        <MetricCard
          label="Blocked"
          value={blockedTasks.length}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="danger"
          alert={blockedTasks.length > 0}
        />
        <MetricCard
          label="Completed"
          value={completedTasks.length}
          icon={<CheckCircle className="w-4 h-4" />}
          color="success"
        />
        <MetricCard
          label="Evidence Coverage"
          value={`${avgCoverage}%`}
          icon={<Shield className="w-4 h-4" />}
          color="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-forge-primary-surface border border-forge-border-subtle rounded-10">
          <div className="px-4 py-3 border-b border-forge-border-subtle flex items-center justify-between">
            <h2 className="text-sm font-semibold text-forge-text-primary flex items-center gap-2">
              <Box className="w-4 h-4 text-forge-text-muted" />
              Active Tasks
            </h2>
            <span className="text-xs text-forge-text-muted">{activeTasks.length} of {totalTasks}</span>
          </div>
          <div className="divide-y divide-forge-border-subtle/50">
            {activeTasks.length === 0 ? (
              <div className="p-6 text-center text-sm text-forge-text-muted">No active tasks</div>
            ) : (
              activeTasks.slice(0, 5).map((task) => (
                <TaskRow
                  key={task.taskId}
                  task={task}
                  isActive={task.taskId === snapshot.activeTaskId}
                  onClick={() => onTaskSelect?.(task.taskId)}
                />
              ))
            )}
          </div>
          {activeTasks.length > 5 && (
            <div className="p-3 border-t border-forge-border-subtle">
              <button className="text-xs text-forge-accent hover:text-forge-accent-hover flex items-center gap-1">
                View all {activeTasks.length} active tasks <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {activeTask && (
            <NextSafeAction task={activeTask} />
          )}

          <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
            <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Project Health</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-forge-text-secondary flex items-center gap-2">
                  <span className={cn('w-1.5 h-1.5 rounded-full', snapshot.health.protocol ? 'bg-forge-success' : 'bg-forge-danger')} />
                  Protocol
                </span>
                <span className="text-forge-text-primary">{snapshot.health.protocol ? '✓' : '✗'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-forge-text-secondary flex items-center gap-2">
                  <span className={cn('w-1.5 h-1.5 rounded-full', snapshot.health.state ? 'bg-forge-success' : 'bg-forge-danger')} />
                  State
                </span>
                <span className="text-forge-text-primary">{snapshot.health.state ? '✓' : '✗'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-forge-text-secondary flex items-center gap-2">
                  <span className={cn('w-1.5 h-1.5 rounded-full', snapshot.health.evidence ? 'bg-forge-success' : 'bg-forge-warning')} />
                  Evidence
                </span>
                <span className="text-forge-text-primary">{snapshot.health.evidence ? '✓' : '○'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-forge-text-secondary flex items-center gap-2">
                  <span className={cn('w-1.5 h-1.5 rounded-full', snapshot.health.policy ? 'bg-forge-success' : 'bg-forge-danger')} />
                  Policy
                </span>
                <span className="text-forge-text-primary">{snapshot.health.policy ? '✓' : '✗'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-forge-text-secondary flex items-center gap-2">
                  <span className={cn('w-1.5 h-1.5 rounded-full', snapshot.health.continuity ? 'bg-forge-success' : 'bg-forge-warning')} />
                  Continuity
                </span>
                <span className="text-forge-text-primary">{snapshot.health.continuity ? '✓' : '○'}</span>
              </div>
            </div>
          </div>

          <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
            <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Sessions</h3>
            <div className="space-y-2">
              {snapshot.sessions.length === 0 ? (
                <p className="text-xs text-forge-text-muted">No sessions recorded</p>
              ) : (
                snapshot.sessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-forge-text-secondary truncate max-w-[120px]">{session.id.slice(0, 8)}</span>
                    <span className="text-xs text-forge-text-muted">{session.harness || 'Unknown'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {snapshot.tasks.some((t) => t.nextAction) && (
        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10">
          <div className="px-4 py-3 border-b border-forge-border-subtle">
            <h2 className="text-sm font-semibold text-forge-text-primary flex items-center gap-2">
              <Zap className="w-4 h-4 text-forge-accent" />
              Next Safe Actions
            </h2>
          </div>
          <div className="divide-y divide-forge-border-subtle/50">
            {snapshot.tasks
              .filter((t) => t.nextAction && t.phase !== 'COMPLETE')
              .slice(0, 3)
              .map((task) => (
                <div key={task.taskId} className="px-4 py-3 flex items-center gap-4">
                  <span className="font-mono text-xs text-forge-text-muted w-24 truncate">{task.taskId.slice(0, 12)}</span>
                  <span className={cn('text-xs font-medium', {
                    'text-forge-accent': task.nextAction?.type === 'progress',
                    'text-forge-warning': task.nextAction?.type === 'recovery',
                    'text-forge-danger': task.nextAction?.type === 'blocker' || task.nextAction?.type === 'inconsistency',
                  })}>
                    {task.nextAction?.action}
                  </span>
                  {task.nextAction?.expectedPhase && (
                    <span className="text-xs text-forge-text-muted ml-auto">
                      → {task.nextAction.expectedPhase}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}