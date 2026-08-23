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

describe('compatibility mode reporting', () => {
  it.each([
    ['INTEGRATION_V1', 'INTEGRATION_V1'],
    ['ARTIFACT_ONLY', 'ARTIFACT_ONLY'],
    ['LEGACY_CLI_READ_ONLY', 'LEGACY_CLI_READ_ONLY'],
    ['INCOMPATIBLE', 'INCOMPATIBLE'],
  ] as const)('reports %s verbatim as the compatibility mode', (mode, expected) => {
    const diagnostics = buildStudioDiagnostics({ studioVersion: 'test', watcherStatus: 'active', forgeLoopCompatibilityMode: mode });
    expect(diagnostics.forgeLoopCompatibilityMode).toBe(expected);
  });

  it('defaults to ARTIFACT_ONLY when no mode was negotiated', () => {
    const diagnostics = buildStudioDiagnostics({ studioVersion: 'test', watcherStatus: 'active' });
    expect(diagnostics.forgeLoopCompatibilityMode).toBe('ARTIFACT_ONLY');
  });
});
