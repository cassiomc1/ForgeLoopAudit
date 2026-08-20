import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const platform = process.argv[2];
const allowedPlatforms = new Set(['macos', 'windows', 'linux']);
if (!allowedPlatforms.has(platform)) {
  throw new Error(`Usage: node scripts/stage-release.mjs <${[...allowedPlatforms].join('|')}>`);
}

const sourceDir = 'dist-electron';
const stageDir = join('release-staging', platform);
const allowed = platform === 'macos' ? new Set(['.dmg', '.zip']) : platform === 'windows' ? new Set(['.exe']) : new Set(['.AppImage']);

if (!existsSync(sourceDir)) throw new Error(`Missing ${sourceDir}`);
rmSync(stageDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });

const distributables = readdirSync(sourceDir)
  .filter((name) => {
    const path = join(sourceDir, name);
    if (!statSync(path).isFile()) return false;
    return allowed.has(name.slice(name.lastIndexOf('.')));
  })
  .sort();

if (distributables.length === 0) throw new Error(`No public ${platform} release assets found in ${sourceDir}`);
for (const name of distributables) copyFileSync(join(sourceDir, name), join(stageDir, name));

const checksumName = `SHA256SUMS-${platform}`;
const checksums = distributables.map((name) => {
  const digest = createHash('sha256').update(readFileSync(join(stageDir, name))).digest('hex');
  return `${digest}  ${name}`;
}).join('\n') + '\n';
writeFileSync(join(stageDir, checksumName), checksums);

writeFileSync(join(stageDir, `RELEASE-METADATA-${platform}.json`), `${JSON.stringify({
  platform,
  windowsSigning: platform === 'windows' ? 'unsigned-preview' : 'not-applicable',
  publicAssets: [...distributables, checksumName],
}, null, 2)}\n`);
