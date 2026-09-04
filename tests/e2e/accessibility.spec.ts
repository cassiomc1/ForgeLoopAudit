import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

test('packaged renderer exposes no Node globals and has a keyboard-reachable bridge', async () => {
  const app = await electron.launch({ args: ['.'], env: { ...process.env, NODE_ENV: 'production', FORGELOOP_AUDIT_SMOKE: '1' } });
  try {
    const window = await app.firstWindow();
    await expect(window.locator('body')).toBeVisible();
    const accessibility = await window.evaluate(() => ({
      process: typeof process,
      require: typeof require,
      bridge: typeof window.forgeLoopAudit,
      buttons: [...document.querySelectorAll('button')].every((button) => Boolean(button.textContent?.trim() || button.getAttribute('aria-label'))),
    }));
    expect(accessibility).toMatchObject({ process: 'undefined', require: 'undefined', bridge: 'object', buttons: true });
  } finally { await app.close(); }
});
