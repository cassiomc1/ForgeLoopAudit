export const ARTIFACT_SCHEMAS = {
  'config.json': 'config.schema.json',
  'sources.json': 'source-registry.schema.json',
  'task.json': 'task-descriptor.schema.json',
  'contract.json': 'current-contract.schema.json',
  'routing-result.json': 'routing-result.schema.json',
  'preflight.json': 'preflight.schema.json',
  'work-state.json': 'work-state.schema.json',
  'continuity.json': 'continuity.schema.json',
  'execution-receipt.json': 'execution-receipt.schema.json',
  'gate.json': 'gate.schema.json',
  'event': 'event.schema.json',
  'policy-snapshot.json': 'policy-snapshot.schema.json',
  'policy.json': 'policy.schema.json',
  'policy-rules.json': 'policy-rules.schema.json',
  'policy-baseline.json': 'policy-baseline.schema.json',
  'policy-lock.json': 'policy-lock.schema.json',
} as const;

export type ArtifactName = keyof typeof ARTIFACT_SCHEMAS;

export const REQUIRED_ARTIFACTS: ArtifactName[] = [
  'config.json',
  'sources.json',
];

export const TASK_ARTIFACTS: ArtifactName[] = [
  'task.json',
  'contract.json',
  'routing-result.json',
  'preflight.json',
  'work-state.json',
  'continuity.json',
  'execution-receipt.json',
];

export const OPTIONAL_TASK_ARTIFACTS: ArtifactName[] = [
  'policy-snapshot.json',
];

export function getSchemaForArtifact(artifact: ArtifactName): string {
  return ARTIFACT_SCHEMAS[artifact];
}

export function isRequiredArtifact(artifact: ArtifactName): boolean {
  return REQUIRED_ARTIFACTS.includes(artifact);
}

export function isTaskArtifact(artifact: ArtifactName): boolean {
  return TASK_ARTIFACTS.includes(artifact) || OPTIONAL_TASK_ARTIFACTS.includes(artifact);
}