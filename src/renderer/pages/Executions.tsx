import { useState, useEffect, useCallback } from 'react';
import type { ProjectSnapshot, ExecutionPage } from '@shared/domain';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { cn } from '../lib/utils';
import { Terminal, ChevronDown, ChevronRight } from 'lucide-react';

interface ExecutionsProps {
  snapshot: ProjectSnapshot;
  selectedTaskId: string | null;
  onSelectedTaskChange?: (taskId: string) => void;
}

export function Executions({ snapshot, selectedTaskId, onSelectedTaskChange }: ExecutionsProps) {
  const [page, setPage] = useState<ExecutionPage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);

  const effectiveTask = snapshot.tasks.find((t) => t.taskId === selectedTaskId) || null;

  const loadExecutions = useCallback(async () => {
    if (!effectiveTask) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await (window as any).forgeLoopStudio.getTaskExecutions(effectiveTask.taskId);
      setPage(result);
      setRawJson(null);
      setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution provenance');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveTask]);

  useEffect(() => {
    void loadExecutions();
  }, [loadExecutions]);

  if (snapshot.tasks.length === 0) {
    return <EmptyState title="No tasks" description="Execution provenance is per-task; this project has no tasks." />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-forge-text-primary">Executions</h1>
          <p className="text-sm text-forge-text-muted mt-1">
            Read-only command execution provenance from current ForgeLoop artifacts
          </p>
        </div>
        <select
          className="input w-56"
          value={effectiveTask?.taskId || ''}
          onChange={(e) => onSelectedTaskChange?.(e.target.value)}
        >
          {!effectiveTask && <option value="">Select a task</option>}
          {snapshot.tasks.map((task) => (
            <option key={task.taskId} value={task.taskId}>
              {task.taskId}
            </option>
          ))}
        </select>
      </div>

      {!effectiveTask && (
        <EmptyState title="Select a task" description="Choose a task to inspect its bounded execution ledger." />
      )}

      {effectiveTask && isLoading && <LoadingState />}

      {effectiveTask && !isLoading && error && (
        <div className="bg-forge-danger/10 border border-forge-danger/30 rounded-10 p-4 text-sm text-forge-danger">
          {error}
        </div>
      )}

      {effectiveTask && !isLoading && page && (
        <>
          {page.invalidCount > 0 && (
            <div className="bg-forge-warning/10 border border-forge-warning/30 rounded-10 p-3 text-xs text-forge-warning">
              {page.invalidCount} execution artifact(s) failed schema validation and were withheld. This is surfaced, not hidden.
            </div>
          )}
          {page.executions.length === 0 ? (
            <EmptyState title="No executions" description={`No valid exec-*.json provenance found for ${effectiveTask.taskId}.`} />
          ) : (
            <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 divide-y divide-forge-border-subtle/50">
              {page.executions.map((execution) => (
                <div key={execution.executionId}>
                  <button
                    className="w-full px-4 py-3 flex items-center gap-4 hover:bg-forge-hover-surface transition-colors text-left"
                    onClick={() => setExpandedId(expandedId === execution.executionId ? null : execution.executionId)}
                  >
                    {expandedId === execution.executionId
                      ? <ChevronDown className="w-4 h-4 text-forge-text-muted shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-forge-text-muted shrink-0" />}
                    <Terminal className="w-4 h-4 text-forge-text-muted shrink-0" />
                    <span className="text-sm font-mono font-medium text-forge-text-primary truncate">
                      {execution.executionId}
                    </span>
                    <span className="text-xs text-forge-text-secondary truncate flex-1">{execution.argv.join(' ')}</span>
                    <span className={cn('text-xs font-semibold', execution.status === 'passed' ? 'text-forge-success' : 'text-forge-danger')}>
                      {execution.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-forge-text-muted font-mono">
                      exit {execution.exitCode ?? '—'}
                    </span>
                  </button>

                  {expandedId === execution.executionId && (
                    <div className="px-12 pb-4 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <p><span className="text-forge-text-muted">Check:</span> <span className="font-mono">{execution.checkId}</span></p>
                        <p><span className="text-forge-text-muted">Cycle:</span> <span className="font-mono">{execution.verificationCycle}</span></p>
                        <p><span className="text-forge-text-muted">Started:</span> <span className="font-mono">{execution.startedAt}</span></p>
                        <p><span className="text-forge-text-muted">Finished:</span> <span className="font-mono">{execution.finishedAt}</span></p>
                        <p className="col-span-2"><span className="text-forge-text-muted">cwd:</span> <span className="font-mono break-all">{execution.cwd}</span></p>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-forge-accent hover:text-forge-accent-hover"
                        onClick={() => setRawJson(rawJson === execution.executionId ? null : execution.executionId)}
                      >
                        {rawJson === execution.executionId ? 'Hide raw JSON' : 'Show raw JSON'}
                      </button>
                      {rawJson === execution.executionId && (
                        <pre className="text-[11px] font-mono text-forge-text-secondary bg-forge-secondary-surface rounded-6 p-3 overflow-x-auto select-text whitespace-pre-wrap">
{JSON.stringify(execution, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
