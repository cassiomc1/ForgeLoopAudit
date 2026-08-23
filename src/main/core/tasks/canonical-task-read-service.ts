import type { ProjectReader } from '@main/core/project/project-reader';
import type { ForgeLoopIntegrationAdapter } from '@main/core/integration/forgeloop-integration';
import { runStudioReadCommand } from '@main/core/integration/studio-read-commands';
import { buildTaskSummary, buildRecoverySummary } from './task-reader';
import { normalizeOwnership } from './ownership-projection';
import { resolveOperationalState } from './operational-state';
import { compareAuthoritativeFacts } from '@main/core/protocol/semantic-parity';
import type { TaskSummary } from '@shared/domain';

export interface CanonicalTaskReadResult {
  taskId: string;
  taskKey: string;
  summary: TaskSummary;
  status?: Record<string, unknown>;
}

export interface CanonicalTaskReadService {
  readTask(taskId: string, taskKey: string): Promise<CanonicalTaskReadResult>;
}

export function extractCanonicalPhase(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const phase = (value as Record<string, unknown>).phase;
  return typeof phase === 'string' ? phase.toUpperCase() : undefined;
}

/**
 * Single canonical semantic projection for one task.
 *
 * Both the project snapshot and the GET_TASK IPC endpoint read tasks through
 * this service, so overview and inspector can never present conflicting
 * ownership/recovery facts. Everything canonical comes from the bundled
 * Integration API (`task/status`, `task/ownership`, canonical `next`); raw
 * artifacts contribute display data only. There is no external CLI here.
 */
export function createCanonicalTaskReadService(options: {
  projectRoot: string;
  projectReader: ProjectReader;
  integration: ForgeLoopIntegrationAdapter;
}): CanonicalTaskReadService {
  const { projectRoot, projectReader, integration } = options;

  return {
    async readTask(taskId: string, taskKey: string): Promise<CanonicalTaskReadResult> {
      const artifacts = projectReader.readTaskSummaryArtifacts(taskKey);

      const [canonicalStatus, canonicalOwnership] = await Promise.all([
        integration.readTaskStatus(projectRoot, taskId).catch(() => null),
        integration.readTaskOwnership(projectRoot, taskId).catch(() => null),
      ]);

      const nextOutcome = await runStudioReadCommand<Record<string, unknown>>(
        integration,
        projectRoot,
        'next',
        { taskId },
      ).catch(() => null);
      const nextData = nextOutcome?.kind === 'DOMAIN_OUTCOME' ? nextOutcome.data ?? undefined : undefined;

      const summary = buildTaskSummary(taskKey, artifacts, nextData);

      const ownershipSummary = normalizeOwnership(canonicalOwnership);
      summary.ownership = ownershipSummary;
      summary.historicalWriteClaims = ownershipSummary.historicalWriteClaims;
      summary.effectiveWriteClaims = ownershipSummary.effectiveWriteClaims;

      summary.recovery = buildRecoverySummary(
        artifacts['recovery.json'] as Record<string, unknown> | undefined,
        ownershipSummary,
      );

      summary.operationalState = resolveOperationalState({
        phase: summary.phase,
        ownership: ownershipSummary,
      });

      if (canonicalStatus) {
        const parity = compareAuthoritativeFacts(
          { phase: summary.phase },
          { phase: extractCanonicalPhase(canonicalStatus) },
        );
        if (!parity.consistent) {
          summary.protocolConflicts = parity.differences;
        }
      }

      return { taskId, taskKey, summary, status: canonicalStatus ?? undefined };
    },
  };
}
