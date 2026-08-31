import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('ForgeLoop vendor archive, lockfile, provenance and active docs share the 1.7.0 lineage', () => {
  const script = join(process.cwd(), 'scripts', 'verify-forgeloop-vendor-lineage.mjs');
  const output = execFileSync(process.execPath, [script], { cwd: process.cwd(), encoding: 'utf8' });
  assert.match(output, /ForgeLoop vendor lineage verified: @cassiomc1\/forgeloop@1\.7\.0/);
  assert.match(output, /1eaae5cbb2046ef606d201161aa5abbbeddab153/);
});
