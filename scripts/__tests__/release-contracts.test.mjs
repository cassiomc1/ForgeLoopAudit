import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverPublicDistributables, parseChecksumManifest, assertReleaseCompleteness } from '../release-contracts.mjs';

test('rejects a checksum manifest that omits an actual distributable', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'forgeloop-release-'));
  await writeFile(join(dir, 'ForgeLoop.Studio-0.1.0-rc.3-arm64.dmg'), 'dmg');
  await writeFile(join(dir, 'ForgeLoop.Studio-0.1.0-rc.3-x64.dmg'), 'dmg');
  await writeFile(join(dir, 'SHA256SUMS-macos'), 'a'.repeat(64) + '  ForgeLoop.Studio-0.1.0-rc.3-arm64.dmg\n');
  assert.deepEqual(discoverPublicDistributables(dir, 'macos'), [
    'ForgeLoop.Studio-0.1.0-rc.3-arm64.dmg',
    'ForgeLoop.Studio-0.1.0-rc.3-x64.dmg',
  ]);
  const declared = parseChecksumManifest(await readFile(join(dir, 'SHA256SUMS-macos'), 'utf8'));
  assert.throws(() => assertReleaseCompleteness({
    platform: 'macos',
    assetDir: dir,
    declared,
    evidenceNames: new Set(),
    requireEvidence: false,
  }), /manifest does not exactly cover distributables/);
});

test('rejects duplicate checksum entries and path traversal', () => {
  assert.throws(() => parseChecksumManifest(`${'a'.repeat(64)}  app.AppImage\n${'a'.repeat(64)}  app.AppImage\n`), /duplicate/);
  assert.throws(() => parseChecksumManifest(`${'a'.repeat(64)}  ../app.AppImage\n`), /unsafe/);
});
