import { runStudioReadCommand } from './studio-read-commands';
import type { ForgeLoopIntegrationAdapter } from './forgeloop-integration';
import type { ForgeLoopFeatureSupport } from '@shared/domain';
import type { ForgeLoopCanonicalError } from './types';

export type CanonicalObservabilityKind = 'history' | 'trace' | 'reflect' | 'inspect';

export interface CanonicalProjectionView<T = Record<string, unknown>> {
  available: boolean;
  source: 'FORGELOOP_INTEGRATION' | 'UNAVAILABLE';
  feature: CanonicalObservabilityKind;
  data: T | null;
  /** Alias kept for callers that use the Integration API's result wording. */
  result: T | null;
  exitCode: number | null;
  error: ForgeLoopCanonicalError | null;
}

export type TaskHistoryView = CanonicalProjectionView;
export type TaskTraceView = CanonicalProjectionView;
export type TaskReflectionView = CanonicalProjectionView;
export type TaskInspectionView = CanonicalProjectionView;

export interface CanonicalObservabilityService {
  getHistory(projectRoot: string, taskId: string): Promise<TaskHistoryView>;
  getTrace(projectRoot: string, taskId: string): Promise<TaskTraceView>;
  getReflection(projectRoot: string, taskId: string): Promise<TaskReflectionView>;
  getInspection(projectRoot: string, taskId: string): Promise<TaskInspectionView>;
}

function unavailable(feature: CanonicalObservabilityKind, featureSupport?: ForgeLoopFeatureSupport): CanonicalProjectionView {
  const supported = featureSupport?.observability === true;
  return {
    available: false,
    source: 'UNAVAILABLE',
    feature,
    data: null,
    result: null,
    exitCode: null,
    error: {
      code: supported ? 'E_CANONICAL_OBSERVABILITY_UNAVAILABLE' : 'E_FEATURE_UNAVAILABLE',
      message: supported
        ? `ForgeLoop did not provide the canonical ${feature} projection.`
        : 'Not available with the bundled ForgeLoop capability set.',
    },
  };
}

async function readProjection(
  integration: ForgeLoopIntegrationAdapter,
  projectRoot: string,
  taskId: string,
  feature: CanonicalObservabilityKind,
  featureSupport?: ForgeLoopFeatureSupport,
): Promise<CanonicalProjectionView> {
  if (featureSupport && featureSupport.observability !== true) return unavailable(feature, featureSupport);

  try {
    const outcome = await runStudioReadCommand<Record<string, unknown>>(
      integration,
      projectRoot,
      feature,
      { taskId },
    );
    if (outcome.kind === 'INVOCATION_FAILURE') {
      return {
        available: false,
        source: 'UNAVAILABLE',
        feature,
        data: null,
        result: null,
        exitCode: outcome.exitCode,
        error: outcome.error,
      };
    }
    return {
      available: true,
      source: 'FORGELOOP_INTEGRATION',
      feature,
      data: outcome.data,
      result: outcome.data,
      exitCode: outcome.exitCode,
      error: null,
    };
  } catch (error) {
    return {
      available: false,
      source: 'UNAVAILABLE',
      feature,
      data: null,
      result: null,
      exitCode: -1,
      error: {
        code: 'E_CANONICAL_OBSERVABILITY_INVOCATION',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function createCanonicalObservabilityService(options: {
  integration: ForgeLoopIntegrationAdapter;
  featureSupport?: ForgeLoopFeatureSupport;
}): CanonicalObservabilityService {
  const { integration, featureSupport } = options;
  return {
    getHistory: (projectRoot, taskId) => readProjection(integration, projectRoot, taskId, 'history', featureSupport),
    getTrace: (projectRoot, taskId) => readProjection(integration, projectRoot, taskId, 'trace', featureSupport),
    getReflection: (projectRoot, taskId) => readProjection(integration, projectRoot, taskId, 'reflect', featureSupport),
    getInspection: (projectRoot, taskId) => readProjection(integration, projectRoot, taskId, 'inspect', featureSupport),
  };
}
