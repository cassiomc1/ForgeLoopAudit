import { describe, expect, it } from 'vitest';
import { buildStudioDiagnostics } from '@main/core/diagnostics/diagnostics';

describe('local diagnostics', () => {
  it('returns an allowlisted, environment-independent view', () => {
    const diagnostics = buildStudioDiagnostics({ studioVersion: 'test', watcherStatus: 'active' });
    expect(diagnostics).toMatchObject({ studioVersion: 'test', watcherStatus: 'active' });
    expect(JSON.stringify(diagnostics)).not.toContain('SECRET');
    expect(diagnostics).not.toHaveProperty('env');
    expect(diagnostics).not.toHaveProperty('projectPath');
  });
});
