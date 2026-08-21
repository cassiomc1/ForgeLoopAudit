import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] || 'release-staging';
for (const platform of ['macos', 'windows', 'linux']) {
  const path = join(dir, platform);
  const flat = !readdirSync(dir, { withFileTypes: true }).some((entry) => entry.isDirectory() && entry.name === platform);
  const assetDir = flat ? dir : path;
  const manifest = readFileSync(join(assetDir, `SHA256SUMS-${platform}`), 'utf8').trim().split('\n').filter(Boolean);
  const names = manifest.map((line) => line.split(/\s{2}/)[1]);
  if (manifest.length !== names.length) throw new Error(`${platform}: checksum count does not match staged assets`);
  for (const line of manifest) {
    const [expected, name] = line.split(/\s{2}/);
    const actual = createHash('sha256').update(readFileSync(join(assetDir, name))).digest('hex');
    if (actual !== expected) throw new Error(`${platform}: checksum mismatch for ${name}`);
  }
}
console.log('Release staging assets and checksums verified');
