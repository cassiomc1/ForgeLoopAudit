import { flipFuses, FuseV1Options, FuseVersion } from '@electron/fuses';
import electronPath from 'electron';

export default async function afterPack(context) {
  await flipFuses(electronPath, {
    version: FuseVersion.V1,
    strictlyRequireAllFuses: false,
    resetAdHocDarwinSignature: context.electronPlatformName === 'darwin' && context.arch === 1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  });
}
