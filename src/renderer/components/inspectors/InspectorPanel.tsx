import { TaskSummary } from '@shared/domain';
import { X } from 'lucide-react';
import { cn, formatDate, getPhaseBadgeClass, getEvidenceKindColor, getCheckStatusColor } from '../../lib/utils';

interface InspectorPanelProps {
  task: TaskSummary;
  onClose: () => void;
}

export function InspectorPanel({ task, onClose }: InspectorPanelProps) {
  return (
    <div className="inspector-panel animate-slide-in-right">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-forge-border-subtle">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-forge-text-primary truncate">{task.taskId}</h2>
            <p className="text-xs text-forge-text-muted mt-0.5">Task Inspector</p>
          </div>
          <button
            className="p-1.5 rounded-6 text-forge-text-muted hover:bg-forge-hover-surface hover:text-forge-text-primary transition-colors"
            onClick={onClose}
            aria-label="Close inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Phase</h3>
            <div className="flex items-center gap-3">
              <span className={cn('phase-badge', getPhaseBadgeClass(task.phase, true))}>
                {task.phase}
              </span>
              {task.previousPhase && (
                <span className="text-xs text-forge-text-muted">
                  ← {task.previousPhase}
                </span>
              )}
            </div>
          </div>

          {task.objective && (
            <div>
              <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Objective</h3>
              <p className="text-sm text-forge-text-secondary">{task.objective}</p>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Selected Guides</h3>
            <div className="flex flex-wrap gap-2">
              {task.selectedGuides.length === 0 ? (
                <span className="text-xs text-forge-text-muted">None</span>
              ) : (
                task.selectedGuides.map((guide) => (
                  <span key={guide} className="px-2.5 py-1 text-xs font-medium rounded-6 bg-forge-accent/10 text-forge-accent">
                    {guide}
                  </span>
                ))
              )}
            </div>
          </div>

          {task.gates.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Gates</h3>
              <div className="space-y-2">
                {task.gates.map((gate) => (
                  <div key={gate.id} className="flex items-center justify-between p-2 bg-forge-secondary-surface rounded-6">
                    <span className="text-xs font-medium text-forge-text-primary">{gate.name}</span>
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

          {task.checks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Verification</h3>
              <div className="space-y-2">
                {task.checks.slice(0, 10).map((check) => (
                  <div key={check.id} className="flex items-start gap-3 p-2 bg-forge-secondary-surface rounded-6">
                    <span className={cn('text-xs font-medium mt-0.5', getCheckStatusColor(check.status))}>
                      {check.status === 'passed' ? '✓' : check.status === 'failed' ? '✗' : '○'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-forge-text-primary truncate">{check.requirement}</p>
                      <p className={cn('text-[10px] mt-0.5', getEvidenceKindColor(check.evidenceKind))}>
                        {check.evidenceKind}
                      </p>
                    </div>
                    {check.timestamp && (
                      <span className="text-[10px] text-forge-text-muted font-mono">
                        {formatDate(check.timestamp)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.evidenceCoverage && (
            <div>
              <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Evidence Coverage</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-forge-text-secondary">Coverage</span>
                  <span className="font-mono text-forge-text-primary">{task.evidenceCoverage.coveragePercent}%</span>
                </div>
                <div className="w-full h-2 bg-forge-border-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-forge-accent rounded-full transition-all duration-300"
                    style={{ width: `${task.evidenceCoverage.coveragePercent}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-forge-success" />
                    <span className="text-forge-text-muted">Observed: {task.evidenceCoverage.observed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-forge-info" />
                    <span className="text-forge-text-muted">Inferred: {task.evidenceCoverage.inferred}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-forge-text-muted" />
                    <span className="text-forge-text-muted">Not Verified: {task.evidenceCoverage.notVerified}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-forge-danger" />
                    <span className="text-forge-text-muted">Blocked: {task.evidenceCoverage.blocked}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {task.blockers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Blockers</h3>
              <div className="space-y-2">
                {task.blockers.map((blocker) => (
                  <div key={blocker.id} className="p-2 bg-forge-danger/5 border border-forge-danger/20 rounded-6">
                    <p className="text-xs text-forge-danger">{blocker.message}</p>
                    {blocker.phase && (
                      <p className="text-[10px] text-forge-text-muted mt-1">Phase: {blocker.phase}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Steps</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-forge-text-muted mb-1">Completed</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.completedSteps.length === 0 ? (
                    <span className="text-xs text-forge-text-muted">None</span>
                  ) : (
                    task.completedSteps.map((step) => (
                      <span key={step} className="px-2 py-0.5 text-[10px] font-medium rounded-4 bg-forge-success/10 text-forge-success">
                        {step}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-forge-text-muted mb-1">Pending</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.pendingSteps.length === 0 ? (
                    <span className="text-xs text-forge-text-muted">None</span>
                  ) : (
                    task.pendingSteps.map((step) => (
                      <span key={step} className="px-2 py-0.5 text-[10px] font-medium rounded-4 bg-forge-border-subtle text-forge-text-muted">
                        {step}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {task.lastUpdated && (
            <div>
              <h3 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider mb-3">Last Updated</h3>
              <p className="text-xs text-forge-text-secondary font-mono">{formatDate(task.lastUpdated)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}