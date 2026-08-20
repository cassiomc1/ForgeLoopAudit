import { build } from 'esbuild';
const shared = { bundle: true, platform: 'node', format: 'cjs', target: 'node20', sourcemap: true, absWorkingDir: process.cwd() };
await build({ ...shared, entryPoints: ['src/main/app.ts'], outfile: 'dist/main/index.cjs', external: ['electron', 'chokidar', 'fsevents'] });
await build({ ...shared, entryPoints: ['src/preload/index.ts'], outfile: 'dist/preload/index.cjs', external: ['electron'] });
