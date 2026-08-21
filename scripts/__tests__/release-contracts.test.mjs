import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artifactIsExpected, discoverPublicDistributables, matchesMatrixEntry, parseChecksumManifest, assertReleaseCompleteness } from '../release-contracts.mjs';
import { assertEvidenceCommitMatchesTag } from '../release-identity.mjs';

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

test('accepts evidence whose only commit matches the resolved lightweight tag commit', () => {
  assert.doesNotThrow(() => assertEvidenceCommitMatchesTag(new Set(['a'.repeat(40)]), 'a'.repeat(40)));
});

test('accepts evidence whose only commit matches the resolved annotated tag commit', () => {
  assert.doesNotThrow(() => assertEvidenceCommitMatchesTag(new Set(['b'.repeat(40)]), 'b'.repeat(40)));
});

test('rejects evidence that consistently points at a different tag commit', () => {
  assert.throws(
    () => assertEvidenceCommitMatchesTag(new Set(['c'.repeat(40)]), 'd'.repeat(40)),
    /does not match resolved tag commit/
  );
});

test('rejects evidence with inconsistent commit identities', () => {
  assert.throws(
    () => assertEvidenceCommitMatchesTag(new Set(['e'.repeat(40), 'f'.repeat(40)]), 'e'.repeat(40)),
    /inconsistent commit identities/
  );
});

test('classifies macOS artifacts by explicit architecture and target type', () => {
  assert.equal(matchesMatrixEntry('macos', 'ForgeLoop Studio-0.1.0-rc.3-arm64.dmg', { type: 'dmg', arch: 'arm64' }), true);
  assert.equal(matchesMatrixEntry('macos', 'ForgeLoop Studio-0.1.0-rc.3-x64.zip', { type: 'zip', arch: 'x64' }), true);
  assert.equal(artifactIsExpected('macos', 'ForgeLoop Studio-0.1.0-rc.3-x64.zip'), true);
});

test('classifies Windows Setup as NSIS and the plain executable as portable', () => {
  assert.equal(matchesMatrixEntry('windows', 'ForgeLoop Studio Setup 0.1.0-rc.3.exe', { type: 'nsis', arch: 'x64' }), true);
  assert.equal(matchesMatrixEntry('windows', 'ForgeLoop Studio 0.1.0-rc.3.exe', { type: 'portable', arch: 'x64' }), true);
  assert.equal(artifactIsExpected('windows', 'ForgeLoop Studio Setup 0.1.0-rc.3.exe'), true);
  assert.equal(artifactIsExpected('windows', 'ForgeLoop Studio 0.1.0-rc.3.exe'), true);
});
