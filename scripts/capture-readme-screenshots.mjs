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
    FORGELOOP_STUDIO_SMOKE: '1',
  },
});

try {
  const page = await app.firstWindow();
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: '*,:before,:after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }',
  });

  // Use the same named demo-project action exposed to users so the screenshot
  // shell identifies ForgeShop as a demo rather than a generic folder.
  await page.evaluate(() => window.forgeLoopStudio.openDemoProject());
  await expect(page.getByRole('heading', { name: 'Project Overview', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('region', { name: 'Demo project information' })).toContainText('ForgeShop');
  await expect(page.getByRole('region', { name: 'Demo project information' })).toContainText('errors are still real');
  const projectInformation = page.getByRole('region', { name: 'Project Information', exact: true });
  await expect(projectInformation).toContainText('Project Information');
  await expect(projectInformation).toContainText('Stale');
  await expect(projectInformation).toContainText('REVALIDATION_REQUIRED');

  // Select the documented boundary task through the real Tasks surface so the
  // Overview and Task Boundaries captures cannot depend on a hidden default.
  await openSurface(page, 'Tasks', 'Tasks');
  await page.getByRole('button', { name: /TASK-003/ }).click();
  await stabilize(page, 'Lifecycle Flow');
  await navigation(page, 'Overview').click();
  await stabilize(page, 'Project Overview');

  await capture(page, 'overview.png', 'Project Overview', async () => {
    await expect(page.getByRole('heading', { name: 'Task Boundaries', exact: true })).toBeVisible();
    await expect(page.getByText('TASK-003', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Task Boundaries' }).locator('text=/^(MISMATCH|UNAVAILABLE)$/')).toHaveCount(1);
    await expect(page.getByText('INVALID', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Tasks', 'Tasks');
  await capture(page, 'tasks.png', 'Tasks', async () => {
    for (const taskId of ['TASK-001', 'TASK-002', 'TASK-003', 'TASK-004', 'TASK-005', 'TASK-006']) {
      await expect(page.getByText(taskId, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Demo scenario', { exact: true })).toHaveCount(6);
  });

  await openSurface(page, 'Flow', 'Lifecycle Flow', 'TASK-004');
  await capture(page, 'lifecycle-flow.png', 'Lifecycle Flow', async () => {
    await expect(page.getByRole('combobox').first()).toHaveValue('TASK-004');
    await expect(page.getByText('BLOCKED', { exact: true })).toBeVisible();
    await expect(page.getByText('Optional Workspace Binding', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Contract', 'Contract Inspector', 'TASK-006');
  await capture(page, 'contract-inspector.png', 'Contract Inspector', async () => {
    await expect(page.getByText('Review the checkout flow for security weaknesses before integration ships.', { exact: true })).toBeVisible();
    await expect(page.getByText('Verification Requirements', { exact: true })).toBeVisible();
    await expect(page.getByText('Security scan reports no critical findings', { exact: true })).toBeVisible();
    await expect(page.getByText('Stop Conditions', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Evidence', 'Evidence Matrix', 'TASK-002');
  await capture(page, 'evidence-matrix.png', 'Evidence Matrix', async () => {
    await expect(page.getByRole('heading', { name: 'Verification Scope', exact: true })).toBeVisible();
    await expect(page.getByText('AUTO', { exact: true })).toBeVisible();
    await expect(page.getByText('CHANGED', { exact: true })).toBeVisible();
    await expect(page.getByText('not revision-range attestation coverage.', { exact: false })).toBeVisible();
  });

  await openSurface(page, 'Events', 'Event Ledger', 'TASK-004');
  await capture(page, 'event-ledger.png', 'Event Ledger', async () => {
    await expect(page.getByRole('status')).toContainText('Live updates enabled');
    await expect(page.getByText('HANDOFF_CREATED', { exact: true })).toBeVisible();
    await expect(page.getByText('TASK_BLOCKED', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Continuity', 'Continuity', 'TASK-004');
  await capture(page, 'continuity.png', 'Continuity', async () => {
    await expect(page.getByText('handoff-harness-a-to-b', { exact: true })).toBeVisible();
    await expect(page.getByText('Accepted — operational receipt only', { exact: true })).toBeVisible();
    await expect(page.getByText('consumer-forgeshop-harness-b', { exact: true })).toBeVisible();
    await expect(page.getByText('Immutable protocol snapshot — not review, completion, delegation, or authority evidence.', { exact: true })).toBeVisible();
  }, page.getByRole('heading', { name: 'Canonical Handoffs', exact: true }));

  await openSurface(page, 'Diagnostics', 'Diagnostics', 'TASK-004');
  await capture(page, 'diagnostics.png', 'Diagnostics', async () => {
    await expect(page.getByText('Canonical history, trace, reflection and trajectory signals', { exact: true })).toBeVisible();
    await expect(page.getByText('BLOCKED', { exact: true })).toBeVisible();
    await expect(page.getByText('Canonical trajectory metrics', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Actions', 'Actions', 'TASK-002');
  await capture(page, 'actions.png', 'Actions', async () => {
    await expect(page.getByText('action-cart-inspect', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('action-cart-repair', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('COMMIT_UNKNOWN', { exact: true })).toBeVisible();
    await expect(page.getByText('approval-cart-repair', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Policy', 'Policy', 'TASK-006');
  await capture(page, 'policy.png', 'Policy', async () => {
    await expect(page.getByText('Project capability policy', { exact: true })).toBeVisible();
    await expect(page.getByRole('combobox').first()).toHaveValue('TASK-006');
    await expect(page.getByText('REQUIRE_APPROVAL', { exact: true })).toBeVisible();
  });

  await openSurface(page, 'Settings', 'Settings');
  await capture(page, 'settings.png', 'Settings', async () => {
    await expect(page.getByText(`ForgeLoop Studio v${packageVersion}`, { exact: true })).toBeVisible();
    const protocolPanel = page.getByRole('heading', { name: 'ForgeLoop protocol', exact: true }).locator('..');
    await expect(protocolPanel).toContainText('1.10.0');
    await expect(protocolPanel).toContainText('Advisory context providers');
    await expect(protocolPanel).toContainText('Supported by ForgeLoop');
    await expect(protocolPanel).toContainText('INTEGRATION_V1');
  }, page.getByRole('heading', { name: 'ForgeLoop protocol', exact: true }));

  await openSurface(page, 'Tasks', 'Tasks');
  await page.getByRole('button', { name: /TASK-003/ }).click();
  await stabilize(page, 'Lifecycle Flow');
  await navigation(page, 'Overview').click();
  await stabilize(page, 'Project Overview');
  await capture(page, 'task-boundaries.png', 'Project Overview', async () => {
    const boundaries = page.getByRole('region', { name: 'Task Boundaries' });
    await expect(boundaries.getByRole('heading', { name: 'Task Boundaries', exact: true })).toBeVisible();
    await expect(boundaries.getByText('MISMATCH', { exact: true }).or(boundaries.getByText('UNAVAILABLE', { exact: true }))).toBeVisible();
    await expect(boundaries.getByText('INVALID', { exact: true })).toBeVisible();
  }, page.getByRole('heading', { name: 'Task Boundaries', exact: true }));
} finally {
  await app.close();
}

console.log(`Captured ${manifest.screenshots.length} ForgeLoop Studio README screenshots at ${width}x${height}.`);
