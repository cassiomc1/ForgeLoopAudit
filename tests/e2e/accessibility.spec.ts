import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

test('packaged renderer exposes no Node globals and has a keyboard-reachable bridge', async () => {
  const app = await electron.launch({ args: ['.'], env: { ...process.env, NODE_ENV: 'production', FORGELOOP_STUDIO_SMOKE: '1' } });
  try {
    const window = await app.firstWindow();
    await expect(window.locator('body')).toBeVisible();
    const results = await new AxeBuilder({ page: window }).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
    expect(await window.evaluate(() => ({ process: typeof process, require: typeof require, bridge: typeof window.forgeLoopStudio }))).toEqual({ process: 'undefined', require: 'undefined', bridge: 'object' });
  } finally { await app.close(); }
});
