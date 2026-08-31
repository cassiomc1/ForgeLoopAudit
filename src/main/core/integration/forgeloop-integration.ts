import { ForgeLoopStudioError } from '@shared/errors';
import provenance from '../../../../schemas/provenance.json';
import type {
  CanonicalOwnershipResource,
  CanonicalTaskList,
  ForgeLoopCapabilitiesSummary,
  ForgeLoopReadOnlyResult,
  ForgeLoopResourceReadOptions,
  ForgeLoopVerificationIsolationMode,
  ForgeLoopVerificationScopeMode,
} from './types';

export * from './types';

/**
 * Generated schema provenance is the fallback identity for diagnostics and
 * tests. Runtime calls still ask the loaded ESM integration module for its
 * package version so a package drift cannot be hidden by a stale literal.
 */
export const FORGELOOP_PACKAGE_VERSION = provenance.forgeLoopPackageVersion;
export const FORGELOOP_UPSTREAM_COMMIT = provenance.forgeLoopGitCommit;

/**
 * Commands the Studio may invoke through the canonical read runtime beyond
 * dedicated integration resources. Every entry must classify as READ_ONLY
 * inside ForgeLoop; the guard re-verifies at invocation time.
 */
export const STUDIO_READ_ONLY_COMMANDS = Object.freeze(
  new Set([
    'next',
    'progress',
    'audit',
    'report',
    'policy-status',
    'validate-state',
    'validate-receipt',
    'history',
    'trace',
    'reflect',
    'inspect',
    'metrics',
    'action-show',
    'handoff-list',
    'handoff-show',
  ]),
);

const REQUIRED_RESOURCES = [
  'protocol/info',
  'project/tasks',
  'task/status',
  'task/ownership',
  'task/contract',
  'task/continuity',
] as const;

const KNOWN_VERIFICATION_ISOLATION_MODES: ForgeLoopVerificationIsolationMode[] = [
  'NATIVE_PROJECT',
  'PROJECT_ISOLATED',
  'SYSTEM_ISOLATED',
];

function isKnownIsolationMode(value: unknown): value is ForgeLoopVerificationIsolationMode {
  return typeof value === 'string'
    && KNOWN_VERIFICATION_ISOLATION_MODES.includes(value as ForgeLoopVerificationIsolationMode);
}

export interface ForgeLoopIntegrationAdapter {
  getPackageVersion(): string;
  getCapabilities(): ForgeLoopCapabilitiesSummary;
  readProtocolInfo(projectRoot: string): Promise<Record<string, unknown>>;
  listTasks(projectRoot: string): Promise<CanonicalTaskList>;
  readTaskStatus(projectRoot: string, taskId: string): Promise<Record<string, unknown>>;
  readTaskOwnership(projectRoot: string, taskId: string): Promise<CanonicalOwnershipResource>;
  readTaskContract(projectRoot: string, taskId: string): Promise<Record<string, unknown>>;
  readTaskContinuity(projectRoot: string, taskId: string): Promise<Record<string, unknown>>;
  /** Present when the canonical execution-profile context capability is advertised. */
  readTaskContext?: (projectRoot: string, taskId: string) => Promise<Record<string, unknown>>;
  readTaskWorkspaceBinding?: (projectRoot: string, taskId: string) => Promise<Record<string, unknown>>;
  readTaskHandoffs?: (projectRoot: string, taskId: string) => Promise<Record<string, unknown>>;
  readTaskResponsibility?: (projectRoot: string, taskId: string) => Promise<Record<string, unknown>>;
  readTaskVerificationScope?: (projectRoot: string, taskId: string) => Promise<Record<string, unknown>>;
  readTaskAttestation?: (projectRoot: string, taskId: string) => Promise<Record<string, unknown>>;
  /** Optional in test/legacy adapters; present when the negotiated feature is advertised. */
  readTaskActions?: (projectRoot: string, taskId: string) => Promise<Record<string, unknown>>;
  readTaskAction?: (projectRoot: string, taskId: string, actionId: string) => Promise<Record<string, unknown>>;
  readTaskApprovals?: (projectRoot: string, taskId: string) => Promise<Record<string, unknown>>;
  readTaskMetrics?: (projectRoot: string, taskId: string) => Promise<Record<string, unknown>>;
  readTaskEvaluations?: (projectRoot: string, taskId: string) => Promise<Record<string, unknown>>;
  readCapabilityPolicy?: (projectRoot: string) => Promise<Record<string, unknown> | null>;
  executeReadOnly<T = Record<string, unknown>>(
    projectRoot: string,
    command: string,
    input?: Record<string, unknown>,
  ): Promise<ForgeLoopReadOnlyResult<T>>;
}

