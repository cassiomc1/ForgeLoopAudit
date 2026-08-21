import { existsSync, readdirSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = normalize(process.argv[2] || 'dist-electron');
if (!existsSync(root)) throw new Error(`Packaged output not found: ${root}`);

function packagedApps(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name.endsWith('.app')) {
      if (existsSync(join(path, 'Contents', 'MacOS', 'ForgeLoop Studio'))) results.push({ path, platform: 'macOS' });
      continue;
    }
    if (entry.isFile() && entry.name === 'ForgeLoop Studio.exe') results.push({ path: dir, platform: 'Windows' });
    if (entry.isFile() && entry.name === 'forgeloop-studio' && dir.endsWith('linux-unpacked')) results.push({ path: dir, platform: 'Linux' });
    if (entry.isDirectory()) results.push(...packagedApps(path));
  }
  return results;
}

const candidates = packagedApps(root);
if (candidates.length === 0) throw new Error(`No supported packaged executable found under ${root}`);
const commonExpected = ['RunAsNode is Disabled', 'EnableNodeOptionsEnvironmentVariable is Disabled', 'EnableNodeCliInspectArguments is Disabled', 'OnlyLoadAppFromAsar is Enabled'];
for (const candidate of candidates) {
  const output = execFileSync('npx', ['--no-install', 'electron-fuses', 'read', '--app', candidate.path], { encoding: 'utf8' });
  const expected = candidate.platform === 'Linux' ? commonExpected : [...commonExpected, 'EnableEmbeddedAsarIntegrityValidation is Enabled'];
  for (const fuse of expected) if (!output.includes(fuse)) throw new Error(`Fuse assertion failed for ${candidate.platform} (${candidate.path}): ${fuse}\n${output}`);
  console.log(`Electron fuses verified: ${candidate.platform} (${candidate.path})`);
}
console.log(`Electron fuses verified for ${candidates.length} packaged executable(s)`);
