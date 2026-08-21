import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveLedgerOutput } from '../generate-large-ledger-fixture.mjs';

test('uses the deterministic fixture path when --output is omitted', () => {
  const defaultOutput = 'tests/fixtures/large-project/events.ndjson';
  assert.equal(resolveLedgerOutput(['node', 'fixture.mjs', '--events', '2'], defaultOutput), defaultOutput);
});

test('uses the explicit output path when --output is provided', () => {
  assert.equal(
    resolveLedgerOutput(['node', 'fixture.mjs', '--output', '/tmp/events.ndjson'], 'default.ndjson'),
    '/tmp/events.ndjson'
  );
});
