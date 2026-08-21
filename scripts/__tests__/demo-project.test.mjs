import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { demoHasDrift } from '../generate-demo-project.mjs';
import { generateDemoFiles } from '../demo/write-demo-project.mjs';
import { verifyDemoProject } from '../demo/verifier.mjs';

const DEMO_ROOT = join(process.cwd(), 'demo');

test('demo generation is deterministic', () => {
  const first = generateDemoFiles();
  const second = generateDemoFiles();
  assert.equal(first.files.size, second.files.size);
  for (const [path, content] of first.files) {
    assert.ok(second.files.has(path), `second generation is missing ${path}`);
    assert.equal(second.files.get(path), content, `generation drift at ${path}`);
  }
});

test('committed demo matches generator output exactly', () => {
  const result = demoHasDrift();
  assert.equal(result.drift, false, `committed demo/ has drifted from the generator: ${result.reason}`);
});

test('demo passes full protocol verification', () => {
  const result = verifyDemoProject(DEMO_ROOT);
  assert.deepEqual(result.errors, []);
  assert.equal(result.stats.tasks, 6);
  assert.ok(result.stats.events >= 40 && result.stats.events <= 80, `expected 40-80 events, found ${result.stats.events}`);
  for (const phase of ['COMPLETE', 'VERIFYING', 'EXECUTING', 'BLOCKED', 'PLANNED']) {
    assert.ok(result.stats.phases.includes(phase), `expected phase ${phase} to be represented`);
  }
  assert.equal(result.stats.sessions, 2);
});

test('canonical demo contains no INVALID artifacts', () => {
  const result = verifyDemoProject(DEMO_ROOT);
  for (const error of result.errors) {
    assert.doesNotMatch(error, /INVALID|invalid JSON|schema/, error);
  }
});
