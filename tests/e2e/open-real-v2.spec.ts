import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

const REAL_PROJECT = process.env.FORGELOOP_STUDIO_REAL_PROJECT ?? '';

test.skip(!REAL_PROJECT, 'FORGELOOP_STUDIO_REAL_PROJECT not set');

test('a real layout v2 project (manifest.json, no config.json) opens', async () => {
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      FORGELOOP_STUDIO_SMOKE: '1',
      FORGELOOP_STUDIO_FIXTURE_PROJECT: REAL_PROJECT,
    },
  });
  try {
    const window = await app.firstWindow();
    const errors: string[] = [];
    window.on('pageerror', (err) => errors.push(String(err)));

    // The project must open into the overview instead of surfacing the
    // "Path does not exist: .../config.json" failure.
    await expect(window.getByRole('heading', { name: 'Project Overview' })).toBeVisible({ timeout: 20_000 });
    await expect(window.getByText(/does not contain a ForgeLoop project/i)).toHaveCount(0);
    await expect(window.getByText(/Path does not exist/i)).toHaveCount(0);

    // Empty task state is valid for a freshly initialized project.
    await expect(window.getByLabel('Main navigation').getByRole('button', { name: 'Tasks', exact: true })).toBeVisible();

    expect(errors.filter((e) => /config\.json/i.test(e))).toEqual([]);
  } finally {
    await app.close();
  }
});
