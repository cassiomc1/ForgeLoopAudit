import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

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
