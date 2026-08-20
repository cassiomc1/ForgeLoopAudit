import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
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

const files = readdirSync(sourceDir)
  .filter((name) => {
    const path = join(sourceDir, name);
    if (!statSync(path).isFile()) return false;
    return allowed.has(name.slice(name.lastIndexOf('.'))) || name === `SHA256SUMS-${platform}`;
  });

if (files.length === 0) throw new Error(`No public ${platform} release assets found in ${sourceDir}`);
for (const name of files) copyFileSync(join(sourceDir, name), join(stageDir, name));

writeFileSync(join(stageDir, `RELEASE-METADATA-${platform}.json`), `${JSON.stringify({
  platform,
  windowsSigning: platform === 'windows' ? 'unsigned-preview' : 'not-applicable',
  publicAssets: files,
}, null, 2)}\n`);
