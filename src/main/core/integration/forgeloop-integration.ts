import { ForgeLoopStudioError } from '@shared/errors';
import provenance from '../../../../schemas/provenance.json';
import type {
  CanonicalOwnershipResource,
  CanonicalTaskList,
  ForgeLoopCapabilitiesSummary,
  ForgeLoopReadOnlyResult,
  ForgeLoopResourceReadOptions,
  ForgeLoopVerificationIsolationMode,
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
      const durableActions = raw.features.durableActions;
      const trajectoryEvaluation = raw.features.trajectoryEvaluation;
      const verificationExecutionIsolation = raw.features.verificationExecutionIsolation;
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
