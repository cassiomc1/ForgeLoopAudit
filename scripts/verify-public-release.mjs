import { readFileSync } from 'node:fs';
import { artifactArchitecture, loadReleaseMatrix, matchesMatrixEntry, parseChecksumManifest, PLATFORMS, SBOM_NAME } from './release-contracts.mjs';
import { assertCycloneDxSbom, compileEvidenceValidator, parseEvidenceJson, sha256Bytes, validateReleaseEvidence } from './release-evidence-validator.mjs';
import { assertEvidenceCommitMatchesTag } from './release-identity.mjs';

const [owner, repo, tag] = process.argv.slice(2);
if (!owner || !repo || !tag) throw new Error('Usage: node scripts/verify-public-release.mjs <owner> <repo> <tag>');
const token = process.env.GITHUB_TOKEN;
const headers = { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
const api = async (url) => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub request failed: ${response.status} ${url}`);
  return response;
};
const release = await (await api(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`)).json();
const tagCommitResponse = await (await api(`https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(tag)}`)).json();
const tagCommit = tagCommitResponse.sha?.toLowerCase();
if (!/^[a-f0-9]{40}$/.test(tagCommit ?? '')) throw new Error(`GitHub did not resolve ${tag} to a commit SHA`);
const assets = new Map(release.assets.map((asset) => [asset.name, asset.browser_download_url]));
const matrix = loadReleaseMatrix();
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const expectedVersion = tag.replace(/^v/, '');
const distributables = [...assets.keys()].filter((name) => /\.(dmg|zip|exe|AppImage)$/i.test(name));
const evidence = [...assets.keys()].filter((name) => name.startsWith('RELEASE-EVIDENCE-') && name.endsWith('.json'));
if (evidence.length !== distributables.length || evidence.some((name) => !distributables.includes(name.replace(/^RELEASE-EVIDENCE-/, '').replace(/\.json$/, '')))) throw new Error('Public release evidence does not exactly match distributables');
const expectedAssets = new Set([SBOM_NAME, ...PLATFORMS.map((platform) => `SHA256SUMS-${platform}`)]);
for (const name of distributables) {
  expectedAssets.add(name);
  expectedAssets.add(`RELEASE-EVIDENCE-${name}.json`);
}
if (assets.size !== expectedAssets.size) {
  const missing = [...expectedAssets].filter((name) => !assets.has(name));
  const extra = [...assets.keys()].filter((name) => !expectedAssets.has(name));
  throw new Error(`Public release ${tag} does not match the exact asset set; missing: ${missing.join(', ') || 'none'}; unexpected: ${extra.join(', ') || 'none'}`);
}

const downloaded = new Map();
for (const [name, url] of assets) downloaded.set(name, Buffer.from(await (await fetch(url)).arrayBuffer()));
const commitSet = new Set();
const validate = compileEvidenceValidator();
for (const platform of PLATFORMS) {
  const manifestName = `SHA256SUMS-${platform}`;
  if (!assets.has(manifestName)) throw new Error(`Release ${tag} is missing ${manifestName}`);
  const declared = parseChecksumManifest(downloaded.get(manifestName).toString('utf8'));
  const actual = distributables.filter((name) => platformFor(name) === platform).sort();
  const declaredNames = declared.map((entry) => entry.name).sort();
  if (JSON.stringify(actual) !== JSON.stringify(declaredNames)) throw new Error(`${platform}: checksum manifest does not exactly cover public distributables`);
  if (actual.length !== matrix[platform].length || matrix[platform].some((item) => actual.filter((name) => matchesMatrixEntry(platform, name, item)).length !== 1)) throw new Error(`${platform}: public asset matrix mismatch`);
  for (const entry of declared) {
    const body = downloaded.get(entry.name);
    if (!body) throw new Error(`${platform}: missing public asset ${entry.name}`);
    const actualHash = sha256Bytes(body);
    if (actualHash !== entry.hash) throw new Error(`Public checksum mismatch for ${entry.name}`);
    const evidenceName = `RELEASE-EVIDENCE-${entry.name}.json`;
    validateReleaseEvidence({
      evidenceName,
      evidence: parseEvidenceJson(evidenceName, downloaded.get(evidenceName).toString('utf8')),
      validate,
      artifactName: entry.name,
      actualSha256: actualHash,
      platform,
      architecture: artifactArchitecture(platform, entry.name),
      expectedVersion,
      expectedCommit: tagCommit,
    });
    commitSet.add(tagCommit);
  }
}
assertEvidenceCommitMatchesTag(commitSet, tagCommit);
assertCycloneDxSbom(parseEvidenceJson(SBOM_NAME, downloaded.get(SBOM_NAME).toString('utf8')), { name: pkg.name, version: expectedVersion });
console.log(`Public release verification passed for ${owner}/${repo}@${tag}: ${distributables.length} distributables, ${evidence.length} evidence files, exact asset set (${assets.size} assets), SBOM semantics verified`);

function platformFor(name) {
  if (/\.(dmg|zip)$/i.test(name)) return 'macos';
  if (/\.exe$/i.test(name)) return 'windows';
  if (/\.AppImage$/i.test(name)) return 'linux';
  throw new Error(`Unexpected public distributable: ${name}`);
}
