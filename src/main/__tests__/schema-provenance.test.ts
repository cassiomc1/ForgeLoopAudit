import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadSchemaProvenance } from '@main/core/protocol/schema-provenance';

const manifestPath = 'schemas/provenance.json';

describe('trusted schema provenance', () => {
  it('matches every vendored schema byte-for-byte with its manifest hash', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      forgeLoopPackageVersion: string;
      forgeLoopGitCommit: string;
      protocolVersion: number;
      schemas: Record<string, { sha256: string; upstreamPath: string }>;
    };

    expect(manifest.forgeLoopPackageVersion).toBe('1.5.0');
    expect(manifest.forgeLoopGitCommit).toBe('e938fa68f96b1daa19df97fd5f4c9a77ea928e0a');
    expect(manifest.protocolVersion).toBe(1);

    for (const [name, entry] of Object.entries(manifest.schemas)) {
      const bytes = readFileSync(`schemas/${name}`);
      const actual = createHash('sha256').update(bytes).digest('hex');
      expect(actual, name).toBe(entry.sha256);
      expect(entry.upstreamPath).toBe(`schemas/${name}`);
    }
  });

  it('loads the committed manifest as an app-owned protocol contract', () => {
    const manifest = loadSchemaProvenance('schemas');
    expect(manifest.forgeLoopPackageVersion).toBe('1.5.0');
    expect(Object.keys(manifest.schemas)).toHaveLength(19);
  });
});
