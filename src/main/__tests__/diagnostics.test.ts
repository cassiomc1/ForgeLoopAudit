import { describe, expect, it } from 'vitest';
import { buildStudioDiagnostics } from '@main/core/diagnostics/diagnostics';
import type { ForgeLoopCompatibilityMode } from '@shared/domain';

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
    ['INCOMPATIBLE', 'INCOMPATIBLE'],
  ] as const)('reports %s verbatim as the compatibility mode', (mode, expected) => {
    const diagnostics = buildStudioDiagnostics({ studioVersion: 'test', watcherStatus: 'active', forgeLoopCompatibilityMode: mode });
    expect(diagnostics.forgeLoopCompatibilityMode).toBe(expected);
  });

  it('offers no legacy CLI compatibility mode at all', () => {
    // There is no reliable explicit signal distinguishing a ForgeLoop 1.3
    // project from a 1.5 project at the artifact level, so the Studio must
    // never infer (and silently downgrade into) a legacy semantic mode.
    const modes: ForgeLoopCompatibilityMode[] = ['INTEGRATION_V1', 'ARTIFACT_ONLY', 'INCOMPATIBLE'];
    expect(modes).not.toContain('LEGACY_CLI_READ_ONLY');
  });

  it('defaults to ARTIFACT_ONLY when no mode was negotiated', () => {
    const diagnostics = buildStudioDiagnostics({ studioVersion: 'test', watcherStatus: 'active' });
    expect(diagnostics.forgeLoopCompatibilityMode).toBe('ARTIFACT_ONLY');
  });
});
