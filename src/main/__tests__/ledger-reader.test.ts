import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PathBoundary } from '@main/security/path-boundary';
import { EventLedgerReader } from '@main/core/events/ledger-reader';

function makeLedger(count: number) {
  const root = mkdtempSync(join(tmpdir(), 'forgeloop-ledger-'));
  const task = join(root, '.forgeloop', 'task-state', 'task-1');
  mkdirSync(task, { recursive: true });
  const lines = Array.from({ length: count }, (_, index) => JSON.stringify({ seq: index + 1, schemaVersion: 1, protocolVersion: 1, taskId: 'task-1', event: 'STEP', at: new Date(0).toISOString(), previousHash: null, hash: `hash-${index + 1}` }));
  writeFileSync(join(task, 'events.ndjson'), `${lines.join('\n')}\n`);
  return root;
}

describe('EventLedgerReader', () => {
  it('paginates ledgers larger than the old 1000-line limit', () => {
    const reader = new EventLedgerReader(new PathBoundary(makeLedger(10000)));
    const page = reader.readEventsPaginated('task-1', undefined, 100);
    expect(page.events).toHaveLength(100);
    expect(page.hasMore).toBe(true);
    expect(page.totalCount).toBe(10000);
  });
});
