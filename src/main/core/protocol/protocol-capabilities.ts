import type {
  ForgeLoopCapabilitiesSummary,
  ForgeLoopVerificationScopeMode,
  ForgeLoopVerificationIsolationMode,
} from '@main/core/integration/types';
import type { ForgeLoopCompatibilityMode, ForgeLoopFeatureSupport } from '@shared/domain';

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

const REQUIRED_VERIFICATION_ISOLATION_MODES: ForgeLoopVerificationIsolationMode[] = [
  'NATIVE_PROJECT',
  'PROJECT_ISOLATED',
  'SYSTEM_ISOLATED',
];

/**
 * Normalize the canonical `protocol-info` integration resource.
 *
 * ForgeLoop protocol-v1 reports schema compatibility exclusively under
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
  featureSupport: ForgeLoopFeatureSupport;
}

const EMPTY_FEATURE_SUPPORT: ForgeLoopFeatureSupport = Object.freeze({
  canonicalOwnership: false,
  observability: false,
  structuredDiagnostics: false,
  durableActions: false,
  approvals: false,
  capabilityPolicy: false,
  trajectoryMetrics: false,
  trajectoryEvaluations: false,
  verificationExecutionIsolation: false,
  workspaceBinding: false,
  canonicalHandoffs: false,
  responsibilityConstraints: false,
  differentialVerificationScope: false,
  codeAttestation: false,
  adaptiveExecutionProfiles: false,
  executionProfileContext: false,
  contextUsageObservability: false,
});

function hasResource(capabilities: ForgeLoopCapabilitiesSummary, resource: string): boolean {
  return Array.isArray(capabilities.resources) && capabilities.resources.includes(resource);
}

function hasReadOnlyCommand(capabilities: ForgeLoopCapabilitiesSummary, commandName: string): boolean {
  const command = capabilities.commands?.find((entry) => entry.name === commandName);
  return Boolean(
    command
      && command.baseRiskClass === 'READ_ONLY'
      && command.mayExecuteExternalProcess !== true
      && command.mutatesProtocol !== true,
  );
}

/**
 * Derive additive feature support from ForgeLoop's advertised canonical
 * resources and command metadata. Missing optional advertisements degrade the
 * individual feature; they do not make protocol-v1 incompatible.
 */
