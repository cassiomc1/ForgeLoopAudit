import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function getTrustedSchemaNames(repoRoot = process.cwd()) {
  const registry = JSON.parse(readFileSync(join(repoRoot, 'src/main/core/protocol/artifact-registry.json'), 'utf8'));
  return [...new Set(Object.values(registry))].sort();
}

export function assertManifestShape(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new Error('Schema provenance must be an object');
  if (typeof manifest.forgeLoopPackageVersion !== 'string' || !manifest.forgeLoopPackageVersion) {
    throw new Error('Schema provenance is missing forgeLoopPackageVersion');
  }
  if (!/^[0-9a-f]{40}$/.test(manifest.forgeLoopGitCommit)) {
    throw new Error('Schema provenance has an invalid forgeLoopGitCommit');
  }
  if (manifest.protocolVersion !== 1) throw new Error('Unsupported schema provenance protocolVersion');
  if (typeof manifest.generatedAt !== 'string' || Number.isNaN(Date.parse(manifest.generatedAt))) {
    throw new Error('Schema provenance has an invalid generatedAt');
  }
  if (!manifest.schemas || typeof manifest.schemas !== 'object' || Array.isArray(manifest.schemas)) {
    throw new Error('Schema provenance is missing schemas');
  }
}
