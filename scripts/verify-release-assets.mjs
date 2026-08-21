import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artifactArchitecture, assertReleaseCompleteness, evidenceBelongsToPlatform, loadReleaseMatrix, parseChecksumManifest, SBOM_NAME } from './release-contracts.mjs';
import { assertCycloneDxSbom, compileEvidenceValidator, parseEvidenceJson, resolveBuildCommit, sha256Bytes, validateReleaseEvidence } from './release-evidence-validator.mjs';

const dir = process.argv[2] || 'release-assets';
const matrix = loadReleaseMatrix();
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
const validate = compileEvidenceValidator();
const expectedCommit = resolveBuildCommit();
const expectedWorkflowRunId = process.env.GITHUB_RUN_ID;

if (!existsSync(join(dir, SBOM_NAME))) throw new Error(`Missing ${SBOM_NAME}`);

const declaredAssets = [SBOM_NAME];
for (const platform of ['macos', 'windows', 'linux']) {
  const manifestName = `SHA256SUMS-${platform}`;
  const manifestPath = join(dir, manifestName);
  if (!existsSync(manifestPath)) throw new Error(`Missing ${manifestName}`);
  const declared = parseChecksumManifest(readFileSync(manifestPath, 'utf8'));
  const evidenceNames = new Set(readdirSync(dir).filter((name) => name.startsWith('RELEASE-EVIDENCE-') && name.endsWith('.json') && evidenceBelongsToPlatform(platform, name)));
  assertReleaseCompleteness({ platform, assetDir: dir, declared, evidenceNames, matrix });
  for (const { hash: expected, name } of declared) {
    const body = readFileSync(join(dir, name));
    const actualSha256 = sha256Bytes(body);
    if (actualSha256 !== expected) throw new Error(`${platform}: checksum mismatch for ${name}`);
    const evidenceName = `RELEASE-EVIDENCE-${name}.json`;
    const evidence = parseEvidenceJson(evidenceName, readFileSync(join(dir, evidenceName), 'utf8'));
    validateReleaseEvidence({
      evidenceName,
      evidence,
      validate,
      artifactName: name,
      actualSha256,
      platform,
      architecture: artifactArchitecture(platform, name),
      expectedVersion: pkg.version,
      expectedCommit,
      expectedWorkflowRunId,
    });
    declaredAssets.push(name, evidenceName);
  }
  declaredAssets.push(manifestName);
}
assertCycloneDxSbom(parseEvidenceJson(SBOM_NAME, readFileSync(join(dir, SBOM_NAME), 'utf8')), { name: pkg.name, version: pkg.version });

const entries = readdirSync(dir, { withFileTypes: true });
const directories = entries.filter((entry) => !entry.isFile()).map((entry) => entry.name);
if (directories.length > 0) throw new Error(`Assembled release bundle contains unexpected directories: ${directories.sort().join(', ')}`);
const actualAssets = entries.map((entry) => entry.name).sort();
const expectedAssets = declaredAssets.sort();
if (JSON.stringify(actualAssets) !== JSON.stringify(expectedAssets)) {
  const missing = expectedAssets.filter((name) => !actualAssets.includes(name));
  const extra = actualAssets.filter((name) => !expectedAssets.includes(name));
  throw new Error(`Assembled release bundle does not match the exact public asset set; missing: ${missing.join(', ') || 'none'}; unexpected: ${extra.join(', ') || 'none'}`);
}
console.log(`Release assets verified: exact matrix, checksums, semantic evidence bound to commit ${expectedCommit.slice(0, 12)}, CycloneDX SBOM, and exact public asset set (${actualAssets.length} files)`);
