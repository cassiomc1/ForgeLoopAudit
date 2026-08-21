import { flipFuses, FuseV1Options, FuseVersion } from '@electron/fuses';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || 'dist-electron';
const apps = [];
function findApps(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const appPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name.endsWith('.app')) apps.push(appPath);
    else if (entry.isDirectory()) findApps(appPath);
  }
}
findApps(root);
for (const appPath of apps) {
  await flipFuses(appPath, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: true,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  });
}
console.log(`Electron fuses applied under ${root}`);
