import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.argv[2] || 'dist-electron';
if (!existsSync(root)) throw new Error(`Packaged output not found: ${root}`);
const candidates = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.app')) candidates.push(path);
  }
}
walk(root);
if (candidates.length === 0) throw new Error(`No packaged macOS app found under ${root}`);
for (const appPath of candidates) {
  const output = execFileSync('npx', ['--no-install', 'electron-fuses', 'read', '--app', appPath], { encoding: 'utf8' });
  for (const expected of ['RunAsNode=off', 'EnableNodeOptionsEnvironmentVariable=off', 'EnableNodeCliInspectArguments=off', 'EnableEmbeddedAsarIntegrityValidation=on', 'OnlyLoadAppFromAsar=on']) {
    if (!output.includes(expected)) throw new Error(`Fuse assertion failed for ${appPath}: ${expected}\n${output}`);
  }
}
console.log(`Electron fuses verified for ${candidates.length} app(s)`);
