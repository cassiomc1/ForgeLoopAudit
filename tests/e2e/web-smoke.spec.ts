import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SERVER_INFO = join(process.cwd(), 'test-results', 'web-server.json');
const SMOKE_TASK_ID = 'TASK-001';

function serverInfo(): { bootstrapUrl: string; origin: string; projectPath: string } {
  return JSON.parse(readFileSync(SERVER_INFO, 'utf8')) as { bootstrapUrl: string; origin: string; projectPath: string };
}

test.use({ colorScheme: 'dark' });

test.beforeEach(async ({ page }) => {
  const response = await page.request.get(`${serverInfo().origin}/health`);
  expect(response.ok()).toBeTruthy();
});

test('local web host bootstraps a same-origin session and renders the demo', async ({ page }) => {
  await page.goto(serverInfo().bootstrapUrl);
  await expect(page).toHaveTitle('ForgeLoopAudit');
  await expect(page.getByRole('heading', { name: 'Audit Summary' })).toBeVisible();
  const projectResponse = await page.request.get(`${serverInfo().origin}/api/v1/project`);
  expect(projectResponse.ok()).toBeTruthy();
  const projectPayload = await projectResponse.json() as { data?: { detection?: { forgeLoopVersion?: string } } };
  expect(projectPayload.data?.detection?.forgeLoopVersion).toBe('1.11.1');
});

test('light and dark themes switch through the shadcn-style theme control', async ({ page }) => {
  await page.goto(serverInfo().bootstrapUrl);
  const toggle = page.getByRole('button', { name: /Switch to light theme/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: /Switch to dark theme/i })).toBeVisible();
});

test('web UI preserves the audit navigation and live watcher update', async ({ page }) => {
  const fixture = serverInfo().projectPath;
  try {
    await page.goto(serverInfo().bootstrapUrl);
    await expect(page.getByRole('heading', { name: 'Audit Summary' })).toBeVisible();
    for (const name of ['Tasks', 'Findings', 'Evidence', 'Quality', 'Policy & Trust', 'Audit History', 'Reports', 'Repository Search', 'Diagnostics', 'Settings']) {
      await page.getByLabel('Main navigation').getByRole('button', { name, exact: true }).click();
      await expect(page.locator('h1'), `Expected a page heading after opening ${name}`).toBeVisible();
    }
    await page.getByLabel('Main navigation').getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(page.getByText(SMOKE_TASK_ID, { exact: true }).first()).toBeVisible();
    await page.getByText(SMOKE_TASK_ID, { exact: true }).first().click();
    await page.getByLabel('Task detail navigation').getByRole('button', { name: 'Events', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Event Ledger' })).toBeVisible();
    await page.getByRole('button', { name: 'Validate ledger', exact: true }).click();
    await expect(page.getByText('Page schema: VALID')).toBeVisible();
    appendLiveEvent(fixture, SMOKE_TASK_ID, 'WEB_SMOKE_UPDATE');
    await expect(page.getByText('WEB_SMOKE_UPDATE')).toBeVisible({ timeout: 10_000 });
  } finally {
    // The webServer fixture owns and removes this temporary copy.
  }
});

function appendLiveEvent(projectRoot: string, taskId: string, eventName: string): void {
  const eventPath = join(projectRoot, '.forgeloop', 'task-state', createHash('sha256').update(taskId).digest('hex'), 'events.ndjson');
  const lines = readFileSync(eventPath, 'utf8').trim().split('\n').filter(Boolean);
  const previous = JSON.parse(lines.at(-1) || '{}') as { seq: number; hash: string };
  const event = { seq: previous.seq + 1, schemaVersion: 1, protocolVersion: 1, taskId, event: eventName, at: new Date().toISOString(), previousHash: previous.hash, details: { source: 'web-smoke-test' } };
  const hash = createHash('sha256').update(JSON.stringify(canonicalize(event))).digest('hex');
  appendFileSync(eventPath, `${JSON.stringify({ ...event, hash })}\n`);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]));
  return value;
}
