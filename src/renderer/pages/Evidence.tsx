import { useState, useEffect } from 'react';
import type { ProjectSnapshot, TaskSummary } from '@shared/domain';
import { NoEvidenceState } from '../components/ui/EmptyState';
import { cn, getEvidenceKindColor, getEvidenceKindLabel } from '../lib/utils';

interface EvidenceProps {
  snapshot: ProjectSnapshot;
  selectedTaskId?: string | null;
  onSelectedTaskChange?: (taskId: string) => void;
}

export function Evidence({ snapshot, selectedTaskId, onSelectedTaskChange }: EvidenceProps) {
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(
    snapshot.tasks.find((t) => t.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null
  );
  useEffect(() => { setSelectedTask(snapshot.tasks.find((t) => t.taskId === selectedTaskId) || snapshot.tasks.find((t) => t.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null); }, [snapshot, selectedTaskId]);

  if (snapshot.tasks.length === 0) {
    return <NoEvidenceState />;
  }

  const evidence = selectedTask?.evidenceCoverage;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-forge-text-primary">Evidence Matrix</h1>
          <p className="text-sm text-forge-text-muted mt-1">Verification evidence coverage</p>
        </div>
        <select
          className="input w-48"
          value={selectedTask?.taskId || ''}
          onChange={(e) => {
            const task = snapshot.tasks.find((t) => t.taskId === e.target.value);
              setSelectedTask(task || null);
              if (task) onSelectedTaskChange?.(task.taskId);
          }}
        >
          {snapshot.tasks.map((task) => (
            <option key={task.taskId} value={task.taskId}>
              {task.taskId}
            </option>
          ))}
        </select>
      </div>

      {evidence && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
            <p className="text-xs text-forge-text-muted mb-1">Coverage</p>
            <p className="text-2xl font-semibold text-forge-text-primary">{evidence.coveragePercent}%</p>
            <div className="mt-2 h-1.5 bg-forge-border-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-forge-accent rounded-full"
                style={{ width: `${evidence.coveragePercent}%` }}
              />
            </div>
          </div>
          <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
            <p className="text-xs text-forge-text-muted mb-1">Observed</p>
            <p className="text-2xl font-semibold text-forge-success">{evidence.covered}</p>
          </div>
          <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
            <p className="text-xs text-forge-text-muted mb-1">Inferred</p>
            <p className="text-2xl font-semibold text-forge-info">{evidence.partial}</p>
          </div>
          <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
            <p className="text-xs text-forge-text-muted mb-1">Not Verified</p>
            <p className="text-2xl font-semibold text-forge-text-muted">{evidence.notVerified}</p>
          </div>
          <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
            <p className="text-xs text-forge-text-muted mb-1">Blocked</p>
            <p className="text-2xl font-semibold text-forge-danger">{evidence.blocked}</p>
          </div>
        </div>
      )}

      {selectedTask && selectedTask.checks.length > 0 && (
        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 overflow-hidden">
          <div className="px-4 py-3 border-b border-forge-border-subtle">
            <h2 className="text-sm font-semibold text-forge-text-primary">Verification Checks</h2>
          </div>
          <div className="divide-y divide-forge-border-subtle/50">
            {selectedTask.checks.map((check) => (
              <div key={check.id} className="px-4 py-3 flex items-center gap-4">
                <span className={cn('text-sm font-medium w-6', {
                  'text-forge-success': check.status === 'passed',
                  'text-forge-danger': check.status === 'failed',
                  'text-forge-accent': check.status === 'not-run',
                  'text-forge-text-muted': check.status === 'blocked',
                })}>
                  {check.status === 'passed' ? '✓' : check.status === 'failed' ? '✗' : '○'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-forge-text-primary">{check.requirement}</p>
                  <p className="text-xs text-forge-text-muted mt-0.5 font-mono">{check.id}</p>
                </div>
                <span className={cn('text-xs font-medium', getEvidenceKindColor(check.evidenceKind))}>
                  {getEvidenceKindLabel(check.evidenceKind)}
                </span>
                {check.timestamp && (
                  <span className="text-xs text-forge-text-muted font-mono">
                    {new Date(check.timestamp).toLocaleTimeString()}
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
