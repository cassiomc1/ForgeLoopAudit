import { useEffect, useState } from 'react';
import type { ProjectSnapshot, TaskSummary, TaskHistoryView, TaskTraceView, TaskReflectionView, TaskInspectionView, TrajectoryMetricsView, TrajectoryEvaluationsView } from '@shared/domain';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import { Activity, Brain, Gauge, Lightbulb, ShieldAlert } from 'lucide-react';

type RecordValue = Record<string, unknown>;

interface DiagnosticsProps {
  snapshot: ProjectSnapshot;
  selectedTaskId?: string | null;
  refreshToken?: number;
  onSelectedTaskChange?: (taskId: string) => void;
}

interface DiagnosticViews {
  history: TaskHistoryView | null;
  trace: TaskTraceView | null;
  reflection: TaskReflectionView | null;
  inspection: TaskInspectionView | null;
  metrics: TrajectoryMetricsView | null;
  evaluations: TrajectoryEvaluationsView | null;
}

function record(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: unknown): string[] {
  return list(value).filter((entry): entry is string => typeof entry === 'string');
}

function text(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Unknown / not verified';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <section className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 overflow-hidden"><div className="px-4 py-3 border-b border-forge-border-subtle flex items-center gap-2"><span className="text-forge-text-muted">{icon}</span><h2 className="text-sm font-semibold text-forge-text-primary">{title}</h2></div><div className="p-4">{children}</div></section>;
}

function ProjectionNotice({ projection }: { projection: { available: boolean; error: { message: string } | null } | null }) {
  if (!projection || projection.available) return null;
  return <p className="text-xs text-forge-warning">{projection.error?.message || 'Canonical projection unavailable.'}</p>;
}

function ListBlock({ title, values, empty = 'None recorded' }: { title: string; values: string[]; empty?: string }) {
  return <div><h3 className="text-[11px] uppercase tracking-wider text-forge-text-muted mb-2">{title}</h3>{values.length ? <ul className="space-y-1.5">{values.map((value, index) => <li key={`${value}-${index}`} className="text-sm text-forge-text-secondary break-words">{value}</li>)}</ul> : <p className="text-sm text-forge-text-muted">{empty}</p>}</div>;
}

function MetricLine({ label, value }: { label: string; value: unknown }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-forge-text-muted">{label}</span><span className="text-forge-text-primary text-right break-words">{text(value)}</span></div>;
}

