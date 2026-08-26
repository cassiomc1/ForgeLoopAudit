import { useState, useEffect } from 'react';
import type { ProjectSnapshot, TaskSummary } from '@shared/domain';
import { NoEvidenceState } from '../components/ui/EmptyState';
import { cn, getEvidenceKindColor, getEvidenceKindLabel } from '../lib/utils';

interface EvidenceProps {
  snapshot: ProjectSnapshot;
  selectedTaskId?: string | null;
  refreshToken?: number;
  onSelectedTaskChange?: (taskId: string) => void;
  onOpenActions?: () => void;
}

export function Evidence({ snapshot, selectedTaskId, refreshToken = 0, onSelectedTaskChange, onOpenActions }: EvidenceProps) {
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(
    snapshot.tasks.find((t) => t.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null
  );
  useEffect(() => { setSelectedTask(snapshot.tasks.find((t) => t.taskId === selectedTaskId) || snapshot.tasks.find((t) => t.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null); }, [snapshot, selectedTaskId]);
  const [executionReceipt, setExecutionReceipt] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!selectedTask) { setExecutionReceipt(null); return; }
    let cancelled = false;
    window.forgeLoopStudio.getTask(selectedTask.taskId).then((task) => { if (!cancelled) setExecutionReceipt(task.executionReceipt || null); }).catch(() => { if (!cancelled) setExecutionReceipt(null); });
    return () => { cancelled = true; };
  }, [selectedTask, refreshToken]);

  if (snapshot.tasks.length === 0) {
    return <NoEvidenceState />;
  }

  const evidence = selectedTask?.evidenceCoverage;
  const receiptActions = executionReceipt?.actions && typeof executionReceipt.actions === 'object' && !Array.isArray(executionReceipt.actions) ? executionReceipt.actions as Record<string, unknown> : null;
  const actionRefs = Array.isArray(receiptActions?.actionRefs) ? receiptActions.actionRefs.filter((value): value is string => typeof value === 'string') : [];

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
            <p className="text-xs text-forge-text-muted mb-1">Studio Coverage Score</p>
            <p className="text-2xl font-semibold text-forge-text-primary">{evidence.coveragePercent}%</p>
            <div className="mt-2 h-1.5 bg-forge-border-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-forge-accent rounded-full"
                style={{ width: `${evidence.coveragePercent}%` }}
              />
            </div>
          </div>
          <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
            <p className="text-xs text-forge-text-muted mb-1">Covered</p>
            <p className="text-2xl font-semibold text-forge-success">{evidence.covered}</p>
          </div>
          <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
            <p className="text-xs text-forge-text-muted mb-1">Partial</p>
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

      <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
        <div className="flex items-center justify-between gap-3 mb-3"><div><h2 className="text-sm font-semibold text-forge-text-primary">Durable action evidence</h2><p className="text-xs text-forge-text-muted mt-1">Receipt counts are displayed as recorded; canonical trusted readiness belongs to ForgeLoop.</p></div>{onOpenActions && <button className="btn-secondary text-xs" onClick={onOpenActions}>Open Actions</button>}</div>
        {receiptActions ? <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm"><ReceiptMetric label="Required" value={receiptActions.required} /><ReceiptMetric label="Trusted satisfied" value={receiptActions.trustedSatisfied} /><ReceiptMetric label="Unresolved required" value={receiptActions.unresolvedRequired} /><ReceiptMetric label="Failed" value={receiptActions.failed} /><ReceiptMetric label="Ambiguous" value={receiptActions.ambiguous} /><ReceiptMetric label="Pending" value={receiptActions.pending} /><div className="col-span-full"><p className="text-[11px] uppercase tracking-wider text-forge-text-muted mb-1">Action references</p><p className="text-xs font-mono text-forge-text-secondary">{actionRefs.length ? actionRefs.join(' · ') : 'None recorded'}</p></div></div> : <p className="text-sm text-forge-text-muted">No action summary is recorded in this execution receipt.</p>}
      </div>

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

function ReceiptMetric({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded-8 bg-forge-secondary-surface p-3"><p className="text-[11px] uppercase tracking-wider text-forge-text-muted">{label}</p><p className="mt-1 text-lg font-semibold text-forge-text-primary">{typeof value === 'number' ? value : 'Unknown'}</p></div>;
}
