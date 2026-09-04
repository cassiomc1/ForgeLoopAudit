import { flipFuses, FuseV1Options, FuseVersion } from '@electron/fuses';
import { existsSync, readdirSync } from 'node:fs';
import { join, normalize } from 'node:path';

const root = normalize(process.argv[2] || 'dist-electron');
if (!existsSync(root)) throw new Error(`Packaged output not found: ${root}`);

function packagedExecutables(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name.endsWith('.app')) {
      const executable = join(path, 'Contents', 'MacOS', 'ForgeLoopAudit');
      if (existsSync(executable)) results.push({ executable, platform: 'macOS' });
      continue;
    }
    if (entry.isFile() && entry.name === 'ForgeLoopAudit.exe') results.push({ executable: path, platform: 'Windows' });
    if (entry.isFile() && entry.name === 'forgeloop-audit' && dir.endsWith('linux-unpacked')) results.push({ executable: path, platform: 'Linux' });
    if (entry.isDirectory()) results.push(...packagedExecutables(path));
  }
  return results;
}

const candidates = packagedExecutables(root);
if (candidates.length === 0) throw new Error(`No supported packaged Electron executable found under ${root}`);
for (const candidate of candidates) {
  await flipFuses(candidate.executable, {
    version: FuseVersion.V1,
    strictlyRequireAllFuses: false,
    resetAdHocDarwinSignature: candidate.platform === 'macOS',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  });
}
console.log(`Electron fuses applied to ${candidates.length} packaged executable(s): ${candidates.map(({ platform }) => platform).join(', ')}`);
