import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLATFORMS = ['macos', 'windows', 'linux'];
export const MATRIX_PATH = fileURLToPath(new URL('../docs/releases/release-matrix.json', import.meta.url));
export const SBOM_NAME = 'SBOM-cyclonedx.json';

export function loadReleaseMatrix(path = MATRIX_PATH) {
  const matrix = JSON.parse(readFileSync(path, 'utf8'));
  for (const platform of PLATFORMS) {
    if (!Array.isArray(matrix[platform]) || matrix[platform].length === 0) throw new Error(`Release matrix missing ${platform}`);
    for (const item of matrix[platform]) {
      if (!item || typeof item.type !== 'string' || !['arm64', 'x64'].includes(item.arch)) throw new Error(`Invalid ${platform} release matrix entry`);
    }
  }
  return matrix;
}

function extensionFor(platform) {
  return platform === 'macos' ? ['.dmg', '.zip'] : platform === 'windows' ? ['.exe'] : ['.AppImage'];
}

export function evidenceBelongsToPlatform(platform, evidenceName) {
  const distributableName = evidenceName.replace(/^RELEASE-EVIDENCE-/, '').replace(/\.json$/, '').toLowerCase();
  return extensionFor(platform).some((extension) => distributableName.endsWith(extension.toLowerCase()));
}

export function discoverPublicDistributables(assetDir, platform) {
  const extensions = extensionFor(platform);
  return readdirSync(assetDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extensions.includes(entry.name.slice(entry.name.lastIndexOf('.'))))
    .map((entry) => entry.name)
    .sort();
}

export function parseChecksumManifest(text) {
  const entries = text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) throw new Error(`Invalid checksum manifest line ${index + 1}`);
    const name = match[2];
    if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') throw new Error(`unsafe checksum asset name: ${name}`);
    return { hash: match[1], name };
  });
  const names = new Set();
  for (const entry of entries) if (names.has(entry.name)) throw new Error(`duplicate checksum entry: ${entry.name}`); else names.add(entry.name);
  return entries;
}

export function assertReleaseCompleteness({ platform, assetDir, declared, evidenceNames = new Set(), requireEvidence = true, matrix = loadReleaseMatrix() }) {
  const actual = discoverPublicDistributables(assetDir, platform);
  const declaredNames = declared.map((entry) => entry.name).sort();
  if (JSON.stringify(declaredNames) !== JSON.stringify(actual)) throw new Error(`${platform}: manifest does not exactly cover distributables`);
  const expected = matrix[platform];
  if (actual.length !== expected.length) throw new Error(`${platform}: expected ${expected.length} distributables, found ${actual.length}`);
  for (const entry of declared) {
    if (!existsSync(join(assetDir, entry.name))) throw new Error(`${platform}: checksum points to absent file ${entry.name}`);
    if (requireEvidence && !evidenceNames.has(`RELEASE-EVIDENCE-${entry.name}.json`)) throw new Error(`${platform}: missing evidence for ${entry.name}`);
  }
  if (requireEvidence && [...evidenceNames].some((name) => !declaredNames.includes(name.replace(/^RELEASE-EVIDENCE-/, '').replace(/\.json$/, '')))) throw new Error(`${platform}: evidence does not have a matching distributable`);
  for (const item of expected) {
    const matches = actual.filter((name) => matchesMatrixEntry(platform, name, item));
    if (matches.length !== 1) throw new Error(`${platform}: expected exactly one ${item.arch} ${item.type} artifact, found ${matches.length}`);
  }
  return actual;
}

export function matchesMatrixEntry(platform, artifactName, item) {
  const lower = artifactName.toLowerCase();
  if (artifactArchitecture(platform, artifactName) !== item.arch) return false;
  if (platform === 'macos') return lower.endsWith(`.${item.type.toLowerCase()}`);
  if (platform === 'linux') return lower.endsWith('.appimage');
  return item.type === 'portable' ? !lower.includes('setup') : lower.includes('setup');
}

export function artifactArchitecture(platform, artifactName) {
  if (platform === 'macos') {
    const lower = artifactName.toLowerCase();
    if (lower.includes('arm64')) return 'arm64';
    if (lower.includes('x64') || lower.includes('x86_64')) return 'x64';
    throw new Error(`Cannot determine macOS artifact architecture from ${artifactName}`);
  }
  return 'x64';
}

export function artifactIsExpected(platform, artifactName, matrix = loadReleaseMatrix()) {
  return matrix[platform].some((item) => matchesMatrixEntry(platform, artifactName, item));
}
