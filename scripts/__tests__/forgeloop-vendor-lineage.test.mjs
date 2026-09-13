import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('ForgeLoop vendor archive, lockfile, provenance, package contents and active docs share the 1.13.0 lineage', () => {
  const script = join(process.cwd(), 'scripts', 'verify-forgeloop-vendor-lineage.mjs');
  const output = execFileSync(process.execPath, [script], { cwd: process.cwd(), encoding: 'utf8' });
  assert.match(output, /ForgeLoop vendor lineage verified: @cassiomc1\/forgeloop@1\.13\.0/);
  assert.match(output, /4fbc9f1463c66f0250f46cb76bc4d0c389c8c83c/);
  assert.match(output, /packagedGuides=/);
});
