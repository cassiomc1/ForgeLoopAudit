import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
// GitHub normalizes spaces in uploaded release asset names to dots. Stage the
// normalized names up front so published checksum manifests remain usable.
const stagedNames = new Map(distributables.map((name) => [name, name.replaceAll(' ', '.') ]));
for (const name of distributables) copyFileSync(join(sourceDir, name), join(stageDir, stagedNames.get(name)));

const checksumName = `SHA256SUMS-${platform}`;
const checksums = distributables.map((name) => {
  const stagedName = stagedNames.get(name);
  const digest = createHash('sha256').update(readFileSync(join(stageDir, stagedName))).digest('hex');
  return `${digest}  ${stagedName}`;
}).join('\n') + '\n';
writeFileSync(join(stageDir, checksumName), checksums);

for (const name of distributables) {
  execFileSync(process.execPath, [fileURLToPath(new URL('./generate-release-evidence.mjs', import.meta.url)), platform, join(stageDir, stagedNames.get(name)), stageDir], { stdio: 'inherit' });
}

writeFileSync(join(stageDir, `RELEASE-METADATA-${platform}.json`), `${JSON.stringify({
  platform,
  windowsSigning: platform === 'windows' ? 'unsigned-preview' : 'not-applicable',
  publicAssets: [...stagedNames.values(), checksumName, ...distributables.map((name) => `RELEASE-EVIDENCE-${stagedNames.get(name)}.json`)],
}, null, 2)}\n`);
