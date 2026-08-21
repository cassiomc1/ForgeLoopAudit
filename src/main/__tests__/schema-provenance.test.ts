import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const manifestPath = 'schemas/provenance.json';

describe('trusted schema provenance', () => {
  it('matches every vendored schema byte-for-byte with its manifest hash', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      forgeLoopPackageVersion: string;
      forgeLoopGitCommit: string;
      protocolVersion: number;
      schemas: Record<string, { sha256: string; upstreamPath: string }>;
    };

    expect(manifest.forgeLoopPackageVersion).toBe('1.3.0');
    expect(manifest.forgeLoopGitCommit).toBe('19355e701e191d830c56d64e535835e925843bae');
    expect(manifest.protocolVersion).toBe(1);

    for (const [name, entry] of Object.entries(manifest.schemas)) {
      const bytes = readFileSync(`schemas/${name}`);
      const actual = createHash('sha256').update(bytes).digest('hex');
      expect(actual, name).toBe(entry.sha256);
      expect(entry.upstreamPath).toBe(`schemas/${name}`);
    }
  });
});
