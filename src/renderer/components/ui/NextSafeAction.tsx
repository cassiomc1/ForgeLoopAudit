import { TaskSummary } from '@shared/domain';
import { cn, getNextActionColor } from '../../lib/utils';
import { Zap, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

interface NextSafeActionProps {
  task: TaskSummary;
}

export function NextSafeAction({ task }: NextSafeActionProps) {
  if (!task.nextAction) {
    return (
      <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
        <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Next Safe Action
        </h3>
        <p className="text-sm text-forge-text-muted">No action available</p>
      </div>
    );
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'progress':
        return <Zap className="w-4 h-4" />;
      case 'recovery':
        return <RefreshCw className="w-4 h-4" />;
      case 'blocker':
        return <XCircle className="w-4 h-4" />;
      case 'inconsistency':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
      <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Next Safe Action
      </h3>
      <div className="space-y-2">
        <div className={cn('flex items-start gap-3 p-3 rounded-8', {
          'bg-forge-accent/5': task.nextAction.type === 'progress',
          'bg-forge-warning/5': task.nextAction.type === 'recovery',
          'bg-forge-danger/5': task.nextAction.type === 'blocker' || task.nextAction.type === 'inconsistency',
        })}>
          <div className={cn('mt-0.5', getNextActionColor(task.nextAction.type))}>
            {getActionIcon(task.nextAction.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', getNextActionColor(task.nextAction.type))}>
              {task.nextAction.action}
            </p>
            {task.nextAction.expectedPhase && (
              <p className="text-xs text-forge-text-muted mt-1">
                Expected next phase: <span className="font-medium text-forge-text-secondary">{task.nextAction.expectedPhase}</span>
              </p>
            )}
            {task.nextAction.details && (
              <p className="text-xs text-forge-text-muted mt-1">{task.nextAction.details}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}