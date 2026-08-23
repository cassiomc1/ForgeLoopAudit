import {
  executeForgeLoopCommand,
  getForgeLoopCapabilities as getRawCapabilities,
  getForgeLoopPackageVersion,
  classifyForgeLoopInvocation,
  INTEGRATION_RISK_CLASSES,
  readForgeLoopIntegrationResource,
} from '@cassiomc1/forgeloop/integration';
import { ForgeLoopStudioError } from '@shared/errors';
import type {
  CanonicalOwnershipResource,
  CanonicalTaskList,
  ForgeLoopCapabilitiesSummary,
  ForgeLoopReadOnlyResult,
} from './types';

export * from './types';

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

async function readResource<T>(uri: string, options: Parameters<typeof readForgeLoopIntegrationResource>[1]): Promise<T> {
  const resource = await readForgeLoopIntegrationResource(uri, options);
  return resource.data as T;
}

function assertReadProjectRoot(projectRoot: string): void {
  if (typeof projectRoot !== 'string' || projectRoot.length === 0) {
    throw ForgeLoopStudioError.pathBoundaryViolation(String(projectRoot), 'integration adapter requires a resolved project root');
  }
}

export function createForgeLoopIntegration(): ForgeLoopIntegrationAdapter {
  return {
    getPackageVersion(): string {
      return getForgeLoopPackageVersion();
    },

    getCapabilities(): ForgeLoopCapabilitiesSummary {
      const raw = getRawCapabilities({ packageVersion: getForgeLoopPackageVersion() });
      return {
        packageVersion: raw.packageVersion,
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
      return readResource<Record<string, unknown>>('protocol/info', { packageVersion: getForgeLoopPackageVersion() });
    },

    async listTasks(projectRoot: string): Promise<CanonicalTaskList> {
      assertReadProjectRoot(projectRoot);
      return readResource<CanonicalTaskList>('project/tasks', { projectPath: projectRoot });
    },

    async readTaskStatus(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>('task/status', { projectPath: projectRoot, taskId });
    },

    async readTaskOwnership(projectRoot: string, taskId: string): Promise<CanonicalOwnershipResource> {
      assertReadProjectRoot(projectRoot);
      return readResource<CanonicalOwnershipResource>('task/ownership', { projectPath: projectRoot, taskId });
    },

    async readTaskContract(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>('task/contract', { projectPath: projectRoot, taskId });
    },

    async readTaskContinuity(projectRoot: string, taskId: string): Promise<Record<string, unknown>> {
      assertReadProjectRoot(projectRoot);
      return readResource<Record<string, unknown>>('task/continuity', { projectPath: projectRoot, taskId });
    },

    async executeReadOnly<T>(
      projectRoot: string,
      command: string,
      input: Record<string, unknown> = {},
    ): Promise<ForgeLoopReadOnlyResult<T>> {
      let classification: ReturnType<typeof classifyForgeLoopInvocation>;
      try {
        classification = classifyForgeLoopInvocation(command, input);
      } catch (error) {
        throw ForgeLoopStudioError.cliFailed(
          command,
          -1,
          `Command has no canonical integration classification: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (
        classification.riskClass !== INTEGRATION_RISK_CLASSES.READ_ONLY ||
        classification.mutatesProtocol !== false ||
        classification.executesExternalProcess !== false
      ) {
        throw ForgeLoopStudioError.cliFailed(
          command,
          -1,
          `Studio refuses non-read-only ForgeLoop invocation: ${classification.riskClass}`,
        );
      }

      return executeForgeLoopCommand<T>({ command, projectPath: projectRoot, input });
    },
  };
}

export function hasRequiredResources(capabilities: ForgeLoopCapabilitiesSummary): boolean {
  return REQUIRED_RESOURCES.every((resource) => capabilities.resources.includes(resource));
}
