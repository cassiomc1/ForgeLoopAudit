import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { join } from 'node:path';

const DEMO_PROJECT = join(process.cwd(), 'demo');

test('bundled demo project renders every Studio surface', async () => {
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'production', FORGELOOP_STUDIO_SMOKE: '1', FORGELOOP_STUDIO_FIXTURE_PROJECT: DEMO_PROJECT },
  });
  try {
    const window = await app.firstWindow();

    await expect(window.getByRole('heading', { name: 'Project Overview' })).toBeVisible();
    await expect(window.getByText('3 of 6')).toBeVisible();

    await window.getByLabel('Main navigation').getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(window.locator('h1').filter({ hasText: 'Tasks' })).toBeVisible({ timeout: 5000 });
    for (const taskId of ['TASK-001', 'TASK-002', 'TASK-003', 'TASK-004', 'TASK-005', 'TASK-006']) {
      await expect(window.getByText(taskId)).toBeVisible();
    }
    await expect(window.getByText('COMPLETE').first()).toBeVisible();
    await expect(window.getByText('BLOCKED').first()).toBeVisible();

    await window.getByLabel('Main navigation').getByRole('button', { name: 'Events', exact: true }).click();
    await expect(window.locator('h1').filter({ hasText: 'Event Ledger' })).toBeVisible({ timeout: 5000 });
    await expect(window.getByText('TASK_CREATED').first()).toBeVisible();
    await window.getByRole('button', { name: 'Validate ledger' }).click();
    await expect(window.locator('body')).toContainText('Page schema: VALID');
    await expect(window.locator('body')).toContainText('Ledger chain: VALID');

    await window.getByLabel('Main navigation').getByRole('button', { name: 'Executions', exact: true }).click();
    await expect(window.locator('h1').filter({ hasText: 'Executions' })).toBeVisible({ timeout: 5000 });
    await expect(window.locator('body')).toContainText('Isolation information is persisted by ForgeLoop');
    await window.getByRole('combobox').selectOption('TASK-001');
    await expect(window.getByRole('button', { name: /exec-catalog-unit-tests/ })).toBeVisible({ timeout: 5000 });
    await expect(window.locator('body')).toContainText('PROJECT_ISOLATED');
    await window.getByRole('button', { name: /exec-catalog-unit-tests/ }).click();
    await expect(window.locator('body')).toContainText('Protocol project root');
    await expect(window.locator('body')).toContainText('Environment policy');
    await expect(window.getByRole('button', { name: /exec-catalog-typecheck/ })).toBeVisible();
    await expect(window.locator('body')).toContainText('NATIVE_PROJECT');
    await window.getByRole('button', { name: /exec-catalog-typecheck/ }).click();
    await expect(window.locator('body')).toContainText('Execution cwd');

    await window.getByLabel('Main navigation').getByRole('button', { name: 'Continuity', exact: true }).click();
    await expect(window.locator('h1').filter({ hasText: 'Continuity' })).toBeVisible({ timeout: 5000 });

    await window.getByLabel('Main navigation').getByRole('button', { name: 'Policy', exact: true }).click();
    await expect(window.locator('h1').filter({ hasText: 'Policy' })).toBeVisible({ timeout: 5000 });
  } finally {
    await app.close();
  }
});
