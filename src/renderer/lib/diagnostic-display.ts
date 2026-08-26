import type { CanonicalReflectionViewModel, TraceInterventionViewModel } from '@shared/domain';

export function formatIntervention(intervention: TraceInterventionViewModel): string {
  const identifier = intervention.id ?? 'Unknown intervention';
  const statement = intervention.statement ?? intervention.kind;
  return `${identifier} — ${statement}`;
}

export function isStalledReflection(reflection: Pick<CanonicalReflectionViewModel, 'status'> | null | undefined): boolean {
  return reflection?.status === 'STALLED';
}

export function openHypothesisPresentation(count: number | null, ids: string[]): { summary: string; items: string[] } {
  if (count === null) return { summary: 'Unknown / not verified', items: ids };
  if (count === 0) return { summary: '0 open hypotheses', items: [] };
  if (ids.length > 0) return { summary: `${count} open hypotheses`, items: ids };
  return {
    summary: `${count} open hypotheses`,
    items: ['Exact hypothesis IDs unavailable in continuity projection.'],
  };
}
