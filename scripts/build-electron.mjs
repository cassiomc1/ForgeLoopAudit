import { build } from 'esbuild';
// @cassiomc1/forgeloop stays external so its ESM modules load from the
// bundled node_modules at runtime (the package reads source-relative config
// files through import.meta.url, which cannot survive a CJS bundle).
const shared = { bundle: true, platform: 'node', format: 'cjs', target: 'node20', sourcemap: true, absWorkingDir: process.cwd() };
await build({
  ...shared,
  entryPoints: ['src/main/app.ts'],
  outfile: 'dist/main/index.cjs',
  external: ['electron', 'chokidar', 'fsevents', '@cassiomc1/forgeloop'],
});
await build({
  ...shared,
  entryPoints: ['src/preload/index.ts'],
  outfile: 'dist/preload/index.cjs',
  external: ['electron'],
});
