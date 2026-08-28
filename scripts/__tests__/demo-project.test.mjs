import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
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

test('demo executions include current ForgeLoop isolation provenance', () => {
  const { files } = generateDemoFiles();
  const executions = [...files.entries()]
    .filter(([path]) => /\/executions\/exec-.*\.json$/u.test(path))
    .map(([, content]) => JSON.parse(content));

  assert.ok(executions.some((execution) => (
    execution.executionIsolation === 'NATIVE_PROJECT'
    && execution.isolation?.mode === 'NATIVE_PROJECT'
  )));
  assert.ok(executions.some((execution) => (
    execution.executionIsolation === 'PROJECT_ISOLATED'
    && execution.isolation?.mode === 'PROJECT_ISOLATED'
  )));
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

test('demo represents every registered artifact category (17/17)', () => {
  const result = verifyDemoProject(DEMO_ROOT);
  const coverage = result.stats.artifactCoverage;
  assert.ok(coverage, 'verifier did not report artifact coverage');
  assert.deepEqual(coverage.missing, [], `demo is missing registered artifact categories: ${coverage.missing.join(', ')}`);
  assert.equal(coverage.represented, coverage.total, `expected ${coverage.total}/${coverage.total} artifact categories represented`);
});

test('runtime artifact registry and demo schema mapping share one source of truth', async () => {
  const { SCHEMA_FILES } = await import('../demo/fixtures.mjs');
  const registry = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'main', 'core', 'protocol', 'artifact-registry.json'), 'utf8'),
  );
  assert.deepEqual(SCHEMA_FILES, registry);
});
