import type { TaskSummary, ForgeLoopPhase } from '@shared/domain';
import { cn } from '../../lib/utils';
import { ChevronRight, AlertTriangle } from 'lucide-react';

interface TaskRowProps {
  task: TaskSummary;
  isActive?: boolean;
  onClick?: () => void;
}

export function TaskRow({ task, isActive, onClick }: TaskRowProps) {
  const getPhaseIcon = (phase: ForgeLoopPhase) => {
    switch (phase) {
      case 'COMPLETE':
        return <span className="text-forge-success">✓</span>;
      case 'BLOCKED':
        return <span className="text-forge-danger">✗</span>;
      case 'EXECUTING':
      case 'VERIFYING':
        return <span className="text-forge-accent animate-pulse-subtle">●</span>;
      default:
        return <span className="text-forge-text-muted">○</span>;
    }
  };

  return (
    <button
      className={cn(
        'w-full px-4 py-3 flex items-center gap-4 hover:bg-forge-hover-surface transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-accent focus-visible:ring-inset',
        isActive && 'bg-forge-accent/5'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm">{getPhaseIcon(task.phase)}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-forge-text-primary truncate">{task.taskId}</p>
          {task.objective && (
            <p className="text-xs text-forge-text-muted truncate mt-0.5 max-w-[300px]">{task.objective}</p>
          )}
          {task.artifactErrors && task.artifactErrors.length > 0 && <p className="text-xs text-forge-warning mt-1">Artifact validation warning</p>}
          {task.gateErrors && task.gateErrors.length > 0 && <p className="text-xs text-forge-danger mt-1">Gate validation error</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={cn('phase-badge', {
          'phase-badge-completed': task.phase === 'COMPLETE',
          'phase-badge-current': task.phase === 'EXECUTING' || task.phase === 'VERIFYING',
          'phase-badge-blocked': task.phase === 'BLOCKED',
          'phase-badge-pending': !['COMPLETE', 'EXECUTING', 'VERIFYING', 'BLOCKED'].includes(task.phase),
        })}>
          {task.phase}
        </span>

        {task.evidenceCoverage && (
          <span title="Studio Coverage Score" aria-label="Studio Coverage Score" className="text-xs text-forge-text-muted font-mono w-10 text-right">
            {task.evidenceCoverage.coveragePercent}%
          </span>
        )}

        {task.blockers.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-forge-danger">
            <AlertTriangle className="w-3 h-3" />
            {task.blockers.length}
          </span>
        )}

        {task.verificationCycle && task.verificationCycle > 1 && (
          <span className="text-xs text-forge-text-muted font-mono">
            C{task.verificationCycle}
          </span>
        )}

        <ChevronRight className="w-4 h-4 text-forge-text-muted" />
      </div>
    </button>
  );
}
