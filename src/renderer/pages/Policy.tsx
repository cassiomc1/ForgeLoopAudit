import { useState, useEffect } from 'react';
import type { ProjectSnapshot, TaskSummary } from '@shared/domain';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import { Shield, AlertTriangle, Lock, FileText, Activity } from 'lucide-react';

interface PolicyProps {
  snapshot: ProjectSnapshot;
  selectedTaskId?: string | null;
  onSelectedTaskChange?: (taskId: string) => void;
}

export function Policy({ snapshot, selectedTaskId, onSelectedTaskChange }: PolicyProps) {
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(
    snapshot.tasks.find((t) => t.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null
  );
  useEffect(() => { setSelectedTask(snapshot.tasks.find((t) => t.taskId === selectedTaskId) || snapshot.tasks.find((t) => t.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null); }, [snapshot, selectedTaskId]);

  if (snapshot.tasks.length === 0) {
    return <EmptyState title="No tasks available" description="Select a task to view policy information." />;
  }

  const policy = snapshot.policy;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-forge-text-primary">Policy</h1>
          <p className="text-sm text-forge-text-muted mt-1">Policy state and compliance</p>
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

      {policy ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-forge-text-muted uppercase tracking-wider">Mode</span>
                <Shield className="w-4 h-4 text-forge-accent" />
              </div>
              <p className="text-lg font-semibold text-forge-text-primary">{policy.complianceMode}</p>
            </div>
            <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-forge-text-muted uppercase tracking-wider">Rules</span>
                <FileText className="w-4 h-4 text-forge-text-muted" />
              </div>
              <p className="text-lg font-semibold text-forge-text-primary">{policy.ruleCount ?? 'Unknown'}</p>
            </div>
            <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-forge-text-muted uppercase tracking-wider">Baseline</span>
                <Activity className="w-4 h-4 text-forge-text-muted" />
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', {
                  'bg-forge-success': policy.baselineStatus === 'valid',
                  'bg-forge-danger': policy.baselineStatus === 'invalid',
                  'bg-forge-text-muted': policy.baselineStatus === 'unknown',
                })} />
                <p className="text-lg font-semibold text-forge-text-primary capitalize">{policy.baselineStatus}</p>
              </div>
            </div>
            <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-forge-text-muted uppercase tracking-wider">Policy Lock</span>
                <Lock className="w-4 h-4 text-forge-text-muted" />
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', {
                  'bg-forge-success': policy.lockStatus === 'valid',
                  'bg-forge-danger': policy.lockStatus === 'invalid',
                  'bg-forge-text-muted': policy.lockStatus === 'unknown',
                })} />
                <p className="text-lg font-semibold text-forge-text-primary capitalize">{policy.lockStatus}</p>
              </div>
            </div>
          </div>

          {policy.driftCount > 0 && (
            <div className="bg-forge-warning/5 border border-forge-warning/20 rounded-10 p-4">
              <h3 className="text-sm font-semibold text-forge-warning mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Policy Drift Detected
              </h3>
              <p className="text-sm text-forge-text-secondary">
                {policy.driftCount} policy drift{policy.driftCount !== 1 ? 's' : ''} detected. Consider running <code className="font-mono text-forge-accent">RESTORE_POLICY</code> to restore compliance.
              </p>
            </div>
          )}

          {selectedTask?.policySnapshot && Object.keys(selectedTask.policySnapshot).length > 0 && (
            <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
              <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Task Policy Snapshot</h3>
              <pre className="text-xs text-forge-text-secondary font-mono bg-forge-secondary-surface rounded-6 p-3 overflow-auto max-h-[300px]">
                {JSON.stringify(selectedTask.policySnapshot, null, 2)}
              </pre>
            </div>
          )}
        </>
      ) : (
        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-8">
          <div className="text-center text-sm text-forge-text-muted">
            <Shield className="w-8 h-8 mx-auto mb-3 text-forge-border-strong" />
            <p>No policy information available</p>
            <p className="mt-1 text-xs">Policy data will appear here when configured in ForgeLoop</p>
          </div>
        </div>
      )}

      {selectedTask && selectedTask.gates.length > 0 && (
        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10">
          <div className="px-4 py-3 border-b border-forge-border-subtle">
            <h2 className="text-sm font-semibold text-forge-text-primary">Gates</h2>
          </div>
          <div className="divide-y divide-forge-border-subtle/50">
            {selectedTask.gates.map((gate) => (
              <div key={gate.id} className="px-4 py-3 flex items-center gap-4">
                <span className={cn('w-2 h-2 rounded-full', {
                  'bg-forge-success': gate.status === 'satisfied',
                  'bg-forge-text-muted': gate.status === 'unverified',
                  'bg-forge-danger': gate.status === 'blocked',
                })} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-forge-text-primary">{gate.name}</p>
                  {gate.requiredBy && gate.requiredBy.length > 0 && (
                    <p className="text-xs text-forge-text-muted mt-0.5">
                      Required by: {gate.requiredBy.join(', ')}
                    </p>
                  )}
                </div>
                <span className={cn('text-xs font-medium', {
                  'text-forge-success': gate.status === 'satisfied',
                  'text-forge-text-muted': gate.status === 'unverified',
                  'text-forge-danger': gate.status === 'blocked',
                })}>
                  {gate.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
