import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const workflow = (await readFile(new URL('../../.github/workflows/release.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');

function jobBlock(name) {
  const match = new RegExp(`\\n  ${name}:\\n([\\s\\S]*?)(?=\\n  [a-z][a-z-]*:\\n|$)`).exec(workflow);
  assert.ok(match, `workflow is missing ${name} job`);
  return match[1];
}

test('manual rehearsal assembles and verifies the combined release bundle', () => {
  const assemble = jobBlock('assemble');
  assert.match(assemble, /needs: \[macos, windows, linux\]/);
  assert.doesNotMatch(assemble, /startsWith\(github\.ref, 'refs\/tags\/'\)/);
  assert.match(assemble, /uses: actions\/download-artifact@[^\n]+[\s\S]*?pattern: forgeloop-audit-\*/);
  assert.match(assemble, /merge-multiple: true/);
  assert.match(assemble, /npm sbom --sbom-format cyclonedx --sbom-type application > release-assets\/SBOM-cyclonedx\.json/);
  assert.match(assemble, /node scripts\/verify-release-assets\.mjs release-assets/);
  assert.match(assemble, /name: forgeloop-audit-assembled/);
});

test('assemble drops staging-only release metadata before verification and upload', () => {
  const assemble = jobBlock('assemble');
  const dropIndex = assemble.indexOf('RELEASE-METADATA');
  assert.ok(dropIndex >= 0, 'assemble job must remove staging-only RELEASE-METADATA files from the public bundle');
  const sbomIndex = assemble.indexOf('npm sbom');
  const verifyIndex = assemble.indexOf('node scripts/verify-release-assets.mjs');
  const uploadIndex = assemble.indexOf('forgeloop-audit-assembled');
  assert.ok(dropIndex < sbomIndex, 'metadata removal must happen before SBOM generation');
  assert.ok(dropIndex < verifyIndex, 'metadata removal must happen before bundle verification');
  assert.ok(dropIndex < uploadIndex, 'metadata removal must happen before artifact upload');
});

test('tag-only publish consumes the verified assembled bundle', () => {
  const publish = jobBlock('publish');
  assert.match(publish, /needs: \[assemble\]/);
  assert.match(publish, /if: \$\{\{ startsWith\(github\.ref, 'refs\/tags\/'\) \}\}/);
  assert.match(publish, /pattern: forgeloop-audit-assembled/);
  assert.match(publish, /merge-multiple: true/);
  assert.doesNotMatch(publish, /pattern: forgeloop-audit-\*/);
  assert.match(publish, /softprops\/action-gh-release@/);
});

test('assemble binds the generated SBOM application identity to the package name before verification', () => {
  const assemble = jobBlock('assemble');
  const generateIndex = assemble.indexOf('npm sbom');
  const normalizeIndex = assemble.indexOf('node scripts/normalize-release-sbom.mjs');
  const verifyIndex = assemble.indexOf('node scripts/verify-release-assets.mjs');
  assert.ok(generateIndex >= 0, 'assemble job must generate the CycloneDX lockfile SBOM');
  assert.ok(normalizeIndex > generateIndex, 'SBOM normalization must happen right after generation');
  assert.match(assemble, /normalize-release-sbom\.mjs release-assets\/SBOM-cyclonedx\.json/);
  assert.ok(verifyIndex > normalizeIndex, 'SBOM normalization must happen before bundle verification');
});
