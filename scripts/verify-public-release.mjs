import { createHash } from 'node:crypto';

const [owner, repo, tag] = process.argv.slice(2);
if (!owner || !repo || !tag) throw new Error('Usage: node scripts/verify-public-release.mjs <owner> <repo> <tag>');
const token = process.env.GITHUB_TOKEN;
const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`, {
  headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
});
if (!response.ok) throw new Error(`GitHub release lookup failed: ${response.status}`);
const release = await response.json();
const assets = new Map(release.assets.map((asset) => [asset.name, asset.browser_download_url]));
const checksumAssets = [...assets.keys()].filter((name) => name.startsWith('SHA256SUMS-'));
if (checksumAssets.length === 0) throw new Error(`Release ${tag} has no checksum manifest`);
for (const checksumAsset of checksumAssets) {
  const checksums = await (await fetch(assets.get(checksumAsset))).text();
  for (const line of checksums.split('\n').filter(Boolean)) {
    const [expected, name] = line.split(/\s{2}/);
    const assetUrl = assets.get(name);
    if (!assetUrl) throw new Error(`Release ${tag} is missing checksum asset ${name}`);
    const body = Buffer.from(await (await fetch(assetUrl)).arrayBuffer());
    const actual = createHash('sha256').update(body).digest('hex');
    if (actual !== expected) throw new Error(`Public checksum mismatch for ${name}`);
    console.log(`Verified public asset ${name}`);
  }
}
for (const name of assets.keys()) {
  if (name.startsWith('RELEASE-EVIDENCE-') && name.endsWith('.json')) {
    const evidence = await (await fetch(assets.get(name))).json();
    if (evidence.signing !== 'unsigned-preview' || evidence.studioVersion !== tag.replace(/^v/, '')) throw new Error(`Invalid public evidence ${name}`);
  }
}
console.log(`Public release verification passed for ${owner}/${repo}@${tag}`);
