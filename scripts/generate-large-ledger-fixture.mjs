import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const count = Number(process.argv[process.argv.indexOf('--events') + 1] || 100000);
const output = process.argv[process.argv.indexOf('--output') + 1] || 'tests/fixtures/large-project/events.ndjson';
mkdirSync(dirname(output), { recursive: true });
let previousHash = null;
const lines = [];
for (let seq = 1; seq <= count; seq++) {
  const event = { seq, schemaVersion: 1, protocolVersion: 1, taskId: 'large-task', event: 'STEP', at: '1970-01-01T00:00:00.000Z', previousHash };
  const hash = `fixture-${seq}`;
  previousHash = hash;
  lines.push(JSON.stringify({ ...event, hash }));
}
writeFileSync(output, `${lines.join('\n')}\n`);
console.log(`Generated ${count} deterministic events at ${output}`);
