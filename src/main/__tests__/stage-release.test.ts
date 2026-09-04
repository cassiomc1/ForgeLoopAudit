import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

const script = join(process.cwd(), 'scripts', 'stage-release.mjs');

describe('stage-release', () => {
  it('stages only public Windows distributables and checksums exactly those files', () => {
    const root = mkdtempSync(join(tmpdir(), 'forgeloop-stage-release-'));
    try {
      const source = join(root, 'dist-electron');
      mkdirSync(source, { recursive: true });
      writeFileSync(join(source, 'ForgeLoopAudit Setup.exe'), 'setup');
      writeFileSync(join(source, 'ForgeLoopAudit Portable.exe'), 'portable');
      writeFileSync(join(source, 'ForgeLoopAudit Setup.exe.blockmap'), 'internal');
      writeFileSync(join(source, 'latest.yml'), 'internal');

      execFileSync(process.execPath, [script, 'windows'], { cwd: root });

      const staged = join(root, 'release-staging', 'windows');
      expect(readFileSync(join(staged, 'SHA256SUMS-windows'), 'utf8')).toMatch(/ForgeLoopAudit\.Setup\.exe/);
      expect(readFileSync(join(staged, 'SHA256SUMS-windows'), 'utf8')).toMatch(/ForgeLoopAudit\.Portable\.exe/);
      expect(readFileSync(join(staged, 'SHA256SUMS-windows'), 'utf8')).not.toMatch(/blockmap|latest\.yml/);
      expect(JSON.parse(readFileSync(join(staged, 'RELEASE-METADATA-windows.json'), 'utf8')).publicAssets).toEqual([
        'ForgeLoopAudit.Portable.exe',
        'ForgeLoopAudit.Setup.exe',
        'SHA256SUMS-windows',
        'RELEASE-EVIDENCE-ForgeLoopAudit.Portable.exe.json',
        'RELEASE-EVIDENCE-ForgeLoopAudit.Setup.exe.json',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([
    ['macos', ['ForgeLoopAudit-arm64.dmg', 'ForgeLoopAudit-x64.dmg', 'ForgeLoopAudit-arm64.zip', 'ForgeLoopAudit-x64.zip'], ['ForgeLoopAudit.exe']],
    ['linux', ['ForgeLoopAudit-x64.AppImage'], ['ForgeLoopAudit.tar.gz']],
  ])('stages only the public %s distributables', (platform, publicFiles, privateFiles) => {
    const root = mkdtempSync(join(tmpdir(), 'forgeloop-stage-release-'));
    try {
      const source = join(root, 'dist-electron');
      mkdirSync(source, { recursive: true });
      for (const name of publicFiles) writeFileSync(join(source, name), name);
      for (const name of privateFiles) writeFileSync(join(source, name), name);
      execFileSync(process.execPath, [script, platform], { cwd: root });
      const staged = join(root, 'release-staging', platform);
      expect(readFileSync(join(staged, `SHA256SUMS-${platform}`), 'utf8')).toContain(publicFiles[0].replaceAll(' ', '.'));
      expect(readFileSync(join(staged, `SHA256SUMS-${platform}`), 'utf8')).not.toContain(privateFiles[0]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
