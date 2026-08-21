import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const workflow = (await readFile(new URL('../../.github/workflows/public-release-verification.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');

function stepBlock(pattern, description) {
  const match = pattern.exec(workflow);
  assert.ok(match, `public release verification workflow is missing ${description}`);
  return match[0];
}

test('verifies only published releases and explicit manual dispatches', () => {
  const trigger = stepBlock(/on:\s*\n\s+release:\s*\n\s+types:\s*\[published\]/, 'a release published trigger');
  assert.match(trigger, /release:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request|^\s+push:/m);
});

test('checks out exactly the released tag snapshot as the trust boundary', () => {
  const checkout = stepBlock(/uses: actions\/checkout@[^\n]+\n\s+with:\s*\n\s+ref:/, 'an explicit checkout of the released tag');
  assert.doesNotMatch(checkout, /github\.sha/);
  assert.match(workflow, /ref: \$\{\{ format\('refs\/tags\/\{0\}', inputs\.tag \|\| github\.event\.release\.tag_name\) \}\}/);
  assert.match(workflow, /persist-credentials:\s*false/);
});

test('verification consumes the release tag name from the event context', () => {
  const verify = stepBlock(/run: node scripts\/verify-public-release\.mjs[^\n]*/, 'the public verifier invocation');
  assert.match(verify, /"\$\{\{ github\.repository_owner \}\}"/);
  assert.match(verify, /"\$\{\{ github\.event\.repository\.name \}\}"/);
  assert.match(verify, /"\$\{\{ inputs\.tag \|\| github\.event\.release\.tag_name \}\}"/);
});

test('manual dispatch requires an explicit tag with no stale default', () => {
  const dispatch = stepBlock(/workflow_dispatch:\s*\n\s+inputs:\s*\n\s+tag:[\s\S]*?(?=\n\S|\n$)/, 'the manual dispatch tag input');
  assert.match(dispatch, /required:\s*true/);
  assert.doesNotMatch(dispatch, /default:/);
});

test('validates the requested tag shape before checkout and dependencies', () => {
  const guard = stepBlock(/- name: Validate requested release tag shape[\s\S]*?(?=- name:|- uses:)/, 'an early tag shape validation step');
  assert.match(guard, /v\[0-9\]\*/);
  const checkoutPos = workflow.indexOf('uses: actions/checkout@');
  const npmCiPos = workflow.indexOf('npm ci');
  assert.ok(workflow.indexOf('Validate requested release tag shape') < checkoutPos, 'tag validation must run before checkout');
});

test('pre-checkout validation does not require local git repository state', () => {
  const checkoutPos = workflow.indexOf('uses: actions/checkout@');
  const beforeCheckout = workflow.slice(0, checkoutPos);
  assert.doesNotMatch(beforeCheckout, /\bgit\s+ls-remote\b/);
  assert.doesNotMatch(beforeCheckout, /\bgit\s+rev-parse\b/);
  assert.doesNotMatch(beforeCheckout, /\bgit\s+remote\b/);
});

test('GITHUB_TOKEN is passed only to the verification step', () => {
  const envBlocks = workflow.match(/env:\s*\n\s+GITHUB_TOKEN:[^\n]*/g) ?? [];
  assert.equal(envBlocks.length, 1, 'GITHUB_TOKEN must be provided to exactly one step');
  const verifyStep = stepBlock(/- run: node scripts\/verify-public-release\.mjs[\s\S]*?GITHUB_TOKEN:/, 'the verification step carrying GITHUB_TOKEN');
  assert.match(verifyStep, /node scripts\/verify-public-release\.mjs/);
});
