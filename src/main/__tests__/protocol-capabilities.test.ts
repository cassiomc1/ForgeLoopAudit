import { describe, it, expect } from 'vitest';
import {
  normalizeCanonicalProtocolInfo,
  negotiateCompatibilityMode,
} from '@main/core/protocol/protocol-capabilities';

function validCapabilities(overrides: Record<string, unknown> = {}) {
  return {
    packageVersion: '1.5.0',
    protocolVersion: 1,
    integrationApiVersion: 1,
    executorParity: true,
    features: {
      taskClaimRecovery: {
        version: 1,
        durableRecoveryState: true,
        explicitResume: true,
        validatedClaimProjection: true,
      },
    },
    resources: [
      'protocol/info',
      'project/tasks',
      'task/status',
      'task/ownership',
      'task/contract',
      'task/continuity',
    ],
    ...overrides,
  };
}

function validProtocolInfo(overrides: Record<string, unknown> = {}) {
  return {
    packageVersion: '1.5.0',
    protocolVersion: 1,
    readsProtocol: [1],
    compatibility: {
      protocolVersion: 1,
      schemaVersion: 1,
      ...overrides,
    },
  };
}

describe('core/protocol/protocol-capabilities', () => {
  describe('normalizeCanonicalProtocolInfo', () => {
    it('reads schemaVersion from the compatibility block only', () => {
      const normalized = normalizeCanonicalProtocolInfo(validProtocolInfo());
      expect(normalized).not.toBeNull();
      expect(normalized?.schemaVersion).toBe(1);
      expect(normalized?.protocolVersion).toBe(1);
      expect(normalized?.packageVersion).toBe('1.5.0');
    });

    it('regression: works without any top-level schemaVersion field', () => {
      const raw = validProtocolInfo() as Record<string, unknown>;
      expect(raw.schemaVersion).toBeUndefined();
      const normalized = normalizeCanonicalProtocolInfo(raw);
      expect(normalized?.schemaVersion).toBe(1);
    });

    it('returns null when the compatibility block is missing', () => {
      expect(normalizeCanonicalProtocolInfo({ protocolVersion: 1 })).toBeNull();
    });

    it('returns null for non-object input', () => {
      expect(normalizeCanonicalProtocolInfo(null)).toBeNull();
      expect(normalizeCanonicalProtocolInfo(undefined)).toBeNull();
      expect(normalizeCanonicalProtocolInfo('bogus')).toBeNull();
    });
  });

  describe('negotiateCompatibilityMode', () => {
    it('selects INTEGRATION_V1 when protocol, schema and capabilities are valid', () => {
      const result = negotiateCompatibilityMode({
        protocolInfo: normalizeCanonicalProtocolInfo(validProtocolInfo()),
        capabilities: validCapabilities(),
      });
      expect(result.mode).toBe('INTEGRATION_V1');
      expect(result.reason).toBeUndefined();
    });

    it('rejects unknown protocol versions', () => {
      const result = negotiateCompatibilityMode({
        protocolInfo: normalizeCanonicalProtocolInfo(validProtocolInfo({ protocolVersion: 2 })),
        capabilities: validCapabilities(),
      });
      expect(result.mode).toBe('INCOMPATIBLE');
      expect(result.reason).toBe('UNSUPPORTED_PROTOCOL_VERSION');
    });

    it('rejects unknown schema versions from the compatibility block', () => {
      const result = negotiateCompatibilityMode({
        protocolInfo: normalizeCanonicalProtocolInfo(validProtocolInfo({ schemaVersion: 2 })),
        capabilities: validCapabilities(),
      });
      expect(result.mode).toBe('INCOMPATIBLE');
      expect(result.reason).toBe('UNSUPPORTED_SCHEMA_VERSION');
    });

    it('degrades to ARTIFACT_ONLY when the Integration API is unavailable', () => {
      const result = negotiateCompatibilityMode({
        protocolInfo: normalizeCanonicalProtocolInfo(validProtocolInfo()),
        capabilities: null,
      });
      expect(result.mode).toBe('ARTIFACT_ONLY');
      expect(result.reason).toBe('INTEGRATION_UNAVAILABLE');
    });

    it('fails closed on capability drift when the Integration API version differs', () => {
      const result = negotiateCompatibilityMode({
        protocolInfo: normalizeCanonicalProtocolInfo(validProtocolInfo()),
        capabilities: validCapabilities({ integrationApiVersion: 2 }),
      });
      expect(result.mode).toBe('INCOMPATIBLE');
      expect(result.reason).toBe('CAPABILITY_DRIFT');
    });

    it('fails closed when executor parity is broken', () => {
      const result = negotiateCompatibilityMode({
        protocolInfo: normalizeCanonicalProtocolInfo(validProtocolInfo()),
        capabilities: validCapabilities({ executorParity: false }),
      });
      expect(result.mode).toBe('INCOMPATIBLE');
      expect(result.reason).toBe('CAPABILITY_DRIFT');
    });

    it('fails closed when taskClaimRecovery capability is missing', () => {
      const result = negotiateCompatibilityMode({
        protocolInfo: normalizeCanonicalProtocolInfo(validProtocolInfo()),
        capabilities: validCapabilities({
          features: {},
        }),
      });
      expect(result.mode).toBe('INCOMPATIBLE');
      expect(result.reason).toBe('CAPABILITY_DRIFT');
    });

    it('fails closed when durable recovery features are not declared', () => {
      const result = negotiateCompatibilityMode({
        protocolInfo: normalizeCanonicalProtocolInfo(validProtocolInfo()),
        capabilities: validCapabilities({
          features: {
            taskClaimRecovery: {
              version: 1,
              durableRecoveryState: false,
              explicitResume: true,
              validatedClaimProjection: true,
            },
          },
        }),
      });
      expect(result.mode).toBe('INCOMPATIBLE');
      expect(result.reason).toBe('CAPABILITY_DRIFT');
    });

    it('fails closed when required resources are absent', () => {
      const result = negotiateCompatibilityMode({
        protocolInfo: normalizeCanonicalProtocolInfo(validProtocolInfo()),
        capabilities: validCapabilities({
          resources: ['protocol/info', 'project/tasks'],
        }),
      });
      expect(result.mode).toBe('INCOMPATIBLE');
      expect(result.reason).toBe('CAPABILITY_DRIFT');
    });

    it('degrades to ARTIFACT_ONLY when protocol info cannot be verified', () => {
      const result = negotiateCompatibilityMode({
        protocolInfo: null,
        capabilities: validCapabilities(),
      });
      expect(result.mode).toBe('ARTIFACT_ONLY');
      expect(result.reason).toBe('INTEGRATION_UNAVAILABLE');
    });
  });
});
