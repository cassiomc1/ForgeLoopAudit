import { flipFuses, FuseV1Options, FuseVersion } from '@electron/fuses';
export default async function afterPack(context) {
  if (process.env.FORGELOOP_SMOKE_NO_FUSES === '1') {
    console.warn('Skipping Electron fuse mutation only for explicit local smoke diagnosis');
    return;
  }
  const packagedExecutable = context.electronPlatformName === 'darwin'
    ? `${context.appOutDir}/ForgeLoopAudit.app/Contents/MacOS/ForgeLoopAudit`
    : context.electronPlatformName === 'win32'
      ? `${context.appOutDir}/ForgeLoopAudit.exe`
      : `${context.appOutDir}/forgeloop-audit`;
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