export function Diagnostics({ snapshot, selectedTaskId, refreshToken = 0, onSelectedTaskChange }: DiagnosticsProps) {
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(snapshot.tasks.find((task) => task.taskId === selectedTaskId) || snapshot.tasks.find((task) => task.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null);
  const [views, setViews] = useState<DiagnosticViews>({ history: null, trace: null, reflection: null, inspection: null, metrics: null, evaluations: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setSelectedTask(snapshot.tasks.find((task) => task.taskId === selectedTaskId) || snapshot.tasks.find((task) => task.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null); }, [snapshot, selectedTaskId]);

  const features = snapshot.protocol.featureSupport;
  useEffect(() => {
    if (!selectedTask) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const observability = features?.observability === true;
    const metrics = features?.trajectoryMetrics === true;
    const evaluations = features?.trajectoryEvaluations === true;
    Promise.all([
      observability ? window.forgeLoopStudio.getTaskHistory(selectedTask.taskId) : Promise.resolve(null),
      observability ? window.forgeLoopStudio.getTaskTrace(selectedTask.taskId) : Promise.resolve(null),
      observability ? window.forgeLoopStudio.getTaskReflection(selectedTask.taskId) : Promise.resolve(null),
      observability ? window.forgeLoopStudio.getTaskInspection(selectedTask.taskId) : Promise.resolve(null),
      metrics ? window.forgeLoopStudio.getTaskMetrics(selectedTask.taskId) : Promise.resolve(null),
      evaluations ? window.forgeLoopStudio.getTaskEvaluations(selectedTask.taskId) : Promise.resolve(null),
    ]).then(([history, trace, reflection, inspection, metricsView, evaluationsView]) => {
      if (!cancelled) setViews({ history, trace, reflection, inspection, metrics: metricsView, evaluations: evaluationsView });
    }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Canonical diagnostics are unavailable.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTask, features?.observability, features?.trajectoryMetrics, features?.trajectoryEvaluations, refreshToken]);

  if (!snapshot.tasks.length) return <EmptyState title="No tasks available" description="Open a ForgeLoop project with tasks to inspect canonical diagnostics." />;

  const trace = record(views.trace?.data);
  const reflection = record(views.reflection?.data);
  const inspection = record(views.inspection?.data);
  const history = record(views.history?.data);
  const diagnostics = record(trace.diagnostics);
  const informationGain = record(reflection.informationGain);
  const stallAnalysis = record(reflection.stallAnalysis);
  const actions = record(trace.actions);
  const metrics = record(views.metrics?.metrics);
  const trajectory = record(metrics.trajectory);
  const usage = record(metrics.usage);
  const interventionValues = list(diagnostics.interventions).map((entry) => {
    const value = record(entry);
    return `${text(value.id)} — ${text(value.statement || value.kind || value.summary)}`;
  });
  const caseValues = list(diagnostics.cases).map((entry) => {
    const value = record(entry);
    return `${text(value.id || value.diagnosticFingerprint)} — ${text(value.failureClass || value.summary || value.nextSafeAction)}`;
  });
  const failureSurfaces = list(trace.failureSurfaces).map((entry) => typeof entry === 'string' ? entry : text(record(entry).summary || record(entry).surface || entry));
  const failureSignatures = list(trace.failureSignatures).map((entry) => typeof entry === 'string' ? entry : text(record(entry).signature || record(entry).id || entry));
  const openHypotheses = strings(reflection.openHypotheses).length ? strings(reflection.openHypotheses) : list(diagnostics.hypotheses).map((entry) => text(record(entry).statement || record(entry).id || entry));
  const guidance = strings(reflection.guidance).length ? strings(reflection.guidance) : strings(reflection.recommendedProtocolAction ? [reflection.recommendedProtocolAction] : []);
  const noGain = informationGain.cyclesWithoutEffectiveGain;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4"><div><h1 className="text-xl font-semibold text-forge-text-primary">Diagnostics</h1><p className="text-sm text-forge-text-muted mt-1">Canonical history, trace, reflection and trajectory signals</p></div><select className="input w-48" value={selectedTask?.taskId || ''} onChange={(event) => { const task = snapshot.tasks.find((entry) => entry.taskId === event.target.value) || null; setSelectedTask(task); if (task) onSelectedTaskChange?.(task.taskId); }}>{snapshot.tasks.map((task) => <option key={task.taskId} value={task.taskId}>{task.taskId}</option>)}</select></div>
      {features?.observability !== true ? <div className="bg-forge-primary-surface border border-forge-warning/30 rounded-10 p-8 text-center"><Activity className="w-8 h-8 mx-auto mb-3 text-forge-warning" /><p className="text-sm font-medium text-forge-text-primary">Structured observability is not available</p><p className="mt-2 text-xs text-forge-text-muted">Not available with the bundled ForgeLoop capability set. Studio does not reconstruct trace or reflection semantics from raw events.</p></div> : loading ? <div className="card p-8 text-center text-sm text-forge-text-muted">Loading canonical diagnostics…</div> : (
        <>
          {error && <div className="border border-forge-danger/30 bg-forge-danger/10 rounded-8 p-3 text-sm text-forge-danger">{error}</div>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="metric-card"><span className="metric-label">Task phase</span><span className="metric-value text-lg">{selectedTask?.phase || 'Unknown'}</span></div><div className="metric-card"><span className="metric-label">Reflection status</span><span className="metric-value text-lg">{text(reflection.status)}</span></div><div className="metric-card"><span className="metric-label">Verification cycles</span><span className="metric-value text-lg">{text(reflection.verificationCycles ?? trajectory.verificationCycles)}</span></div><div className={cn('metric-card', Boolean(stallAnalysis.stalled) && 'ring-1 ring-forge-danger/30')}><span className="metric-label">No effective gain cycles</span><span className={cn('metric-value text-lg', Boolean(stallAnalysis.stalled) && 'text-forge-danger')}>{text(noGain)}</span></div></div>
          <Section title="Current diagnostic state" icon={<Brain className="w-4 h-4" />}><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><MetricLine label="Status" value={reflection.status} /><MetricLine label="Verification cycle" value={reflection.verificationCycle || reflection.verificationCycles} /><MetricLine label="Stalled" value={stallAnalysis.stalled} /><MetricLine label="Recommended protocol action" value={reflection.recommendedProtocolAction} /><MetricLine label="Trace event count" value={list(trace.events).length || history.eventCount} /><MetricLine label="Inspection source" value={views.inspection?.source} /><MetricLine label="Inspection keys" value={Object.keys(inspection).length} /></div></Section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Section title="Failure surfaces and signatures" icon={<ShieldAlert className="w-4 h-4" />}><ProjectionNotice projection={views.trace} /><div className="space-y-5"><ListBlock title="Failure surfaces" values={failureSurfaces} /><ListBlock title="Failure signatures" values={failureSignatures} /></div></Section><Section title="Hypotheses and dispositions" icon={<Lightbulb className="w-4 h-4" />}><div className="space-y-5"><ListBlock title="Open hypotheses" values={openHypotheses} /><ListBlock title="Recorded diagnostic cases" values={caseValues} /><ListBlock title="Interventions" values={interventionValues} /></div></Section></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Section title="Information gain" icon={<Gauge className="w-4 h-4" />}><div className="space-y-2"><MetricLine label="Cycles observed" value={informationGain.cycles} /><MetricLine label="Cycles without effective gain" value={informationGain.cyclesWithoutEffectiveGain} /><MetricLine label="Stall analysis" value={stallAnalysis.reason || stallAnalysis.stalled} /><MetricLine label="Strategy changes" value={trajectory.strategyChanges} /><MetricLine label="Oscillation detected" value={trajectory.oscillationDetected} /></div></Section><Section title="Interventions and strategy" icon={<Activity className="w-4 h-4" />}><div className="space-y-2"><MetricLine label="Interventions" value={trajectory.interventions || actions.interventions} /><MetricLine label="Action total" value={actions.total} /><MetricLine label="Action ambiguous" value={actions.ambiguous} /><MetricLine label="Strategies" value={reflection.strategies} /><ListBlock title="Reflection guidance" values={guidance} /></div></Section></div>
          <Section title="Canonical trajectory metrics" icon={<Gauge className="w-4 h-4" />}><ProjectionNotice projection={views.metrics} />{views.metrics?.available ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><MetricLine label="Observed commands" value={record(metrics.executions).observedCommands} /><MetricLine label="Failed commands" value={record(metrics.executions).failedCommands} /><MetricLine label="Wall clock" value={record(metrics.timing).wallClockMs} /><MetricLine label="Comparable steps" value={metrics.comparableSteps} /><MetricLine label="Usage tokens" value={usage.tokens ?? 'NULL (not provided)'} /><MetricLine label="Usage cost" value={usage.costUsd ?? 'NULL (not provided)'} /></div> : <p className="text-sm text-forge-text-muted">Trajectory metrics are not available with the negotiated capability set.</p>}</Section>
          <Section title="Trajectory evaluations" icon={<Activity className="w-4 h-4" />}><ProjectionNotice projection={views.evaluations} />{views.evaluations?.available ? views.evaluations.evaluations.length ? <div className="space-y-2">{views.evaluations.evaluations.map((evaluation, index) => <div key={text(evaluation.evaluationId || index)} className="flex flex-wrap items-center justify-between gap-3 rounded-8 bg-forge-secondary-surface p-3 text-sm"><span className="font-mono text-xs">{text(evaluation.evaluationId)}</span><span>Result: <strong>{text(evaluation.result)}</strong></span><span>Completion: {text(evaluation.completionValid)}</span><span>Safety: {text(evaluation.safetyValid)}</span></div>)}</div> : <p className="text-sm text-forge-text-muted">No trajectory evaluations recorded.</p> : <p className="text-sm text-forge-text-muted">Trajectory evaluations are not available with the negotiated capability set.</p>}</Section>
        </>
      )}
    </div>
  );
}
