import { existsSync } from 'node:fs';
const required = ['dist/main/index.js', 'dist/preload/index.js', 'dist/renderer/index.html'];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) throw new Error(`Build output missing: ${missing.join(', ')}`);