function assertReadProjectRoot(projectRoot: string): void {
  if (typeof projectRoot !== 'string' || projectRoot.length === 0) {
    throw ForgeLoopStudioError.pathBoundaryViolation(String(projectRoot), 'integration adapter requires a resolved project root');
  }
}

interface ForgeLoopIntegrationModule {
  getForgeLoopPackageVersion(): string;
  executeForgeLoopCommand(options: { command: string; projectPath?: string; input?: Record<string, unknown> }): Promise<ForgeLoopReadOnlyResult<unknown>>;
  getForgeLoopCapabilities(options?: { packageVersion?: string | null }): {
    packageVersion: string | null;
    protocolVersion: number;
    integrationApiVersion: number;
    executorParity: boolean;
    features: {
      taskClaimRecovery: {
        version: number;
        durableRecoveryState: boolean;
        explicitResume: boolean;
        validatedClaimProjection: boolean;
      };
      adaptiveExecutionProfiles?: {
        version: number;
        supported: boolean;
        deterministic: boolean;
        lifecycleFastPath: boolean;
      };
      executionProfileContext?: {
        version: number;
        supported: boolean;
        resource: string;
        resolvedProfileAuthoritative: boolean;
        compatibilityFallback: string;
        lifecycleFastPath: boolean;
      };
      contextUsageObservability?: {
        version: number;
        supported: boolean;
        sources: unknown[];
        estimation: boolean;
        inflationStatus: string;
      };
      durableActions?: {
        version: number;
        readOnlyResources: boolean;
        externalExecutionOverMcp: boolean;
      };
      trajectoryEvaluation?: {
        version: number;
        readOnlyMetrics: boolean;
        projectLocalReference: boolean;
      };
      verificationExecutionIsolation?: {
        version: number;
        supported: boolean;
        adapter: boolean;
        modes: unknown[];
        protocolProjectRootSeparateFromExecutionCwd: boolean;
      };
      workspaceBinding?: {
        version: number;
        supported: boolean;
        optional: boolean;
        explicitRebinding: boolean;
      };
      canonicalHandoffs?: {
        version: number;
        supported: boolean;
        immutable: boolean;
        lifecycleAuthority: boolean;
      };
      responsibilityConstraints?: {
        version: number;
        supported: boolean;
        immutableDuringPass: boolean;
        completionEnforced: boolean;
      };
      differentialVerificationScope?: {
        version: number;
        supported: boolean;
        modes: unknown[];
        impactedMode: boolean;
      };
      codeAttestation?: {
        version: number;
        supported: boolean;
        modes: unknown[];
        revisionProviders: unknown[];
        signingProviders: unknown[];
        completionLedgerBound: boolean;
      };
    };
    commands: Array<Record<string, unknown>>;
    resources: Array<{ name: string }>;
  };
  classifyForgeLoopInvocation(command: string, input?: Record<string, unknown>): {
    riskClass: string;
    mutatesProtocol: boolean;
    executesExternalProcess: boolean;
  };
  readForgeLoopIntegrationResource<T = Record<string, unknown>>(
    uri: string,
    options?: ForgeLoopResourceReadOptions,
  ): Promise<{ uri: string; taskId?: string | null; data: T }>;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

const KNOWN_VERIFICATION_SCOPE_MODES: ForgeLoopVerificationScopeMode[] = ['AUTO', 'CHANGED', 'CLAIMED', 'FULL'];

function verificationScopeModes(value: unknown): ForgeLoopVerificationScopeMode[] {
  return stringArray(value).filter((entry): entry is ForgeLoopVerificationScopeMode =>
    KNOWN_VERIFICATION_SCOPE_MODES.includes(entry as ForgeLoopVerificationScopeMode));
}

let cachedModule: Promise<ForgeLoopIntegrationModule> | null = null;

/**
 * Load the bundled Integration API at runtime. The package is external to
 * the main-process bundle and resolved from node_modules (packaged inside
 * the app), so its ESM modules keep working without any global ForgeLoop CLI.
 */
async function loadIntegrationModule(): Promise<ForgeLoopIntegrationModule> {
  if (!cachedModule) {
    cachedModule = import('@cassiomc1/forgeloop/integration') as Promise<ForgeLoopIntegrationModule>;
  }
  return cachedModule;
}

export function createForgeLoopIntegration(): Promise<ForgeLoopIntegrationAdapter> {
  return loadIntegrationModule().then((fl) => buildAdapter(fl));
}

function buildAdapter(fl: ForgeLoopIntegrationModule): ForgeLoopIntegrationAdapter {
  return {
    getPackageVersion(): string {
      return fl.getForgeLoopPackageVersion();
    },

    getCapabilities(): ForgeLoopCapabilitiesSummary {
      const packageVersion = fl.getForgeLoopPackageVersion();
      const raw = fl.getForgeLoopCapabilities({ packageVersion });
      const adaptiveExecutionProfiles = raw.features.adaptiveExecutionProfiles;
      const executionProfileContext = raw.features.executionProfileContext;
      const contextUsageObservability = raw.features.contextUsageObservability;
      const durableActions = raw.features.durableActions;
      const trajectoryEvaluation = raw.features.trajectoryEvaluation;
      const verificationExecutionIsolation = raw.features.verificationExecutionIsolation;
      const workspaceBinding = raw.features.workspaceBinding;
      const canonicalHandoffs = raw.features.canonicalHandoffs;
      const responsibilityConstraints = raw.features.responsibilityConstraints;
      const differentialVerificationScope = raw.features.differentialVerificationScope;
      const codeAttestation = raw.features.codeAttestation;
      return {
        packageVersion,
        protocolVersion: raw.protocolVersion,
        integrationApiVersion: raw.integrationApiVersion,
        executorParity: raw.executorParity === true,
        features: {
          taskClaimRecovery: {
            version: raw.features.taskClaimRecovery.version,
            durableRecoveryState: raw.features.taskClaimRecovery.durableRecoveryState === true,
            explicitResume: raw.features.taskClaimRecovery.explicitResume === true,
            validatedClaimProjection: raw.features.taskClaimRecovery.validatedClaimProjection === true,
          },
          ...(adaptiveExecutionProfiles ? {
            adaptiveExecutionProfiles: {
              version: finiteNumber(adaptiveExecutionProfiles.version, 0),
              supported: adaptiveExecutionProfiles.supported === true,
              deterministic: adaptiveExecutionProfiles.deterministic === true,
              lifecycleFastPath: adaptiveExecutionProfiles.lifecycleFastPath === true,
            },
          } : {}),
          ...(executionProfileContext ? {
            executionProfileContext: {
              version: finiteNumber(executionProfileContext.version, 0),
              supported: executionProfileContext.supported === true,
              resource: typeof executionProfileContext.resource === 'string' ? executionProfileContext.resource : '',
              resolvedProfileAuthoritative: executionProfileContext.resolvedProfileAuthoritative === true,
              compatibilityFallback: typeof executionProfileContext.compatibilityFallback === 'string'
                ? executionProfileContext.compatibilityFallback
                : '',
              lifecycleFastPath: executionProfileContext.lifecycleFastPath === true,
            },
          } : {}),
          ...(contextUsageObservability ? {
            contextUsageObservability: {
              version: finiteNumber(contextUsageObservability.version, 0),
              supported: contextUsageObservability.supported === true,
              sources: stringArray(contextUsageObservability.sources),
              estimation: contextUsageObservability.estimation === true,
              inflationStatus: typeof contextUsageObservability.inflationStatus === 'string'
                ? contextUsageObservability.inflationStatus
                : '',
            },
          } : {}),
          ...(durableActions ? {
            durableActions: {
              version: durableActions.version,
              readOnlyResources: durableActions.readOnlyResources === true,
              externalExecutionOverMcp: durableActions.externalExecutionOverMcp === true,
            },
          } : {}),
          ...(trajectoryEvaluation ? {
            trajectoryEvaluation: {
              version: trajectoryEvaluation.version,
              readOnlyMetrics: trajectoryEvaluation.readOnlyMetrics === true,
              projectLocalReference: trajectoryEvaluation.projectLocalReference === true,
            },
          } : {}),
          ...(verificationExecutionIsolation ? {
            verificationExecutionIsolation: {
              version: verificationExecutionIsolation.version,
              supported: verificationExecutionIsolation.supported === true,
              adapter: verificationExecutionIsolation.adapter === true,
              modes: Array.isArray(verificationExecutionIsolation.modes)
                ? verificationExecutionIsolation.modes.filter(isKnownIsolationMode)
                : [],
              protocolProjectRootSeparateFromExecutionCwd:
                verificationExecutionIsolation.protocolProjectRootSeparateFromExecutionCwd === true,
            },
          } : {}),
          ...(workspaceBinding ? {
            workspaceBinding: {
              version: finiteNumber(workspaceBinding.version, 0),
              supported: workspaceBinding.supported === true,
              optional: workspaceBinding.optional === true,
              explicitRebinding: workspaceBinding.explicitRebinding === true,
            },
          } : {}),
          ...(canonicalHandoffs ? {
            canonicalHandoffs: {
              version: finiteNumber(canonicalHandoffs.version, 0),
              supported: canonicalHandoffs.supported === true,
              immutable: canonicalHandoffs.immutable === true,
              lifecycleAuthority: canonicalHandoffs.lifecycleAuthority === true,
            },
          } : {}),
          ...(responsibilityConstraints ? {
            responsibilityConstraints: {
              version: finiteNumber(responsibilityConstraints.version, 0),
              supported: responsibilityConstraints.supported === true,
              immutableDuringPass: responsibilityConstraints.immutableDuringPass === true,
              completionEnforced: responsibilityConstraints.completionEnforced === true,
            },
          } : {}),
          ...(differentialVerificationScope ? {
            differentialVerificationScope: {
              version: finiteNumber(differentialVerificationScope.version, 0),
              supported: differentialVerificationScope.supported === true,
              modes: verificationScopeModes(differentialVerificationScope.modes),
              impactedMode: differentialVerificationScope.impactedMode === true,
            },
          } : {}),
          ...(codeAttestation ? {
            codeAttestation: {
              version: finiteNumber(codeAttestation.version, 0),
              supported: codeAttestation.supported === true,
              modes: stringArray(codeAttestation.modes).filter((entry): entry is 'off' | 'optional' | 'required' =>
                entry === 'off' || entry === 'optional' || entry === 'required'),
              revisionProviders: stringArray(codeAttestation.revisionProviders),
              signingProviders: stringArray(codeAttestation.signingProviders),
              completionLedgerBound: codeAttestation.completionLedgerBound === true,
            },
          } : {}),
        },
        resources: raw.resources.map((resource) => resource.name),
        commands: raw.commands.map((command) => ({
          name: typeof command.name === 'string' ? command.name : '',
          baseRiskClass: typeof command.baseRiskClass === 'string' ? command.baseRiskClass : undefined,
          mayExecuteExternalProcess: command.mayExecuteExternalProcess === true,
          mutatesProtocol: command.mutatesProtocol === true
            || (typeof command.mutation === 'string' && command.mutation !== 'READ_ONLY'),
        })).filter((command) => command.name.length > 0),
      };
    },

    async readProtocolInfo(projectRoot: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'protocol/info', { packageVersion: fl.getForgeLoopPackageVersion() });
    },

    async listTasks(projectRoot: string): Promise<CanonicalTaskList> {
      assertReadProjectRoot(projectRoot);
      return readResource<CanonicalTaskList>(fl, 'project/tasks', { projectPath: projectRoot });
    },

    async readTaskStatus(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/status', { projectPath: projectRoot, taskId });
    },

    async readTaskOwnership(projectRoot: string, taskId: string): Promise<CanonicalOwnershipResource> {
      assertReadProjectRoot(projectRoot);
      return readResource<CanonicalOwnershipResource>(fl, 'task/ownership', { projectPath: projectRoot, taskId });
    },

    async readTaskContract(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/contract', { projectPath: projectRoot, taskId });
    },

    async readTaskContinuity(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/continuity', { projectPath: projectRoot, taskId });
    },

    async readTaskContext(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/context', { projectPath: projectRoot, taskId });
    },

    async readTaskWorkspaceBinding(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/workspace-binding', { projectPath: projectRoot, taskId });
    },

    async readTaskHandoffs(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/handoffs', { projectPath: projectRoot, taskId });
    },

    async readTaskResponsibility(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/responsibility', { projectPath: projectRoot, taskId });
    },

    async readTaskVerificationScope(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/verification-scope', { projectPath: projectRoot, taskId });
    },

    async readTaskAttestation(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/attestation', { projectPath: projectRoot, taskId });
    },

    async readTaskActions(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/actions', { projectPath: projectRoot, taskId });
    },

    async readTaskAction(projectRoot: string, taskId: string, actionId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/action', { projectPath: projectRoot, taskId, actionId });
    },

    async readTaskApprovals(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/approvals', { projectPath: projectRoot, taskId });
    },

    async readTaskMetrics(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/metrics', { projectPath: projectRoot, taskId });
    },

    async readTaskEvaluations(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'task/evaluations', { projectPath: projectRoot, taskId });
    },

