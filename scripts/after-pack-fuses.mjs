import { flipFuses, FuseV1Options, FuseVersion } from '@electron/fuses';
export default async function afterPack(context) {
  const packagedExecutable = context.electronPlatformName === 'darwin'
    ? `${context.appOutDir}/ForgeLoop Studio.app/Contents/MacOS/ForgeLoop Studio`
    : context.electronPlatformName === 'win32'
      ? `${context.appOutDir}/ForgeLoop Studio.exe`
      : `${context.appOutDir}/forgeloop-studio`;
  await flipFuses(packagedExecutable, {
    version: FuseVersion.V1,
    strictlyRequireAllFuses: false,
    resetAdHocDarwinSignature: context.electronPlatformName === 'darwin',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  });
}