export function deriveFeatureSupport(capabilities: ForgeLoopCapabilitiesSummary): ForgeLoopFeatureSupport {
  const coreResourcesPresent = REQUIRED_RESOURCES.every((resource) => hasResource(capabilities, resource));
  const observabilityCommands = ['history', 'trace', 'reflect', 'inspect']
    .every((command) => hasReadOnlyCommand(capabilities, command));
  const durableFeature = capabilities.features.durableActions;
  const durableActions = Boolean(
    durableFeature
      && durableFeature.version >= 1
      && durableFeature.readOnlyResources === true
      && hasResource(capabilities, 'task/actions')
      && hasResource(capabilities, 'task/action'),
  );
  const trajectoryFeature = capabilities.features.trajectoryEvaluation;
  const trajectoryContractSupported = Boolean(
    trajectoryFeature
      && trajectoryFeature.version === 1
      && trajectoryFeature.readOnlyMetrics === true
      && trajectoryFeature.projectLocalReference === true,
  );
  const verificationExecutionIsolation = capabilities.features.verificationExecutionIsolation;
  const verificationExecutionIsolationSupported = Boolean(
    verificationExecutionIsolation
      && verificationExecutionIsolation.version === 1
      && verificationExecutionIsolation.supported === true
      && verificationExecutionIsolation.adapter === true
      && REQUIRED_VERIFICATION_ISOLATION_MODES.every((mode) => verificationExecutionIsolation.modes.includes(mode))
      && verificationExecutionIsolation.protocolProjectRootSeparateFromExecutionCwd === true,
  );
  const workspaceBinding = capabilities.features.workspaceBinding;
  const workspaceBindingSupported = Boolean(
    workspaceBinding
      && workspaceBinding.version === 1
      && workspaceBinding.supported === true
      && hasResource(capabilities, 'task/workspace-binding'),
  );
  const canonicalHandoffs = capabilities.features.canonicalHandoffs;
  const canonicalHandoffsSupported = Boolean(
    canonicalHandoffs
      && canonicalHandoffs.version === 1
      && canonicalHandoffs.supported === true
      && canonicalHandoffs.immutable === true
      && canonicalHandoffs.lifecycleAuthority === false
      && hasResource(capabilities, 'task/handoffs'),
  );
  const responsibilityConstraints = capabilities.features.responsibilityConstraints;
  const responsibilityConstraintsSupported = Boolean(
    responsibilityConstraints
      && responsibilityConstraints.version === 1
      && responsibilityConstraints.supported === true
      && responsibilityConstraints.immutableDuringPass === true
      && responsibilityConstraints.completionEnforced === true
      && hasResource(capabilities, 'task/responsibility'),
  );
  const differentialVerificationScope = capabilities.features.differentialVerificationScope;
  const differentialVerificationScopeSupported = Boolean(
    differentialVerificationScope
      && differentialVerificationScope.version === 1
      && differentialVerificationScope.supported === true
      && differentialVerificationScope.impactedMode === false
      && (['AUTO', 'CHANGED', 'CLAIMED', 'FULL'] as ForgeLoopVerificationScopeMode[])
        .every((mode) => differentialVerificationScope.modes.includes(mode))
      && hasResource(capabilities, 'task/verification-scope'),
  );
  const codeAttestation = capabilities.features.codeAttestation;
  const codeAttestationSupported = Boolean(
    codeAttestation
      && codeAttestation.version === 1
      && codeAttestation.supported === true
      && codeAttestation.completionLedgerBound === true
      && hasResource(capabilities, 'task/attestation'),
  );
  const adaptiveExecutionProfiles = capabilities.features.adaptiveExecutionProfiles;
  const adaptiveExecutionProfilesSupported = Boolean(
    adaptiveExecutionProfiles
      && adaptiveExecutionProfiles.version === 1
      && adaptiveExecutionProfiles.supported === true
      && adaptiveExecutionProfiles.deterministic === true
      && adaptiveExecutionProfiles.lifecycleFastPath === false,
  );
  const executionProfileContext = capabilities.features.executionProfileContext;
  const executionProfileContextSupported = Boolean(
    adaptiveExecutionProfilesSupported
      && executionProfileContext
      && executionProfileContext.version === 1
      && executionProfileContext.supported === true
      && executionProfileContext.resource === 'task/context'
      && executionProfileContext.resolvedProfileAuthoritative === true
      && executionProfileContext.compatibilityFallback === 'balanced'
      && executionProfileContext.lifecycleFastPath === false
      && hasResource(capabilities, 'task/context'),
  );
  const contextUsageObservability = capabilities.features.contextUsageObservability;
  const contextUsageObservabilitySupported = Boolean(
    contextUsageObservability
      && contextUsageObservability.version === 1
      && contextUsageObservability.supported === true
      && contextUsageObservability.estimation === false
      && contextUsageObservability.inflationStatus === 'OBSERVATIONAL'
      && contextUsageObservability.sources.includes('HOST_REPORTED')
      && contextUsageObservability.sources.includes('UNKNOWN'),
  );

  return {
    canonicalOwnership: coreResourcesPresent,
    observability: observabilityCommands,
    structuredDiagnostics: observabilityCommands && hasReadOnlyCommand(capabilities, 'reflect'),
    durableActions,
    approvals: durableActions && hasResource(capabilities, 'task/approvals'),
    capabilityPolicy: hasResource(capabilities, 'project/capability-policy'),
    trajectoryMetrics: trajectoryContractSupported
      && hasResource(capabilities, 'task/metrics')
      && hasReadOnlyCommand(capabilities, 'metrics'),
    trajectoryEvaluations: trajectoryContractSupported
      && hasResource(capabilities, 'task/evaluations'),
    verificationExecutionIsolation: verificationExecutionIsolationSupported,
    workspaceBinding: workspaceBindingSupported,
    canonicalHandoffs: canonicalHandoffsSupported,
    responsibilityConstraints: responsibilityConstraintsSupported,
    differentialVerificationScope: differentialVerificationScopeSupported,
    codeAttestation: codeAttestationSupported,
    adaptiveExecutionProfiles: adaptiveExecutionProfilesSupported,
    executionProfileContext: executionProfileContextSupported,
    contextUsageObservability: contextUsageObservabilitySupported,
  };
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
    return { mode: 'ARTIFACT_ONLY', reason: 'INTEGRATION_UNAVAILABLE', featureSupport: { ...EMPTY_FEATURE_SUPPORT } };
  }

  if (input.protocolInfo.protocolVersion !== SUPPORTED_PROTOCOL_VERSION) {
    return { mode: 'INCOMPATIBLE', reason: 'UNSUPPORTED_PROTOCOL_VERSION', featureSupport: { ...EMPTY_FEATURE_SUPPORT } };
  }

  if (input.protocolInfo.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    return { mode: 'INCOMPATIBLE', reason: 'UNSUPPORTED_SCHEMA_VERSION', featureSupport: { ...EMPTY_FEATURE_SUPPORT } };
  }

  if (!input.capabilities) {
    return { mode: 'ARTIFACT_ONLY', reason: 'INTEGRATION_UNAVAILABLE', featureSupport: { ...EMPTY_FEATURE_SUPPORT } };
  }

  if (!capabilitiesAreComplete(input.capabilities)) {
    return { mode: 'INCOMPATIBLE', reason: 'CAPABILITY_DRIFT', featureSupport: { ...EMPTY_FEATURE_SUPPORT } };
  }

  return { mode: 'INTEGRATION_V1', featureSupport: deriveFeatureSupport(input.capabilities) };
}
