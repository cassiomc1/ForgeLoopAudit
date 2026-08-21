import { flipFuses, FuseV1Options, FuseVersion } from '@electron/fuses';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || 'dist-electron';
for (const name of readdirSync(root)) {
  const appPath = join(root, name);
  const binary = join(appPath, 'Contents', 'MacOS', 'ForgeLoop Studio');
  if (!existsSync(binary)) continue;
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
