import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
const scenario = process.argv.includes('--scenario') ? process.argv[process.argv.indexOf('--scenario') + 1] : 'build';
const start = performance.now();
if (scenario === 'ledger') spawnSync(process.execPath, ['scripts/generate-large-ledger-fixture.mjs', '--events', '100000'], { stdio: 'ignore' });
const durationMs = Math.round(performance.now() - start);
const result = { scenario: scenario === 'ledger' ? 'ledger-100000-events' : scenario, durationMs, peakRssBytes: process.memoryUsage().rss };
console.log(JSON.stringify(result));
