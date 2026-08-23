import type { ForgeLoopCapabilitiesSummary } from '@main/core/integration/types';
import type { ForgeLoopCompatibilityMode } from '@shared/domain';

export type { ForgeLoopCompatibilityMode };

export type NegotiationFailure =
  | 'UNSUPPORTED_PROTOCOL_VERSION'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'CAPABILITY_DRIFT'
  | 'INTEGRATION_UNAVAILABLE';

export interface CanonicalProtocolInfo {
  protocolVersion: number;
  schemaVersion: number;
  packageVersion: string | null;
}

// Compatibility version axes are independent: never compare one axis
// against another axis's constant.
const SUPPORTED_PROTOCOL_VERSION = 1;
const SUPPORTED_SCHEMA_VERSION = 1;
const SUPPORTED_INTEGRATION_API_VERSION = 1;
const SUPPORTED_TASK_CLAIM_RECOVERY_VERSION = 1;

const REQUIRED_RESOURCES = Object.freeze([
  'protocol/info',
  'project/tasks',
  'task/status',
  'task/ownership',
  'task/contract',
  'task/continuity',
]);

/**
 * Normalize the canonical `protocol-info` integration resource.
 *
 * ForgeLoop 1.5 reports schema compatibility exclusively under
 * `compatibility.schemaVersion`; the resource has NO top-level
 * `schemaVersion`. This normalizer is the only sanctioned access path so no
 * caller can regress to reading the nonexistent top-level field.
 */
export function normalizeCanonicalProtocolInfo(
  raw: unknown,
): CanonicalProtocolInfo | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const compatibility = record.compatibility;
  if (typeof compatibility !== 'object' || compatibility === null) return null;
  const compat = compatibility as Record<string, unknown>;

  const protocolVersion = compat.protocolVersion;
  const schemaVersion = compat.schemaVersion;
  if (typeof protocolVersion !== 'number' || typeof schemaVersion !== 'number') {
    return null;
  }

  return {
    protocolVersion,
    schemaVersion,
    packageVersion: typeof record.packageVersion === 'string' ? record.packageVersion : null,
  };
}

export interface CapabilityNegotiationInput {
  protocolInfo: CanonicalProtocolInfo | null;
  capabilities: ForgeLoopCapabilitiesSummary | null;
}

export interface CapabilityNegotiationResult {
  mode: ForgeLoopCompatibilityMode;
  reason?: NegotiationFailure;
}

function capabilitiesAreComplete(capabilities: ForgeLoopCapabilitiesSummary): boolean {
  if (capabilities.integrationApiVersion !== SUPPORTED_INTEGRATION_API_VERSION) return false;
  if (capabilities.executorParity !== true) return false;
  const recovery = (capabilities.features as Record<string, unknown> | undefined)?.taskClaimRecovery as
    | Record<string, unknown>
    | undefined;
  if (!recovery) return false;
  if (recovery.version !== SUPPORTED_TASK_CLAIM_RECOVERY_VERSION) return false;
  if (recovery.durableRecoveryState !== true) return false;
  if (recovery.explicitResume !== true) return false;
  if (recovery.validatedClaimProjection !== true) return false;
  for (const resource of REQUIRED_RESOURCES) {
    if (!Array.isArray(capabilities.resources) || !capabilities.resources.includes(resource)) {
      return false;
    }
  }
  return true;
}

/**
 * Select the Studio compatibility mode from canonical protocol info and
 * Integration API capabilities. Fails closed: any drift between what the
 * project declares and what this Studio build supports yields INCOMPATIBLE,
 * never a silent downgrade of semantic guarantees.
 */
export function negotiateCompatibilityMode(input: CapabilityNegotiationInput): CapabilityNegotiationResult {
  if (!input.protocolInfo) {
    return { mode: 'ARTIFACT_ONLY', reason: 'INTEGRATION_UNAVAILABLE' };
  }

  if (input.protocolInfo.protocolVersion !== SUPPORTED_PROTOCOL_VERSION) {
    return { mode: 'INCOMPATIBLE', reason: 'UNSUPPORTED_PROTOCOL_VERSION' };
  }

  if (input.protocolInfo.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    return { mode: 'INCOMPATIBLE', reason: 'UNSUPPORTED_SCHEMA_VERSION' };
  }

  if (!input.capabilities) {
    return { mode: 'ARTIFACT_ONLY', reason: 'INTEGRATION_UNAVAILABLE' };
  }

  if (!capabilitiesAreComplete(input.capabilities)) {
    return { mode: 'INCOMPATIBLE', reason: 'CAPABILITY_DRIFT' };
  }

  return { mode: 'INTEGRATION_V1' };
}
