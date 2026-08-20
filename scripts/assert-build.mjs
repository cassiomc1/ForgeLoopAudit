import { existsSync } from 'node:fs';
const required = ['dist/main/index.cjs', 'dist/preload/index.cjs', 'dist/renderer/index.html'];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) throw new Error(`Build output missing: ${missing.join(', ')}`);
const packageJson = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8'));
if (packageJson.main !== 'dist/main/index.cjs') throw new Error(`Unexpected Electron main entry: ${packageJson.main}`);
