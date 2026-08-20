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
} from '@shared/domain';
import { ProjectReader } from './project-reader';
import { ForgeCli } from '@main/core/cli/forge-cli';
import { buildTaskSummary } from '@main/core/tasks/task-reader';
import { checkProtocolCompatibility } from '@main/core/protocol/compatibility';

export interface ProjectCompatibilityContext {
  source: 'PROTOCOL_INFO' | 'ARTIFACT_ONLY';
  protocolVersion: number;
  schemaVersion: number;
  packageVersion?: string;
}

export class ProjectSnapshotBuilder {
  constructor(
    private readonly pathBoundary: PathBoundary,
    private readonly projectReader: ProjectReader,
    private readonly forgeCli: ForgeCli,
    private readonly compatibilityContext?: ProjectCompatibilityContext
  ) {}

  async build(): Promise<ProjectSnapshot> {
    const config = this.projectReader.readConfig();
    const taskKeys = this.projectReader.listTaskKeys();

    const protocolSummary: ProtocolSummary = checkProtocolCompatibility({
      protocolVersion: this.compatibilityContext?.protocolVersion ?? config.protocolVersion,
      schemaVersion: this.compatibilityContext?.schemaVersion ?? config.schemaVersion,
      packageVersion: this.compatibilityContext?.packageVersion,
      compatible: true,
    });
    protocolSummary.compatibilitySource = this.compatibilityContext?.source || 'ARTIFACT_ONLY';

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

    for (const taskKey of taskKeys) {
      try {
        const artifacts = this.projectReader.readTaskSummaryArtifacts(taskKey);
        const nextResult = await this.forgeCli.next(String((artifacts['task.json'] as Record<string, unknown>)?.taskId || taskKey));
        const statusResult = await this.forgeCli.status(String((artifacts['task.json'] as Record<string, unknown>)?.taskId || taskKey));
        const status = extractHealthStatus(statusResult.data);
        if (statusResult.success && status) authoritativeStatuses.push(status);
        const taskSummary = buildTaskSummary(taskKey, artifacts as any, nextResult.success ? nextResult.data as Record<string, unknown> : undefined);
        tasks.push(taskSummary);

        if (!activeTaskId && (taskSummary.phase !== 'COMPLETE' && taskSummary.phase !== 'BLOCKED')) {
          activeTaskId = taskSummary.taskId;
        }
      } catch (error) {
        console.warn(`Failed to build summary for task ${taskKey}:`, error);
      }
    }

    const policy = await this.buildPolicy();
    const health = this.buildHealth(tasks, protocolSummary, authoritativeStatuses, policy);

    return {
      project: projectSummary,
      protocol: protocolSummary,
      health,
      tasks,
      activeTaskId,
      sessions,
      policy,
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

  private buildHealth(tasks: TaskSummary[], protocol: ProtocolSummary, authoritativeStatuses: string[], policy?: PolicySummary): ProjectHealth {
    const knownStatuses = authoritativeStatuses.filter(isHealthStatus);
    const status = !protocol.compatible
      ? 'INVALID'
      : knownStatuses.length > 0
        ? knownStatuses.sort((a, b) => HEALTH_PRECEDENCE.indexOf(a) - HEALTH_PRECEDENCE.indexOf(b))[0]
        : 'UNKNOWN';
    const source = !protocol.compatible ? 'ARTIFACT_VALIDATION' : knownStatuses.length > 0 ? 'FORGELOOP_STATUS' : 'UNKNOWN';

    return {
      status,
      source,
      protocol: protocol.compatible,
      state: tasks.length > 0,
      evidence: tasks.length > 0,
      policy: policy?.integritySource === 'POLICY_STATUS'
        ? policy.baselineStatus === 'valid' && policy.lockStatus === 'valid' && policy.driftCount === 0
        : undefined,
      continuity: tasks.every((t) => Boolean(t.continuity)),
    };
  }

  private async buildPolicy(): Promise<PolicySummary | undefined> {
    const policy = this.projectReader.readGlobalPolicy();
    const rules = policy['rules.json'];
    const config = this.projectReader.readConfig();
    const ruleCount = rules && typeof rules === 'object' && Array.isArray((rules as Record<string, unknown>).rules) ? ((rules as Record<string, unknown>).rules as unknown[]).length : undefined;
    const cliStatus = await this.forgeCli.policyStatus<Record<string, unknown>>();
    const cliData = cliStatus.success ? cliStatus.data : undefined;
    const driftCount = extractDriftCount(cliData);
    const cliState = extractPolicyState(cliData);
    return {
      complianceMode: typeof (config as unknown as Record<string, unknown>).complianceMode === 'string' ? String((config as unknown as Record<string, unknown>).complianceMode) : 'Unknown',
      ruleCount,
      baselineStatus: cliState === 'invalid' ? 'invalid' : cliState === 'valid' ? 'valid' : 'unknown',
      lockStatus: cliState === 'invalid' ? 'invalid' : cliState === 'valid' ? 'valid' : 'unknown',
      driftCount,
      integritySource: cliStatus.success ? 'POLICY_STATUS' : Object.keys(policy).length > 0 ? 'ARTIFACTS' : 'UNKNOWN',
      integrityMessage: cliStatus.success ? undefined : 'Policy integrity was not verified by ForgeLoop CLI.',
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
function extractDriftCount(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const record = value as Record<string, unknown>;
  if (typeof record.driftCount === 'number') return record.driftCount;
  if (Array.isArray(record.drifts)) return record.drifts.length;
  return 0;
}
function extractPolicyState(value: unknown): 'valid' | 'invalid' | 'unknown' {
  if (!value || typeof value !== 'object') return 'unknown';
  const state = (value as Record<string, unknown>).status;
  if (typeof state !== 'string') return 'unknown';
  if (['VALID', 'COMPLIANT', 'OK'].includes(state.toUpperCase())) return 'valid';
  if (['INVALID', 'DRIFT', 'NON_COMPLIANT'].includes(state.toUpperCase())) return 'invalid';
  return 'unknown';
}

export function createProjectSnapshotBuilder(
  pathBoundary: PathBoundary,
  projectReader: ProjectReader,
  forgeCli: ForgeCli,
  compatibilityContext?: ProjectCompatibilityContext
): ProjectSnapshotBuilder {
  return new ProjectSnapshotBuilder(pathBoundary, projectReader, forgeCli, compatibilityContext);
}
