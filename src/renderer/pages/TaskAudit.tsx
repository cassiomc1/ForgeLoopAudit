import type { ProjectAuditSnapshot, TaskAuditSummary } from '@shared/audit';
import type { ProjectSnapshot } from '@shared/domain';
import { StatusBadge } from '../components/ui/StatusBadge';

interface TaskAuditProps {
  snapshot: ProjectSnapshot;
  audit: ProjectAuditSnapshot | null;
  selectedTaskId?: string | null;
  onSelectedTaskChange: (taskId: string) => void;
  onRefreshAudit: () => void;
}

export function TaskAudit({ snapshot, audit, selectedTaskId, onSelectedTaskChange, onRefreshAudit }: TaskAuditProps) {
  const task = snapshot.tasks.find((entry) => entry.taskId === selectedTaskId) ?? snapshot.tasks.find((entry) => entry.taskId === snapshot.activeTaskId) ?? snapshot.tasks[0];
  const summary: TaskAuditSummary | undefined = task && audit?.taskAudits.find((entry) => entry.taskId === task.taskId);
  const findings = task ? audit?.findings.filter((finding) => finding.taskId === task.taskId) ?? [] : [];

  if (!task) return <div className="empty-state"><p className="empty-state-title">No tasks available</p></div>;

  return <div className="space-y-5 animate-fade-in">
    <div className="flex items-center justify-between gap-3">
      <div><h1 className="text-xl font-semibold text-forge-text-primary">Task Audit</h1><p className="text-sm text-forge-text-muted mt-1">Canonical audit status and traceable findings for the selected task.</p></div>
      <select className="input w-48" value={task.taskId} onChange={(event) => onSelectedTaskChange(event.target.value)}>{snapshot.tasks.map((entry) => <option key={entry.taskId} value={entry.taskId}>{entry.taskId}</option>)}</select>
    </div>
    {!audit || !summary ? <div className="bg-forge-warning/10 border border-forge-warning/30 rounded-10 p-5"><p className="font-medium text-forge-warning">Task audit unavailable</p><p className="mt-1 text-sm text-forge-text-secondary">Run the project audit before reviewing canonical task findings.</p><button className="btn-secondary mt-4" onClick={onRefreshAudit}>Run audit</button></div> : <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><Metric label="Canonical audit" value={summary.status} /><Metric label="Structural quality" value={summary.structuralQualityStatus} /><Metric label="Findings" value={String(summary.findingCount)} /></div>
      <section className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-5"><h2 className="font-semibold text-forge-text-primary">{task.taskId}</h2><p className="mt-1 text-sm text-forge-text-secondary">Phase: {task.phase} · Canonical authority remains in ForgeLoop.</p><div className="mt-4 space-y-2">{findings.length === 0 ? <p className="text-sm text-forge-text-muted">No task findings were reported.</p> : findings.map((finding) => <div key={finding.fingerprint} className="rounded-8 bg-forge-secondary-surface p-3"><div className="flex items-center gap-2"><StatusBadge status={finding.severity} /><span className="font-mono text-xs text-forge-text-muted">{finding.code}</span><span className="text-xs text-forge-text-muted">{finding.canonical ? '[C] Canonical ForgeLoop' : '[D] ForgeLoopAudit derived'}</span></div><p className="mt-1 text-sm text-forge-text-primary">{finding.title}</p><p className="mt-1 text-xs text-forge-text-secondary">{finding.summary}</p></div>)}</div></section>
    </>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4"><p className="text-xs text-forge-text-muted uppercase tracking-wider">{label}</p><div className="mt-2"><StatusBadge status={value} size="md" /></div></div>;
}
