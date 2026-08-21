import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const packageVersion = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')).version;

test('Open Demo Project action opens the bundled ForgeShop project end-to-end', async () => {
  // Source-mode launch: no FORGELOOP_STUDIO_FIXTURE_PROJECT injection, so the
  // project can only appear through the real Project Picker → preload → IPC →
  // resolveBundledDemoPath → openProject pipeline.
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'production', FORGELOOP_STUDIO_SMOKE: '1' },
  });
  try {
    const window = await app.firstWindow();

    await expect(window.getByRole('heading', { name: 'ForgeLoop Studio' })).toBeVisible();
    await expect(window.getByRole('button', { name: 'Open Demo Project' })).toBeVisible();
    await expect(window.getByText(/Includes intentional COMPLETE, VERIFYING, EXECUTING, BLOCKED, and PLANNED scenarios/)).toBeVisible();
    await window.getByRole('button', { name: 'Open Demo Project' }).click();

    await expect(window.getByRole('heading', { name: 'Project Overview' })).toBeVisible({ timeout: 15_000 });
    await expect(window.getByText('3 of 6')).toBeVisible();

    // Persistent demo classification banner
    const banner = window.getByRole('region', { name: 'Demo project information' });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Demo scenario project');
    await expect(banner).toContainText('errors are still real');

    // Banner persists on other pages while the demo is open.
    await window.getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(window.locator('h1').filter({ hasText: 'Tasks' })).toBeVisible({ timeout: 5000 });
    await expect(banner).toBeVisible();

    for (const taskId of ['TASK-001', 'TASK-002', 'TASK-003', 'TASK-004', 'TASK-005', 'TASK-006']) {
      await expect(window.getByText(taskId)).toBeVisible();
    }
    // Intentional scenario labels are visible for known tasks; drift must not appear.
    await expect(window.getByText('Demo scenario', { exact: true })).toHaveCount(6);
    await expect(window.getByText('Demo drift')).toHaveCount(0);
    // Real validation semantics stay independent of the scenario label:
    // TASK-004 still shows its blocker count next to BLOCKED.
    const blockedRow = window.locator('button', { hasText: 'TASK-004' }).first();
    await expect(blockedRow).toContainText('BLOCKED');
    await window.getByText('TASK-004').click();
    await expect(window.locator('h1').filter({ hasText: 'Lifecycle Flow' })).toBeVisible({ timeout: 5000 });
    await expect(window.getByRole('combobox')).toHaveValue('TASK-004');

    await window.getByRole('button', { name: 'Continuity', exact: true }).click();
    await expect(window.locator('h1').filter({ hasText: 'Continuity' })).toBeVisible({ timeout: 5000 });

    await window.getByRole('button', { name: 'Policy', exact: true }).click();
    await expect(window.locator('h1').filter({ hasText: 'Policy' })).toBeVisible({ timeout: 5000 });

    // The visible Studio version must come from the runtime, matching package.json.
    await window.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(window.locator('body')).toContainText(`ForgeLoop Studio v${packageVersion}`);
  } finally {
    await app.close();
  }
});
