import { ForgeLoopStudioError } from '@shared/errors';
import type {
  CanonicalOwnershipResource,
  CanonicalTaskList,
  ForgeLoopCapabilitiesSummary,
  ForgeLoopReadOnlyResult,
} from './types';

export * from './types';

/**
 * Version of the pinned @cassiomc1/forgeloop dependency providing the
 * Integration API. Kept as a build-time constant because the package's own
 * version probe relies on `import.meta.url`, which cannot survive the
 * Studio's CJS main-process bundle. Synchronized with the exact dependency
 * pin in package.json by forgeloop-integration.test.ts.
 */
export const FORGELOOP_PACKAGE_VERSION = '1.5.0';

/**
 * Commands the Studio may invoke through the canonical read runtime beyond
 * dedicated integration resources. Every entry must classify as READ_ONLY
 * inside ForgeLoop; the guard re-verifies at invocation time.
 */
export const STUDIO_READ_ONLY_COMMANDS = Object.freeze(
  new Set(['next', 'progress', 'audit', 'report', 'policy-status', 'validate-state', 'validate-receipt']),
);

const REQUIRED_RESOURCES = [
  'protocol/info',
  'project/tasks',
  'task/status',
  'task/ownership',
  'task/contract',
  'task/continuity',
] as const;

export interface ForgeLoopIntegrationAdapter {
  getPackageVersion(): string;
  getCapabilities(): ForgeLoopCapabilitiesSummary;
  readProtocolInfo(projectRoot: string): Promise<Record<string, unknown>>;
  listTasks(projectRoot: string): Promise<CanonicalTaskList>;
  readTaskStatus(projectRoot: string, taskId: string): Promise<Record<string, unknown>>;
  readTaskOwnership(projectRoot: string, taskId: string): Promise<CanonicalOwnershipResource>;
  readTaskContract(projectRoot: string, taskId: string): Promise<Record<string, unknown>>;
  readTaskContinuity(projectRoot: string, taskId: string): Promise<Record<string, unknown>>;
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
    options?: { projectPath?: string; packageRoot?: string; packageVersion?: string | null; taskId?: string | null },
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
      return FORGELOOP_PACKAGE_VERSION;
    },

    getCapabilities(): ForgeLoopCapabilitiesSummary {
      const raw = fl.getForgeLoopCapabilities({ packageVersion: FORGELOOP_PACKAGE_VERSION });
      return {
        packageVersion: FORGELOOP_PACKAGE_VERSION,
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
        },
        resources: raw.resources.map((resource) => resource.name),
      };
    },

    async readProtocolInfo(projectRoot: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>(fl, 'protocol/info', { packageVersion: FORGELOOP_PACKAGE_VERSION });
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
