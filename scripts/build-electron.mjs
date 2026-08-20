import { build } from 'esbuild';
const shared = { bundle: true, platform: 'node', target: 'es2022', sourcemap: true, absWorkingDir: process.cwd(), external: ['electron', 'chokidar', 'fsevents'] };
await build({ ...shared, entryPoints: ['src/main/app.ts'], outfile: 'dist/main/index.js' });
await build({ ...shared, entryPoints: ['src/preload/index.ts'], outfile: 'dist/preload/index.js' });
