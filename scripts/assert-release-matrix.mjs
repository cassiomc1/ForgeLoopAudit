import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { artifactArchitecture, loadReleaseMatrix, matchesMatrixEntry } from './release-contracts.mjs';

const [platform, sourceDir = 'dist-electron'] = process.argv.slice(2);
const matrix = loadReleaseMatrix();
if (!matrix[platform]) throw new Error(`Usage: node scripts/assert-release-matrix.mjs <macos|windows|linux> [sourceDir]`);
const extensions = platform === 'macos' ? ['.dmg', '.zip'] : platform === 'windows' ? ['.exe'] : ['.AppImage'];
const actual = readdirSync(sourceDir).filter((name) => statSync(join(sourceDir, name)).isFile() && extensions.includes(name.slice(name.lastIndexOf('.')))).sort();
if (actual.length !== matrix[platform].length || matrix[platform].some((item) => actual.filter((name) => matchesMatrixEntry(platform, name, item)).length !== 1)) throw new Error(`${platform}: actual release artifacts do not match docs/releases/release-matrix.json: ${actual.join(', ')}`);
for (const name of actual) if (!existsSync(join(sourceDir, name)) || !['arm64', 'x64'].includes(artifactArchitecture(platform, name))) throw new Error(`${platform}: invalid artifact ${name}`);
console.log(`${platform}: release matrix verified (${actual.length} artifact(s))`);
