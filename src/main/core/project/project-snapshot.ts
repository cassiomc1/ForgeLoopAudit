import { PathBoundary } from '@main/security/path-boundary';
import { basename, join, resolve, sep } from 'path';
import { lstatSync, readFileSync, realpathSync } from 'fs';
import type {
  ProjectSnapshot,
  ProjectSummary,
  ProtocolSummary,
  TaskSummary,
  SessionSummary,
  PolicySummary,
  ProjectHealth,
  ProjectObservations,
  ForgeLoopCompatibilityMode,
} from '@shared/domain';
import { ProjectReader } from './project-reader';
import { ForgeCli, type CliResult } from '@main/core/cli/forge-cli';
import { LegacyCliReadAdapter } from '@main/core/integration/legacy-cli-read-adapter';
import { buildTaskSummary, buildRecoverySummary } from '@main/core/tasks/task-reader';
import { resolveOperationalState, selectActiveTaskId } from '@main/core/tasks/operational-state';
import { checkProtocolCompatibility } from '@main/core/protocol/compatibility';
import { compareAuthoritativeFacts } from '@main/core/protocol/semantic-parity';
import { discoverCanonicalTasks, type CanonicalTaskDiscoveryResult } from '@main/core/integration/task-projection';
import { runStudioReadCommand } from '@main/core/integration/studio-read-commands';
import { normalizeOwnership } from '@main/core/tasks/ownership-projection';
import type { ForgeLoopIntegrationAdapter } from '@main/core/integration/forgeloop-integration';

export interface ProjectCompatibilityContext {
  source: 'PROTOCOL_INFO' | 'ARTIFACT_ONLY';
  protocolVersion: number;
  schemaVersion: number;
  packageVersion?: string;
  compatibilityMode?: ForgeLoopCompatibilityMode;
}

export class ProjectSnapshotBuilder {
  private readonly legacyCli: LegacyCliReadAdapter;

  constructor(
    private readonly pathBoundary: PathBoundary,
    private readonly projectReader: ProjectReader,
    forgeCli: ForgeCli,
    private readonly compatibilityContext?: ProjectCompatibilityContext,
    private readonly cliEnabled = true,
    private readonly integration?: ForgeLoopIntegrationAdapter
  ) {
    this.legacyCli = new LegacyCliReadAdapter(forgeCli);
  }

