import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const readme = readFileSync('README.md', 'utf8');
const required = [`v${pkg.version}`, 'read-only', 'ForgeLoop', 'unsigned'];
const missing = required.filter((value) => !readme.includes(value));
if (missing.length) throw new Error(`README release facts missing: ${missing.join(', ')}`);
console.log(`Documentation conformance verified for ${pkg.version}`);