    async readCapabilityPolicy(projectRoot: string): Promise<Record<string, unknown> | null> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown> | null>(fl, 'project/capability-policy', { projectPath: projectRoot });
    },

    async executeReadOnly<T>(
      projectRoot: string,
      command: string,
      input: Record<string, unknown> = {},
    ): Promise<ForgeLoopReadOnlyResult<T>> {
      let classification: ReturnType<ForgeLoopIntegrationModule['classifyForgeLoopInvocation']>;
      try {
        classification = fl.classifyForgeLoopInvocation(command, input);
      } catch (error) {
        throw ForgeLoopStudioError.cliFailed(
          command,
          -1,
          `Command has no canonical integration classification: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (
        classification.riskClass !== INTEGRATION_RISK_CLASSES_READ_ONLY ||
        classification.mutatesProtocol !== false ||
        classification.executesExternalProcess !== false
      ) {
        throw ForgeLoopStudioError.cliFailed(
          command,
          -1,
          `Studio refuses non-read-only ForgeLoop invocation: ${classification.riskClass}`,
        );
      }

      return fl.executeForgeLoopCommand({ command, projectPath: projectRoot, input }) as Promise<ForgeLoopReadOnlyResult<T>>;
    },
  };
}

const INTEGRATION_RISK_CLASSES_READ_ONLY = 'READ_ONLY';

async function readResource<T>(
  fl: ForgeLoopIntegrationModule,
  uri: string,
  options: Parameters<ForgeLoopIntegrationModule['readForgeLoopIntegrationResource']>[1],
): Promise<T> {
  const resource = await fl.readForgeLoopIntegrationResource<T>(uri, options);
  return resource.data;
}

export function hasRequiredResources(capabilities: ForgeLoopCapabilitiesSummary): boolean {
  return REQUIRED_RESOURCES.every((resource) => capabilities.resources.includes(resource));
}
