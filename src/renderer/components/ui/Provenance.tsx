interface ProvenanceProps {
  source: string;
  schema?: string;
  authority: 'FORGELOOP' | 'STUDIO_OBSERVATION';
  observedAt: string;
}

export function Provenance({ source, schema, authority, observedAt }: ProvenanceProps) {
  return <p className="text-[11px] text-forge-text-muted" title={`${source}${schema ? ` · ${schema}` : ''}`}>
    Source: {source} · {authority === 'FORGELOOP' ? 'ForgeLoop authority' : 'Studio observation'} · Observed: {observedAt || 'unknown'}
  </p>;
}
