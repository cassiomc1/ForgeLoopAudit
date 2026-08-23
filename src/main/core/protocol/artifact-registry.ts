import { existsSync } from 'fs';
import { join } from 'path';
import registry from './artifact-registry.json';

export const ARTIFACT_SCHEMAS = registry as Record<ArtifactName, string>;

export type ArtifactName =
  | 'config.json'
  | 'sources.json'
  | 'task.json'
  | 'contract.json'
  | 'routing-result.json'
  | 'preflight.json'
  | 'work-state.json'
  | 'continuity.json'
  | 'recovery.json'
  | 'execution.json'
  | 'execution-receipt.json'
  | 'session.json'
  | 'gate.json'
  | 'event'
  | 'policy-snapshot.json'
  | 'policy/rules.json'
  | 'policy/discovery.json'
  | 'policy/baseline.json'
  | 'policy/policy.lock';

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

export function getMissingArtifactSchemas(schemasDir: string): string[] {
  return [...new Set(Object.values(ARTIFACT_SCHEMAS))].filter((schema) => {
    return !existsSync(join(schemasDir, schema));
  });
}
