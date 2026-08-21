import Ajv from 'ajv';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { artifactArchitecture, loadReleaseMatrix, matchesMatrixEntry, parseChecksumManifest, SBOM_NAME } from './release-contracts.mjs';

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
const assets = new Map(release.assets.map((asset) => [asset.name, asset.browser_download_url]));
const matrix = loadReleaseMatrix();
const distributables = [...assets.keys()].filter((name) => /\.(dmg|zip|exe|AppImage)$/i.test(name));
const evidence = [...assets.keys()].filter((name) => name.startsWith('RELEASE-EVIDENCE-') && name.endsWith('.json'));
if (assets.size === 0 || !assets.has(SBOM_NAME)) throw new Error(`Release ${tag} is missing assets or ${SBOM_NAME}`);
const expectedEvidence = new Set(distributables.map((name) => `RELEASE-EVIDENCE-${name}.json`));
if (evidence.length !== distributables.length || evidence.some((name) => !expectedEvidence.has(name))) throw new Error('Public release evidence does not exactly match distributables');

const downloaded = new Map();
for (const [name, url] of assets) downloaded.set(name, Buffer.from(await (await fetch(url)).arrayBuffer()));
const commitSet = new Set();
const validator = new Ajv({ allErrors: true }).compile(JSON.parse(readFileSync('docs/releases/release-evidence.schema.json', 'utf8')));
for (const platform of ['macos', 'windows', 'linux']) {
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
    const actualHash = createHash('sha256').update(body).digest('hex');
    if (actualHash !== entry.hash) throw new Error(`Public checksum mismatch for ${entry.name}`);
    const evidenceName = `RELEASE-EVIDENCE-${entry.name}.json`;
    const item = JSON.parse(downloaded.get(evidenceName).toString('utf8'));
    if (!validator(item)) throw new Error(`${evidenceName}: invalid evidence`);
    if (item.artifact !== entry.name || item.sha256 !== actualHash || item.platform !== platform || item.architecture !== artifactArchitecture(platform, entry.name)) throw new Error(`${evidenceName}: evidence is not bound to downloaded artifact`);
    if (item.studioVersion !== tag.replace(/^v/, '') || item.signing !== 'unsigned-preview') throw new Error(`${evidenceName}: version/signing mismatch`);
    commitSet.add(item.gitCommit);
  }
}
if (commitSet.size !== 1) throw new Error('Public release evidence has inconsistent commit identities');
JSON.parse(downloaded.get(SBOM_NAME).toString('utf8'));
console.log(`Public release verification passed for ${owner}/${repo}@${tag}: ${distributables.length} distributables, ${evidence.length} evidence files, SBOM present`);

function platformFor(name) {
  if (/\.(dmg|zip)$/i.test(name)) return 'macos';
  if (/\.exe$/i.test(name)) return 'windows';
  if (/\.AppImage$/i.test(name)) return 'linux';
  throw new Error(`Unexpected public distributable: ${name}`);
}
