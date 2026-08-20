import { useState } from 'react';
import type { ProjectSnapshot, TaskSummary } from '@shared/domain';
import { EmptyState } from '../components/ui/EmptyState';
import { Repeat, AlertTriangle, ArrowRight } from 'lucide-react';

interface ContinuityProps {
  snapshot: ProjectSnapshot;
}

export function Continuity({ snapshot }: ContinuityProps) {
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(
    snapshot.tasks.find((t) => t.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null
  );

  if (snapshot.tasks.length === 0) {
    return <EmptyState title="No tasks available" description="Select a task to view continuity information." />;
  }

  const continuity = selectedTask?.continuity;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-forge-text-primary">Continuity</h1>
          <p className="text-sm text-forge-text-muted mt-1">Cross-harness continuity state</p>
        </div>
        <select
          className="input w-48"
          value={selectedTask?.taskId || ''}
          onChange={(e) => {
            const task = snapshot.tasks.find((t) => t.taskId === e.target.value);
            setSelectedTask(task || null);
          }}
        >
          {snapshot.tasks.map((task) => (
            <option key={task.taskId} value={task.taskId}>
              {task.taskId}
            </option>
          ))}
        </select>
      </div>

      {!continuity ? (
        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-8">
          <div className="text-center text-sm text-forge-text-muted">
            <Repeat className="w-8 h-8 mx-auto mb-3 text-forge-border-strong" />
            <p>No continuity information available for this task</p>
            <p className="mt-1 text-xs">Continuity data will appear here when recorded by ForgeLoop</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider">Previous Harness</h3>
                {continuity.previousHarness ? (
                  <div className="p-4 bg-forge-secondary-surface rounded-8">
                    <p className="text-lg font-semibold text-forge-text-primary">{continuity.previousHarness}</p>
                    {continuity.previousSession && (
                      <p className="text-sm text-forge-text-muted mt-1 font-mono">{continuity.previousSession}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-forge-secondary-surface rounded-8">
                    <p className="text-sm text-forge-text-muted">No previous harness recorded</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider">Current Harness</h3>
                {continuity.currentHarness ? (
                  <div className="p-4 bg-forge-accent/5 border border-forge-accent/20 rounded-8">
                    <p className="text-lg font-semibold text-forge-accent">{continuity.currentHarness}</p>
                    {continuity.currentSession && (
                      <p className="text-sm text-forge-text-muted mt-1 font-mono">{continuity.currentSession}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-forge-secondary-surface rounded-8">
                    <p className="text-sm text-forge-text-muted">No current harness recorded</p>
                  </div>
                )}
              </div>
            </div>

            {continuity.previousHarness && continuity.currentHarness && (
              <div className="flex items-center justify-center mt-6">
                <div className="flex items-center gap-3 text-forge-text-muted">
                  <span className="text-sm">{continuity.previousHarness}</span>
                  <ArrowRight className="w-5 h-5 text-forge-accent" />
                  <span className="text-sm font-medium text-forge-accent">{continuity.currentHarness}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
              <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Last Completed Work</h3>
              <p className="text-sm text-forge-text-secondary">
                {continuity.lastCompletedWork || 'No completed work recorded'}
              </p>
            </div>

            <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
              <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Next Intended Step</h3>
              <p className="text-sm text-forge-text-secondary">
                {continuity.nextIntendedStep || 'No next step recorded'}
              </p>
            </div>
          </div>

          {continuity.knownBlockers && continuity.knownBlockers.length > 0 && (
            <div className="bg-forge-danger/5 border border-forge-danger/20 rounded-10 p-4">
              <h3 className="text-xs font-semibold text-forge-danger uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Known Blockers
              </h3>
              <ul className="space-y-2">
                {continuity.knownBlockers.map((blocker, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-forge-danger">
                    <span className="mt-0.5">•</span>
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {continuity.reconciliationRequired && (
            <div className="bg-forge-warning/5 border border-forge-warning/20 rounded-10 p-4">
              <h3 className="text-xs font-semibold text-forge-warning uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Reconciliation Required
              </h3>
              <p className="text-sm text-forge-text-secondary">
                Continuity reconciliation is required. The harness state needs to be synchronized.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
        <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Sessions</h3>
        {snapshot.sessions.length === 0 ? (
          <p className="text-sm text-forge-text-muted">No sessions recorded</p>
        ) : (
          <div className="space-y-2">
            {snapshot.sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-forge-secondary-surface rounded-6">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-forge-text-primary">{session.id.slice(0, 8)}</span>
                  <span className="text-xs text-forge-text-muted">{session.harness || 'Unknown harness'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {session.isActive && (
                    <span className="status-badge-success">Active</span>
                  )}
                  {session.createdAt && (
                    <span className="text-xs text-forge-text-muted font-mono">{new Date(session.createdAt).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}