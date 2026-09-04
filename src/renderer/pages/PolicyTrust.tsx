import { useEffect, useState } from 'react';
import type {
  CapabilityPolicyView,
  ProjectSnapshot,
  ResponsibilityView,
  TaskAttestationView,
  TaskHandoffsView,
  VerificationScopeView,
  WorkspaceBindingView,
} from '@shared/domain';
import { StatusBadge } from '../components/ui/StatusBadge';

interface PolicyTrustProps {
  snapshot: ProjectSnapshot;
  selectedTaskId?: string | null;
  capabilityPolicyRefreshToken?: number;
  onSelectedTaskChange: (taskId: string) => void;
}

interface TrustState {
  workspace: WorkspaceBindingView | null;
  responsibility: ResponsibilityView | null;
  handoffs: TaskHandoffsView | null;
  verificationScope: VerificationScopeView | null;
  attestation: TaskAttestationView | null;
}

const unavailable = (message: string) => ({ available: false, source: 'UNAVAILABLE' as const, error: { code: 'E_FEATURE_UNAVAILABLE', message } });

export function PolicyTrust({ snapshot, selectedTaskId, capabilityPolicyRefreshToken = 0, onSelectedTaskChange }: PolicyTrustProps) {
  const task = snapshot.tasks.find((entry) => entry.taskId === selectedTaskId) ?? snapshot.tasks.find((entry) => entry.taskId === snapshot.activeTaskId) ?? snapshot.tasks[0];
  const taskId = task?.taskId;
  const featureSupport = snapshot.protocol.featureSupport;
  const [capabilityPolicy, setCapabilityPolicy] = useState<CapabilityPolicyView | null>(null);
  const [trust, setTrust] = useState<TrustState>({ workspace: null, responsibility: null, handoffs: null, verificationScope: null, attestation: null });

  useEffect(() => {
    let cancelled = false;
    if (snapshot.protocol.featureSupport?.capabilityPolicy !== true) {
      setCapabilityPolicy(null);
      return () => { cancelled = true; };
    }
    window.forgeLoopAudit.getCapabilityPolicy().then((value) => { if (!cancelled) setCapabilityPolicy(value); }).catch(() => { if (!cancelled) setCapabilityPolicy(null); });
    return () => { cancelled = true; };
  }, [snapshot.protocol.featureSupport?.capabilityPolicy, capabilityPolicyRefreshToken]);

  useEffect(() => {
    let cancelled = false;
    if (!taskId) {
      setTrust({ workspace: null, responsibility: null, handoffs: null, verificationScope: null, attestation: null });
      return () => { cancelled = true; };
    }
    Promise.all([
      window.forgeLoopAudit.getTaskWorkspaceBinding(taskId).catch(() => unavailable('Workspace binding is unavailable.')),
      window.forgeLoopAudit.getTaskResponsibility(taskId).catch(() => unavailable('Responsibility constraints are unavailable.')),
      window.forgeLoopAudit.getTaskHandoffs(taskId).catch(() => unavailable('Canonical handoffs are unavailable.')),
      window.forgeLoopAudit.getTaskVerificationScope(taskId).catch(() => unavailable('Verification scope is unavailable.')),
      window.forgeLoopAudit.getTaskAttestation(taskId).catch(() => unavailable('Code attestation is unavailable.')),
    ]).then(([workspace, responsibility, handoffs, verificationScope, attestation]) => {
      if (!cancelled) setTrust({ workspace: workspace as WorkspaceBindingView, responsibility: responsibility as ResponsibilityView, handoffs: handoffs as TaskHandoffsView, verificationScope: verificationScope as VerificationScopeView, attestation: attestation as TaskAttestationView });
    });
    return () => { cancelled = true; };
  }, [taskId, featureSupport]);

  if (!task) return <div className="empty-state"><p className="empty-state-title">No tasks available</p><p className="empty-state-description">Trust projections appear when ForgeLoop exposes a task.</p></div>;

  return <div className="space-y-6 animate-fade-in">
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-xl font-semibold text-forge-text-primary">Policy &amp; Trust</h1><p className="text-sm text-forge-text-muted mt-1">Canonical policy, ownership boundaries and evidence trust signals for the selected task.</p></div><select className="input w-48" value={task.taskId} onChange={(event) => onSelectedTaskChange(event.target.value)}>{snapshot.tasks.map((entry) => <option key={entry.taskId} value={entry.taskId}>{entry.taskId}</option>)}</select></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><TrustCard label="Workspace" value={trust.workspace?.status ?? 'UNAVAILABLE'} /><TrustCard label="Responsibility" value={trust.responsibility?.status ?? 'UNAVAILABLE'} /><TrustCard label="Attestation" value={trust.attestation?.status ?? 'UNAVAILABLE'} /></div>
    <section className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-5"><h2 className="font-semibold text-forge-text-primary">Capability policy</h2><p className="mt-1 text-xs text-forge-text-muted">ForgeLoop decides capability policy; ForgeLoopAudit only displays the canonical projection.</p>{!capabilityPolicy ? <p className="mt-4 text-sm text-forge-text-muted">Capability policy unavailable or not advertised.</p> : !capabilityPolicy.available ? <p className="mt-4 text-sm text-forge-warning">{capabilityPolicy.error?.message ?? 'Capability policy unavailable.'}</p> : <div className="mt-4 space-y-3"><p className="text-sm text-forge-text-secondary">Default decision: <span className="font-mono text-forge-text-primary">{capabilityPolicy.defaultDecision ?? 'UNKNOWN'}</span></p>{capabilityPolicy.rules.length === 0 ? <p className="text-sm text-forge-text-muted">No capability-specific rules recorded.</p> : <div className="divide-y divide-forge-border-subtle/50 border border-forge-border-subtle rounded-8">{capabilityPolicy.rules.map((rule) => <div key={rule.capability} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span className="font-mono text-xs text-forge-text-secondary">{rule.capability}</span><span className="text-xs font-semibold text-forge-text-primary">{rule.decision}</span></div>)}</div>}</div>}</section>
    <section className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-5"><h2 className="font-semibold text-forge-text-primary">Trust boundary projections</h2><p className="mt-1 text-xs text-forge-text-muted">Handoffs and verification scope are operational/canonical context, not proof of authority or attestation coverage.</p><div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"><Projection label="Workspace binding" value={trust.workspace?.status ?? 'UNAVAILABLE'} detail={trust.workspace?.path ?? trust.workspace?.error?.message} /><Projection label="Responsibility" value={trust.responsibility?.status ?? 'UNAVAILABLE'} detail={trust.responsibility?.errors?.[0]?.message} /><Projection label="Canonical handoffs" value={trust.handoffs?.available ? `${trust.handoffs.count ?? trust.handoffs.handoffs.length} recorded` : 'UNAVAILABLE'} detail={trust.handoffs?.error?.message ?? 'Operational receipts only; never evidence.'} /><Projection label="Verification scope" value={trust.verificationScope?.resolvedMode ?? 'UNAVAILABLE'} detail={trust.verificationScope?.error?.message ?? 'Scope is not attestation coverage.'} /><Projection label="Code attestation" value={trust.attestation?.level ?? 'UNAVAILABLE'} detail={trust.attestation?.errors?.[0]?.message ?? 'ForgeLoop owns attestation semantics; no signing is performed here.'} /></div></section>
  </div>;
}

function TrustCard({ label, value }: { label: string; value: string }) {
  return <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4"><p className="text-xs text-forge-text-muted uppercase tracking-wider">{label}</p><div className="mt-2"><StatusBadge status={value} size="md" /></div></div>;
}

function Projection({ label, value, detail }: { label: string; value: string; detail?: string | null }) {
  return <div className="rounded-8 bg-forge-secondary-surface p-4"><p className="text-xs text-forge-text-muted">{label}</p><p className="mt-2 text-sm font-medium text-forge-text-primary">{value}</p>{detail && <p className="mt-1 text-xs text-forge-text-secondary break-words">{detail}</p>}</div>;
}
