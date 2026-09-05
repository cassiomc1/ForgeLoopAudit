import { _electron as electron } from 'playwright';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const screenDir = join(root, 'screen');
const manifest = JSON.parse(readFileSync(join(screenDir, 'manifest.json'), 'utf8'));
const width = manifest.viewport.width;
const height = manifest.viewport.height;
const packageVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function navigation(page, label) {
  return page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: label, exact: true });
}

async function stabilize(page, heading) {
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('region', { name: 'Demo project information' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Loading(?: canonical)?|Loading events\.\.\./)).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(200);
  const viewport = page.viewportSize();
  assertCondition(viewport?.width === width && viewport?.height === height, `Expected ${width}x${height} viewport, got ${viewport?.width}x${viewport?.height}`);
  const bodyText = await page.locator('body').innerText();
  assertCondition(!/(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)/u.test(bodyText), 'Screenshot page contains a local user path');
  assertCondition(!bodyText.includes('Demo drift'), 'Screenshot page contains demo drift');
}

async function openSurface(page, label, heading, taskId) {
  await navigation(page, label).click();
  await stabilize(page, heading);
  if (taskId) {
    const selector = page.getByRole('combobox').first();
    await selector.selectOption(taskId);
    await expect(selector).toHaveValue(taskId);
    await page.waitForTimeout(200);
  }
  await page.locator('main').evaluate((element) => element.scrollTo(0, 0));
  await stabilize(page, heading);
}

async function capture(page, file, heading, assertion, scrollTarget) {
  if (scrollTarget) {
    await scrollTarget.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
  }
  await assertion();
  await page.screenshot({ path: join(screenDir, file), animations: 'disabled' });
}

const app = await electron.launch({
  args: ['.'],
  env: {
    ...process.env,
    NODE_ENV: 'production',
    FORGELOOP_AUDIT_SMOKE: '1',
  },
});

try {
  const page = await app.firstWindow();
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: '*,:before,:after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }',
  });

  // Click the same named demo-project action exposed to users so the screenshot
  // shell identifies ForgeShop as a demo rather than a generic folder, and so the
  // renderer performs its own post-open audit load. Calling the preload API
  // directly leaves the UI on the `project-opened` reset, which sets audit state
  // to null and renders "Canonical audit unavailable" with a "Retry audit" button.
  await page.getByRole('button', { name: 'Open Demo Project', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Audit Summary', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('region', { name: 'Demo project information' })).toContainText('ForgeShop');
  await expect(page.getByRole('region', { name: 'Demo project information' })).toContainText('errors are still real');
  await page.getByRole('button', { name: 'Run audit', exact: true }).click();
  await expect(page.getByText(/Audit score|Score unavailable/)).toBeVisible({ timeout: 15_000 });

  await capture(page, 'audit-summary.png', 'Audit Summary', async () => {
    await expect(page.getByText('Integrity', { exact: true })).toBeVisible();
    await expect(page.getByText('Completion readiness', { exact: true })).toBeVisible();
    await expect(page.getByText('Audit coverage', { exact: true })).toBeVisible();
    await expect(page.getByText(/Audit score|Score unavailable/)).toBeVisible();
  });

  await openSurface(page, 'Findings', 'Findings');
  await capture(page, 'findings.png', 'Findings', async () => {
    await expect(page.getByText('Canonical ForgeLoop results and explicitly labelled auditor observations.', { exact: true })).toBeVisible();
    await expect(page.getByRole('combobox').first()).toBeVisible();
  });

  await openSurface(page, 'Tasks', 'Tasks');
  await capture(page, 'task-audit.png', 'Tasks', async () => {
    for (const taskId of ['TASK-001', 'TASK-002', 'TASK-003', 'TASK-004', 'TASK-005', 'TASK-006']) {
      await expect(page.getByText(taskId, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Demo scenario', { exact: true })).toHaveCount(6);
    await expect(page.getByText(/Audit (VALID|INCOMPLETE|STALE|INVALID|UNKNOWN)/).first()).toBeVisible();
  });

  await openSurface(page, 'Evidence', 'Evidence Matrix', 'TASK-002');
  await capture(page, 'evidence.png', 'Evidence Matrix', async () => {
    await expect(page.getByRole('heading', { name: 'Verification Scope', exact: true })).toBeVisible();
    await expect(page.getByText('AUTO', { exact: true })).toBeVisible();
    await expect(page.getByText('CHANGED', { exact: true })).toBeVisible();
    await expect(page.getByText('not revision-range attestation coverage.', { exact: false })).toBeVisible();
  });

  await openSurface(page, 'Quality', 'Engineering Quality', 'TASK-001');
  await capture(page, 'quality.png', 'Engineering Quality', async () => {
    await expect(page.getByText('Canonical Structural Quality projection; ForgeLoopAudit never runs a provider.', { exact: true })).toBeVisible();
    await expect(page.getByText(/Structural quality unavailable|Current status/)).toBeVisible();
  });

  await openSurface(page, 'Policy & Trust', 'Policy & Trust', 'TASK-006');
  await capture(page, 'policy-trust.png', 'Policy & Trust', async () => {
    await expect(page.getByText('Canonical policy, ownership boundaries and evidence trust signals for the selected task.', { exact: true })).toBeVisible();
    await expect(page.getByText('Trust boundary projections', { exact: true })).toBeVisible();
    await expect(page.getByText('Operational receipts only; never evidence.', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Audit History', 'Audit History');
  await page.getByRole('button', { name: 'Save baseline', exact: true }).click();
  await expect(page.getByText('Baseline saved.', { exact: true })).toBeVisible({ timeout: 15_000 });
  await capture(page, 'history-diff.png', 'Audit History', async () => {
    await expect(page.getByText('Manual snapshots are stored in application data, outside the audited project.', { exact: true })).toBeVisible();
    await expect(page.getByText('Save baseline', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Reports', 'Reports');
  await capture(page, 'report.png', 'Reports', async () => {
    await expect(page.getByText('Deterministic reports generated from already-read audit data.', { exact: true })).toBeVisible();
    await expect(page.getByText('Reports include ForgeLoop provenance, audit rules, timestamp, HEAD, fingerprint and [C]/[D]/[A] trust labels. The audited .forgeloop directory is protected by default.', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Diagnostics', 'Diagnostics', 'TASK-004');
  await capture(page, 'diagnostics.png', 'Diagnostics', async () => {
    await expect(page.getByText('Canonical history, trace, reflection and trajectory signals', { exact: true })).toBeVisible();
    await expect(page.getByText('BLOCKED', { exact: true })).toBeVisible();
    await expect(page.getByText('Canonical trajectory metrics', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Settings', 'Settings');
  await capture(page, 'settings.png', 'Settings', async () => {
    await expect(page.getByText(`ForgeLoopAudit v${packageVersion}`, { exact: true })).toBeVisible();
    const protocolPanel = page.getByRole('heading', { name: 'ForgeLoop protocol', exact: true }).locator('..');
    await expect(protocolPanel).toContainText('1.10.0');
    await expect(protocolPanel).toContainText('Advisory context providers');
    await expect(protocolPanel).toContainText('Supported by ForgeLoop');
    await expect(protocolPanel).toContainText('INTEGRATION_V1');
  }, page.getByRole('heading', { name: 'ForgeLoop protocol', exact: true }));

} finally {
  await app.close();
}

console.log(`Captured ${manifest.screenshots.length} ForgeLoopAudit README screenshots at ${width}x${height}.`);
