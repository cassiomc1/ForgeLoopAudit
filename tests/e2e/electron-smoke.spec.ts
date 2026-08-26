import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('built Electron app launches and exposes the preload bridge', async () => {
  const app = await electron.launch({ args: ['.'], env: { ...process.env, NODE_ENV: 'production', FORGELOOP_STUDIO_SMOKE: '1' } });
  try {
    const window = await app.firstWindow();
    await expect(window).toHaveTitle('ForgeLoop Studio');
    expect(await window.evaluate(() => typeof window.forgeLoopStudio)).toBe('object');
  } finally {
    await app.close();
  }
});

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]));
  }
  return value;
}

function createFixtureProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'forgeloop-studio-e2e-'));
  // Canonical ForgeLoop layout: directory name must be sha256(taskId).
  const fixtureKey = createHash('sha256').update('fixture-task').digest('hex');
  const taskDir = join(root, '.forgeloop', 'task-state', fixtureKey);
  mkdirSync(taskDir, { recursive: true });
  writeFileSync(join(root, '.forgeloop', 'config.json'), JSON.stringify({ schemaVersion: 1, protocolVersion: 1, complianceMode: 'strict' }));
  writeFileSync(join(taskDir, 'task.json'), JSON.stringify({
    schemaVersion: 1,
    protocolVersion: 1,
    taskId: 'fixture-task',
    taskKey: fixtureKey,
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    writeClaims: [],
  }));
  writeFileSync(join(taskDir, 'contract.json'), JSON.stringify({
    schemaVersion: 1,
    protocolVersion: 1,
    taskId: 'fixture-task',
    objective: 'Exercise the release-readiness surfaces',
    deliverables: ['Verified renderer flow'],
    constraints: [],
    risks: [],
    verification: [],
    successCriteria: ['All functional surfaces render'],
    stopConditions: [],
    unresolvedDecisions: [],
    sourceRefs: ['fixture'],
  }));
  writeFileSync(join(taskDir, 'work-state.json'), JSON.stringify({
    schemaVersion: 1,
    protocolVersion: 1,
    taskId: 'fixture-task',
    contractFingerprint: 'b'.repeat(64),
    repositoryFingerprint: { branch: 'main', head: 'c'.repeat(64) },
    phase: 'EXECUTING',
    selectedGuides: [],
    completedSteps: [],
    pendingSteps: [],
    checks: [],
    failures: [],
    blockers: [],
    lastUpdated: '2026-08-20T00:00:00.000Z',
  }));
  const event = { seq: 1, schemaVersion: 1, protocolVersion: 1, taskId: 'fixture-task', event: 'TASK_CREATED', at: '2026-08-20T00:00:00.000Z', previousHash: null };
  const hash = createHash('sha256').update(JSON.stringify(canonicalize(event))).digest('hex');
  writeFileSync(join(taskDir, 'events.ndjson'), `${JSON.stringify({ ...event, hash })}\n`);
  return root;
}

test('fixture project flows through the functional v0.1 renderer surfaces', async () => {
  const fixture = createFixtureProject();
  const app = await electron.launch({ args: ['.'], env: { ...process.env, NODE_ENV: 'production', FORGELOOP_STUDIO_SMOKE: '1', FORGELOOP_STUDIO_FIXTURE_PROJECT: fixture } });
  try {
    const window = await app.firstWindow();
    await expect(window.getByRole('heading', { name: 'Project Overview' })).toBeVisible();
    await expect(window.getByText('fixture-task').first()).toBeVisible();
    for (const page of [
      ['Tasks', 'Tasks'],
      ['Flow', 'Lifecycle Flow'],
      ['Contract', 'Contract Inspector'],
      ['Evidence', 'Evidence Matrix'],
      ['Events', 'Event Ledger'],
      ['Continuity', 'Continuity'],
      ['Policy', 'Policy'],
      ['Diagnostics', 'Diagnostics'],
      ['Actions', 'Actions'],
    ]) {
      await window.getByLabel('Main navigation').getByRole('button', { name: page[0], exact: true }).click();
      await expect(window.locator('h1').filter({ hasText: page[1] })).toBeVisible({ timeout: 5000 });
    }
    await window.getByLabel('Main navigation').getByRole('button', { name: 'Events', exact: true }).click();
    await expect(window.locator('h1').filter({ hasText: 'Event Ledger' })).toBeVisible({ timeout: 5000 });
    await window.getByRole('button', { name: 'Validate ledger', exact: true }).click();
    await expect(window.locator('body')).toContainText('Page schema: VALID');
  } finally {
    await app.close();
    rmSync(fixture, { recursive: true, force: true });
  }
});
