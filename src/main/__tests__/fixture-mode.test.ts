import { describe, expect, it } from 'vitest';
import { isFixtureProjectMode } from '../ipc/fixture-mode';

describe('fixture project mode', () => {
  it('stays disabled in packaged builds even when smoke variables are present', () => {
    expect(isFixtureProjectMode(true, {
      FORGELOOP_STUDIO_SMOKE: '1',
      FORGELOOP_STUDIO_FIXTURE_PROJECT: '/tmp/fixture-project',
    })).toBe(false);
  });
});