  async build(): Promise<ProjectSnapshot> {
    const config = this.projectReader.readConfig();
    const taskKeys = this.projectReader.listTaskKeys();
    const diagnostics: string[] = [];

    let canonicalDiscovery: CanonicalTaskDiscoveryResult | null = null;
    if (this.integration && this.compatibilityContext?.compatibilityMode === 'INTEGRATION_V1') {
      canonicalDiscovery = await discoverCanonicalTasks(this.integration, this.pathBoundary.getProjectRoot(), taskKeys);
      diagnostics.push(...canonicalDiscovery.diagnostics);
    }

    const protocolSummary: ProtocolSummary = checkProtocolCompatibility({
      protocolVersion: this.compatibilityContext?.protocolVersion ?? config.protocolVersion,
      schemaVersion: this.compatibilityContext?.schemaVersion ?? config.schemaVersion,
      packageVersion: this.compatibilityContext?.packageVersion,
      compatible: true,
    });
    protocolSummary.compatibilitySource = this.compatibilityContext?.source || 'ARTIFACT_ONLY';
    protocolSummary.compatibilityMode = this.compatibilityContext?.compatibilityMode;

    const projectSummary: ProjectSummary = {
      name: config.projectName || basename(this.pathBoundary.getProjectRoot()) || 'Unknown Project',
      rootPath: this.pathBoundary.getProjectRoot(),
      branch: await this.getGitBranch(),
      head: await this.getGitHead(),
    };

    const sessions = this.buildSessions();
    const tasks: TaskSummary[] = [];
    let activeTaskId: string | undefined;
    const authoritativeStatuses: string[] = [];

    for (let offset = 0; offset < taskKeys.length; offset += 4) {
      const batch = await Promise.all(taskKeys.slice(offset, offset + 4).map(async (taskKey) => {
        try {
          const artifacts = this.projectReader.readTaskSummaryArtifacts(taskKey);
          const taskId = String((artifacts['task.json'] as Record<string, unknown>)?.taskId || taskKey);
          const cliUnavailable = { success: false } as CliResult<Record<string, unknown>>;
          const wantsCanonicalRuntime = Boolean(this.integration && this.compatibilityContext?.compatibilityMode === 'INTEGRATION_V1');
          let nextResult: CliResult<Record<string, unknown>>;
          let statusResult: CliResult<Record<string, unknown>>;
          if (wantsCanonicalRuntime && this.integration) {
            const projectRoot = this.pathBoundary.getProjectRoot();
            const [nextOutcome, canonicalStatus] = await Promise.all([
              runStudioReadCommand<Record<string, unknown>>(this.integration, projectRoot, 'next', { taskId }),
              this.integration.readTaskStatus(projectRoot, taskId).catch(() => null),
            ]);
            nextResult = nextOutcome.kind === 'DOMAIN_OUTCOME'
              ? { success: true, data: nextOutcome.data ?? undefined, exitCode: nextOutcome.exitCode }
              : cliUnavailable;
            statusResult = canonicalStatus
              ? ({ success: true, data: canonicalStatus } as CliResult<Record<string, unknown>>)
              : cliUnavailable;
          } else {
            nextResult = this.cliEnabled ? await this.legacyCli.next(taskId) : cliUnavailable;
            statusResult = this.cliEnabled ? await this.legacyCli.status(taskId) : cliUnavailable;
          }
          const canonicalOwnership = wantsCanonicalRuntime && this.integration
            ? await this.integration.readTaskOwnership(this.pathBoundary.getProjectRoot(), taskId).catch(() => null)
            : null;
          const status = extractHealthStatus(statusResult.data);
          const taskSummary = buildTaskSummary(taskKey, artifacts as any, nextResult.success ? nextResult.data as Record<string, unknown> : undefined);
          const ownershipSummary = normalizeOwnership(canonicalOwnership);
          taskSummary.ownership = ownershipSummary;
          taskSummary.historicalWriteClaims = ownershipSummary.historicalWriteClaims;
          taskSummary.effectiveWriteClaims = ownershipSummary.effectiveWriteClaims;
          taskSummary.recovery = buildRecoverySummary(
            artifacts['recovery.json'] as Record<string, unknown> | undefined,
            ownershipSummary,
          );
          taskSummary.operationalState = resolveOperationalState({
            phase: taskSummary.phase,
            ownership: ownershipSummary,
          });
          const parity = statusResult.success
            ? compareAuthoritativeFacts(
              { phase: taskSummary.phase },
              { phase: extractPhase(statusResult.data) },
            )
            : undefined;
          if (parity && !parity.consistent) {
            taskSummary.protocolConflicts = parity.differences;
          }
          return { taskSummary, status: statusResult.success ? status : undefined };
        } catch (error) {
          console.warn(`Failed to build summary for task ${taskKey}:`, error);
          diagnostics.push(`corrupt task namespace ${taskKey}: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      }));
      for (const result of batch) {
        if (!result) continue;
        tasks.push(result.taskSummary);
        if (result.status) authoritativeStatuses.push(result.status);
      }
    }

    activeTaskId = selectActiveTaskId(tasks);

    if (canonicalDiscovery && canonicalDiscovery.source === 'FORGELOOP_INTEGRATION') {
      const builtTaskIds = new Set(tasks.map((task) => task.taskId));
      for (const canonical of canonicalDiscovery.tasks) {
        if (!builtTaskIds.has(canonical.taskId)) {
          diagnostics.push(`canonical task ${canonical.taskId} has no readable filesystem namespace`);
        }
      }
    }

    const policy = await this.buildPolicy();
    const health = this.buildHealth(protocolSummary, authoritativeStatuses);
    const observations = this.buildObservations(tasks);

    return {
      project: projectSummary,
      protocol: protocolSummary,
      health,
      observations,
      tasks,
      activeTaskId,
      sessions,
      policy,
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
      updatedAt: new Date().toISOString(),
    };
  }

  private buildSessions(): SessionSummary[] {
    const sessionIds = this.projectReader.listSessions();
    return sessionIds.map((id) => {
      try {
        const session = this.projectReader.readSession(id);
        return {
          id,
          createdAt: String(session.createdAt || ''),
          activationMarker: typeof session.activationMarker === 'string' ? session.activationMarker : undefined,
          isActive: undefined,
        };
      } catch {
        return { id, createdAt: '', isActive: false };
      }
    });
  }

  private buildHealth(protocol: ProtocolSummary, authoritativeStatuses: string[]): ProjectHealth {
    const knownStatuses = authoritativeStatuses.filter(isHealthStatus);
    const status = !protocol.compatible
      ? 'INVALID'
      : knownStatuses.length > 0
        ? knownStatuses.sort((a, b) => HEALTH_PRECEDENCE.indexOf(a) - HEALTH_PRECEDENCE.indexOf(b))[0]
        : 'UNKNOWN';
    const source = !protocol.compatible ? 'ARTIFACT_VALIDATION' : knownStatuses.length > 0 ? 'FORGELOOP_STATUS_AGGREGATE' : 'UNKNOWN';

    return {
      status,
      source,
    };
  }

  private buildObservations(tasks: TaskSummary[]): ProjectObservations {
    return {
      taskCount: tasks.length,
      evidence: tasks.reduce((totals, task) => ({
        covered: totals.covered + task.evidenceCoverage.covered,
        partial: totals.partial + task.evidenceCoverage.partial,
        notVerified: totals.notVerified + task.evidenceCoverage.notVerified,
        blocked: totals.blocked + task.evidenceCoverage.blocked,
      }), { covered: 0, partial: 0, notVerified: 0, blocked: 0 }),
      continuity: {
        present: tasks.filter((task) => Boolean(task.continuity)).length,
        missing: tasks.filter((task) => !task.continuity).length,
      },
      artifactValidationErrors: tasks.reduce((count, task) => count + (task.artifactErrors?.length || 0) + (task.gateErrors?.length || 0), 0),
      ownership: {
        activeCount: tasks.filter((task) => task.operationalState === 'ACTIVE').length,
        recoveredResumeRequiredCount: tasks.filter((task) => task.operationalState === 'RECOVERY_RESUME_REQUIRED').length,
        inconsistentCount: tasks.filter((task) => task.operationalState === 'OWNERSHIP_INCONSISTENT' || task.ownership.claimState === 'INCONSISTENT').length,
        unavailableCount: tasks.filter((task) => task.ownership.source === 'UNAVAILABLE').length,
      },
    };
  }

  private async buildPolicy(): Promise<PolicySummary | undefined> {
    const policy = this.projectReader.readGlobalPolicy();
    const rules = policy['rules.json'];
    const config = this.projectReader.readConfig();
    const ruleCount = rules && typeof rules === 'object' && Array.isArray((rules as Record<string, unknown>).rules) ? ((rules as Record<string, unknown>).rules as unknown[]).length : undefined;
    const cliStatus = this.cliEnabled
      ? await this.legacyCli.policyStatus<Record<string, unknown>>()
      : { success: false as const };
    const complianceMode = typeof (config as unknown as Record<string, unknown>).complianceMode === 'string' ? String((config as unknown as Record<string, unknown>).complianceMode) : 'Unknown';
    if (cliStatus.success) return normalizePolicyStatus(cliStatus.data, complianceMode, 'POLICY_STATUS');
    return {
      overallStatus: 'unknown',
      complianceMode,
      ruleCount,
      lockStatus: 'unknown',
      drift: null,
      integritySource: Object.keys(policy).length > 0 ? 'ARTIFACTS' : 'UNKNOWN',
      integrityMessage: 'Policy integrity was not verified by ForgeLoop CLI.',
    };
  }

  private async getGitBranch(): Promise<string | undefined> {
    try {
      const head = this.readGitMetadata('HEAD');
      if (!head) return undefined;
      if (head.startsWith('ref: ')) return head.slice(5).replace(/^refs\/heads\//, '');
      return 'HEAD';
    } catch {
      // Ignore
    }
    return undefined;
  }

  private async getGitHead(): Promise<string | undefined> {
    try {
      const head = this.readGitMetadata('HEAD');
      if (!head) return undefined;
      const ref = head.startsWith('ref: ') ? head.slice(5) : undefined;
      if (ref) {
        const direct = this.readGitMetadata(ref);
        if (direct) return direct.slice(0, 7);
        const packed = this.readGitMetadata('packed-refs');
        const match = packed?.split('\n').find((line) => line.endsWith(` ${ref}`));
        return match?.split(' ')[0].slice(0, 7);
      }
      return head.slice(0, 7);
    } catch {
      // Ignore
    }
    return undefined;
  }

  private readGitMetadata(relativePath: string): string | undefined {
    try {
      const root = this.pathBoundary.getProjectRoot();
      const gitEntry = join(root, '.git');
      const gitStat = lstatSync(gitEntry);
      const gitRoot = gitStat.isFile()
        ? (() => {
            const pointer = readFileSync(gitEntry, 'utf8').match(/^gitdir:\s*(.+)$/m)?.[1];
            if (!pointer) return undefined;
            const resolved = resolve(root, pointer);
            return realpathSync(resolved).startsWith(`${this.pathBoundary.getRealProjectRoot()}${sep}`) ? resolved : undefined;
          })()
        : gitEntry;
      if (!gitRoot) return undefined;
      const candidate = join(gitRoot, relativePath);
      return readFileSync(this.pathBoundary.validatePath(candidate), 'utf8').trim();
    } catch { return undefined; }
  }
}

const HEALTH_PRECEDENCE: ProjectHealth['status'][] = ['INVALID', 'INCONSISTENT', 'STALE', 'INCOMPLETE', 'VALID', 'UNKNOWN'];
function isHealthStatus(value: string): value is ProjectHealth['status'] { return HEALTH_PRECEDENCE.includes(value as ProjectHealth['status']); }
function extractHealthStatus(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const candidate = [record.status, record.stateStatus, record.state, record.health].find((item) => typeof item === 'string');
  return typeof candidate === 'string' ? candidate.toUpperCase() : undefined;
}
function extractPhase(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const phase = (value as Record<string, unknown>).phase;
  return typeof phase === 'string' ? phase.toUpperCase() : undefined;
}
export function normalizePolicyStatus(value: unknown, complianceMode = 'Unknown', integritySource: PolicySummary['integritySource'] = 'UNKNOWN'): PolicySummary {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const status = typeof record.status === 'string' ? record.status.toUpperCase() : '';
  const lock = record.lock && typeof record.lock === 'object' ? record.lock as Record<string, unknown> : undefined;
  const errors = Array.isArray(record.errors) ? record.errors.map((error) => formatPolicyMessage(error)).filter(Boolean) : [];
  const warnings = Array.isArray(record.warnings) ? record.warnings.map((warning) => formatPolicyMessage(warning)).filter(Boolean) : [];
  const driftRecord = record.drift && typeof record.drift === 'object' ? record.drift as Record<string, unknown> : null;
  const drift = driftRecord ? {
    detected: driftRecord.detected === true,
    classification: typeof driftRecord.classification === 'string' ? driftRecord.classification : undefined,
    changeCount: Array.isArray(driftRecord.changes) ? driftRecord.changes.length : undefined,
    snapshotDigest: typeof driftRecord.snapshotDigest === 'string' ? driftRecord.snapshotDigest : undefined,
    currentDigest: typeof driftRecord.currentDigest === 'string' ? driftRecord.currentDigest : undefined,
    changes: Array.isArray(driftRecord.changes) ? driftRecord.changes : undefined,
  } : null;
  const rawLockStatus = typeof lock?.status === 'string' ? lock.status.toUpperCase() : undefined;
  const lockStatus: PolicySummary['lockStatus'] = rawLockStatus === 'NOT_APPLICABLE'
    ? 'not-applicable'
    : rawLockStatus === 'INVALID'
      ? 'invalid'
    : errors.some((error) => error.includes('POLICY_LOCK_MISMATCH'))
      ? 'invalid'
      : typeof lock?.digest === 'string' ? 'valid' : 'unknown';
  return {
    overallStatus: status === 'VALID' ? 'valid' : status === 'INVALID' || status === 'MISMATCH' ? 'invalid' : 'unknown',
    complianceMode,
    ruleCount: Array.isArray(record.rules) ? record.rules.length : undefined,
    provenRules: typeof record.provenRules === 'number' ? record.provenRules : undefined,
    inertRules: typeof record.inertRules === 'number' ? record.inertRules : undefined,
    unsupportedRules: typeof record.unsupportedRules === 'number' ? record.unsupportedRules : undefined,
    baselineViolations: typeof record.baselineViolations === 'number' ? record.baselineViolations : undefined,
    newViolations: Array.isArray(record.newViolations) ? record.newViolations.length : undefined,
    lockStatus,
    drift,
    integritySource,
    errors,
    warnings,
  };
}

function formatPolicyMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const item = value as Record<string, unknown>;
  return [item.code, item.why || item.message || item.ruleId].filter((part): part is string => typeof part === 'string').join(': ');
}

export function createProjectSnapshotBuilder(
  pathBoundary: PathBoundary,
  projectReader: ProjectReader,
  forgeCli: ForgeCli,
  compatibilityContext?: ProjectCompatibilityContext,
  cliEnabled = true,
  integration?: ForgeLoopIntegrationAdapter
): ProjectSnapshotBuilder {
  return new ProjectSnapshotBuilder(pathBoundary, projectReader, forgeCli, compatibilityContext, cliEnabled, integration);
}
