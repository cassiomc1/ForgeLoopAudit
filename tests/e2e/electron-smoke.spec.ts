import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { createHash } from 'node:crypto';
import { appendFileSync, cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEMO_PROJECT = join(process.cwd(), 'demo');

test('built Electron app launches and exposes the preload bridge', async () => {
  const app = await electron.launch({ args: ['.'], env: { ...process.env, NODE_ENV: 'production', FORGELOOP_AUDIT_SMOKE: '1' } });
  try {
    const window = await app.firstWindow();
    await expect(window).toHaveTitle('ForgeLoopAudit');
    expect(await window.evaluate(() => typeof window.forgeLoopAudit)).toBe('object');
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
  const root = mkdtempSync(join(tmpdir(), 'forgeloop-audit-e2e-'));
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

function taskKey(taskId: string): string {
  return createHash('sha256').update(taskId).digest('hex');
}

function appendLiveEvent(projectRoot: string, taskId: string, eventName: string): void {
  const eventPath = join(projectRoot, '.forgeloop', 'task-state', taskKey(taskId), 'events.ndjson');
  const lines = readFileSync(eventPath, 'utf8').trim().split('\n').filter(Boolean);
  const previous = JSON.parse(lines.at(-1) || '{}') as { seq: number; hash: string };
  const event = {
    seq: previous.seq + 1,
    schemaVersion: 1,
    protocolVersion: 1,
    taskId,
    event: eventName,
    at: new Date().toISOString(),
    previousHash: previous.hash,
    details: { source: 'electron-live-watcher-test' },
  };
  const hash = createHash('sha256').update(JSON.stringify(canonicalize(event))).digest('hex');
  appendFileSync(eventPath, `${JSON.stringify({ ...event, hash })}\n`);
}

function addLiveExecution(projectRoot: string, taskId: string): void {
  const taskDir = join(projectRoot, '.forgeloop', 'task-state', taskKey(taskId), 'executions');
  const sourcePath = join(taskDir, 'exec-checkout-integration-tests.json');
  const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as Record<string, unknown>;
  writeFileSync(join(taskDir, 'exec-live-audit.json'), JSON.stringify({
    ...source,
    executionId: 'exec-live-audit',
    checkId: 'live-audit',
    requirement: 'Live execution updates appear in ForgeLoopAudit',
    argv: ['npm', 'run', 'live-audit'],
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
  }));
}

test('fixture project flows through auditor-first surfaces and task-detail drill-downs', async () => {
  const fixture = createFixtureProject();
  const app = await electron.launch({ args: ['.'], env: { ...process.env, NODE_ENV: 'production', FORGELOOP_AUDIT_SMOKE: '1', FORGELOOP_AUDIT_FIXTURE_PROJECT: fixture } });
  try {
    const window = await app.firstWindow();
    await expect(window.getByRole('heading', { name: 'Audit Summary' })).toBeVisible();
    const auditButton = window.getByRole('button', { name: /Run audit|Retry audit/, exact: true });
    if (await auditButton.count() > 0) {
      await auditButton.click();
      await expect(window.getByText(/Audit coverage|Score unavailable/)).toBeVisible({ timeout: 10_000 });
    }
    for (const page of [
      ['Tasks', 'Tasks'],
      ['Findings', 'Findings'],
      ['Evidence', 'Evidence Matrix'],
      ['Quality', 'Engineering Quality'],
      ['Policy & Trust', 'Policy & Trust'],
      ['Audit History', 'Audit History'],
      ['Reports', 'Reports'],
      ['Diagnostics', 'Diagnostics'],
      ['Settings', 'Settings'],
    ]) {
      await window.getByLabel('Main navigation').getByRole('button', { name: page[0], exact: true }).click();
      await expect(window.locator('h1').filter({ hasText: page[1] })).toBeVisible({ timeout: 5000 });
    }
    await window.getByLabel('Main navigation').getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(window.getByText('fixture-task').first()).toBeVisible();
    await window.getByText('fixture-task').first().click();
    await expect(window.locator('h1').filter({ hasText: 'Task Audit' })).toBeVisible({ timeout: 5000 });
    const detailNavigation = window.getByLabel('Task detail navigation');
    for (const page of [
      ['Contract', 'Contract Inspector'],
      ['Evidence', 'Evidence Matrix'],
      ['Lifecycle', 'Lifecycle Flow'],
      ['Events', 'Event Ledger'],
      ['Continuity', 'Continuity'],
      ['Executions', 'Executions'],
      ['Actions', 'Actions'],
      ['Boundaries', 'Project Overview'],
      ['Audit', 'Task Audit'],
    ]) {
      await detailNavigation.getByRole('button', { name: page[0], exact: true }).click();
      await expect(window.locator('h1').filter({ hasText: page[1] })).toBeVisible({ timeout: 5000 });
    }
    await detailNavigation.getByRole('button', { name: 'Events', exact: true }).click();
    await expect(window.locator('h1').filter({ hasText: 'Event Ledger' })).toBeVisible({ timeout: 5000 });
    await window.getByRole('button', { name: 'Validate ledger', exact: true }).click();
    await expect(window.locator('body')).toContainText('Page schema: VALID');
  } finally {
    await app.close();
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('demo exposes the 1.6.4 boundary surfaces without mutation controls', async () => {
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'production', FORGELOOP_AUDIT_SMOKE: '1', FORGELOOP_AUDIT_FIXTURE_PROJECT: DEMO_PROJECT },
  });
  try {
    const window = await app.firstWindow();
    await expect(window.getByRole('heading', { name: 'Audit Summary' })).toBeVisible();
    const auditButton = window.getByRole('button', { name: /Run audit|Retry audit/, exact: true });
    if (await auditButton.count() > 0) await auditButton.click();

    await window.getByLabel('Main navigation').getByRole('button', { name: 'Tasks', exact: true }).click();
    await window.getByText('TASK-003').click();
    await expect(window.locator('h1').filter({ hasText: 'Task Audit' })).toBeVisible();
    const detailNavigation = window.getByLabel('Task detail navigation');
    await detailNavigation.getByRole('button', { name: 'Boundaries', exact: true }).click();
    await expect(window.getByRole('heading', { name: 'Workspace Binding' })).toBeVisible();
    await expect(window.getByText('MISMATCH', { exact: true })).toBeVisible();
    await expect(window.getByRole('heading', { name: 'Responsibility' })).toBeVisible();
    await expect(window.getByText('INVALID', { exact: true })).toBeVisible();

    await window.getByLabel('Main navigation').getByRole('button', { name: 'Tasks', exact: true }).click();
    await window.getByText('TASK-004').click();
    await window.getByLabel('Task detail navigation').getByRole('button', { name: 'Continuity', exact: true }).click();
    await expect(window.getByRole('heading', { name: 'Canonical Handoffs' })).toBeVisible();
    await expect(window.getByText('handoff-harness-a-to-b')).toBeVisible();
    await expect(window.getByText(/Immutable protocol snapshot — not review, completion, delegation, or authority evidence/)).toBeVisible();

    await window.getByLabel('Main navigation').getByRole('button', { name: 'Evidence', exact: true }).click();
    await expect(window.getByRole('heading', { name: 'Verification Scope' })).toBeVisible();
    await window.getByRole('combobox').selectOption('TASK-002');
    await expect(window.getByText('CHANGED', { exact: true })).toBeVisible();
    await expect(window.getByText(/not revision-range attestation coverage/)).toBeVisible();
    await window.getByRole('combobox').selectOption('TASK-001');
    await expect(window.getByRole('heading', { name: 'Code Attestation' })).toBeVisible();
    await expect(window.getByText(/Status: DISABLED/)).toBeVisible();
    await expect(window.getByText(/does not claim security, authorship, or bug-free code/)).toBeVisible();
    await expect(window.getByRole('button', { name: /workspace-bind|handoff-create|responsibility-set|verify-scope|attestation-create/i })).toHaveCount(0);
  } finally {
    await app.close();
  }
});

test('live watcher updates event and execution surfaces after monitored changes', async () => {
  const fixture = mkdtempSync(join(tmpdir(), 'forgeloop-audit-live-e2e-'));
  cpSync(DEMO_PROJECT, fixture, { recursive: true });
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'production', FORGELOOP_AUDIT_SMOKE: '1', FORGELOOP_AUDIT_FIXTURE_PROJECT: fixture },
  });
  try {
    const window = await app.firstWindow();
    await expect(window.getByRole('heading', { name: 'Audit Summary' })).toBeVisible();

    await window.getByLabel('Main navigation').getByRole('button', { name: 'Tasks', exact: true }).click();
    await window.getByText('TASK-004').click();
    await window.getByLabel('Task detail navigation').getByRole('button', { name: 'Events', exact: true }).click();
    await expect(window.getByRole('heading', { name: 'Event Ledger' })).toBeVisible();
    await window.getByRole('combobox').selectOption('TASK-004');
    await expect(window.getByText('TASK_BLOCKED', { exact: true })).toBeVisible();
    appendLiveEvent(fixture, 'TASK-004', 'LIVE_AUDIT_EVENT');
    await expect(window.getByText('LIVE_AUDIT_EVENT', { exact: true })).toBeVisible({ timeout: 5000 });
    await window.getByLabel('Task detail navigation').getByRole('button', { name: 'Boundaries', exact: true }).click();
    const projectInformation = window.getByRole('region', { name: 'Project Information', exact: true });
    await expect(projectInformation).toContainText('event-appended');
    await expect(projectInformation).toContainText('TASK-004');

    await window.getByLabel('Task detail navigation').getByRole('button', { name: 'Executions', exact: true }).click();
    await expect(window.getByRole('heading', { name: 'Executions' })).toBeVisible();
    await window.getByRole('combobox').selectOption('TASK-003');
    addLiveExecution(fixture, 'TASK-003');
    await expect(window.getByRole('button', { name: /exec-live-audit/ })).toBeVisible({ timeout: 5000 });
    await window.getByLabel('Task detail navigation').getByRole('button', { name: 'Boundaries', exact: true }).click();
    await expect(window.getByRole('region', { name: 'Project Information', exact: true })).toContainText('execution-changed');
    await expect(window.getByRole('region', { name: 'Project Information', exact: true })).toContainText('TASK-003');
  } finally {
    await app.close();
    rmSync(fixture, { recursive: true, force: true });
  }
});
