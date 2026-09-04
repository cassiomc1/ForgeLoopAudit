import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

test('renderer has a deterministic primary shell', async () => {
  const app = await electron.launch({ args: ['.'], env: { ...process.env, NODE_ENV: 'production', FORGELOOP_AUDIT_SMOKE: '1' } });
  try { const window = await app.firstWindow(); await expect(window).toHaveScreenshot('project-picker.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 }); } finally { await app.close(); }
});
