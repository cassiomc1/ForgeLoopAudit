import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { assertReleaseCompleteness, evidenceBelongsToPlatform, loadReleaseMatrix, parseChecksumManifest, SBOM_NAME } from './release-contracts.mjs';
const dir = process.argv[2] || 'release-staging';
const matrix = loadReleaseMatrix();
if (!existsSync(join(dir, SBOM_NAME))) throw new Error(`Missing ${SBOM_NAME}`);
for (const platform of ['macos', 'windows', 'linux']) {
  const path = join(dir, platform);
  const flat = !readdirSync(dir, { withFileTypes: true }).some((entry) => entry.isDirectory() && entry.name === platform);
  const assetDir = flat ? dir : path;
  const declared = parseChecksumManifest(readFileSync(join(assetDir, `SHA256SUMS-${platform}`), 'utf8'));
  const evidenceNames = new Set(readdirSync(assetDir).filter((name) => name.startsWith('RELEASE-EVIDENCE-') && name.endsWith('.json') && evidenceBelongsToPlatform(platform, name)));
  assertReleaseCompleteness({ platform, assetDir, declared, evidenceNames, matrix });
  for (const { hash: expected, name } of declared) {
    const actual = createHash('sha256').update(readFileSync(join(assetDir, name))).digest('hex');
    if (actual !== expected) throw new Error(`${platform}: checksum mismatch for ${name}`);
  }
}
console.log(`Release assets, exact matrix, evidence, checksums, and ${SBOM_NAME} verified`);
