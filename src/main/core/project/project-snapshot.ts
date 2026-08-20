import { PathBoundary } from '@main/security/path-boundary';
import { basename } from 'path';
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

export class ProjectSnapshotBuilder {
  constructor(
    private readonly pathBoundary: PathBoundary,
    private readonly projectReader: ProjectReader,
    private readonly forgeCli: ForgeCli
  ) {}

  async build(): Promise<ProjectSnapshot> {
    const config = this.projectReader.readConfig();
    const taskKeys = this.projectReader.listTaskKeys();

    const protocolSummary: ProtocolSummary = checkProtocolCompatibility({
      protocolVersion: config.protocolVersion,
      schemaVersion: config.schemaVersion,
      compatible: true,
    });

    const projectSummary: ProjectSummary = {
      name: config.projectName || basename(this.pathBoundary.getProjectRoot()) || 'Unknown Project',
      rootPath: this.pathBoundary.getProjectRoot(),
      branch: await this.getGitBranch(),
      head: await this.getGitHead(),
    };

    const sessions = this.buildSessions();
    const tasks: TaskSummary[] = [];
    let activeTaskId: string | undefined;

    for (const taskKey of taskKeys) {
      try {
        const artifacts = this.projectReader.readTaskArtifacts(taskKey);
        const nextResult = await this.forgeCli.next(String((artifacts['task.json'] as Record<string, unknown>)?.taskId || taskKey));
        const taskSummary = buildTaskSummary(taskKey, artifacts as any, nextResult.success ? nextResult.data as Record<string, unknown> : undefined);
        tasks.push(taskSummary);

        if (!activeTaskId && (taskSummary.phase !== 'COMPLETE' && taskSummary.phase !== 'BLOCKED')) {
          activeTaskId = taskSummary.taskId;
        }
      } catch (error) {
        console.warn(`Failed to build summary for task ${taskKey}:`, error);
      }
    }

    const health = this.buildHealth(tasks, protocolSummary);
    const policy = this.buildPolicy();

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
          isActive: undefined,
        };
      } catch {
        return { id, createdAt: '', isActive: false };
      }
    });
  }

  private buildHealth(tasks: TaskSummary[], protocol: ProtocolSummary): ProjectHealth {
    const hasActiveTasks = tasks.some((t) => t.phase !== 'COMPLETE' && t.phase !== 'BLOCKED');
    const hasBlockedTasks = tasks.some((t) => t.phase === 'BLOCKED');

    let status: ProjectHealth['status'] = 'VALID';

    if (!protocol.compatible) {
      status = 'INVALID';
    } else if (hasBlockedTasks) {
      status = 'INCONSISTENT';
    } else if (tasks.length === 0) {
      status = 'INCOMPLETE';
    } else if (!hasActiveTasks && tasks.every((t) => t.phase === 'COMPLETE')) {
      status = 'VALID';
    } else if (hasActiveTasks) {
      status = 'INCOMPLETE';
    }

    return {
      status,
      protocol: protocol.compatible,
      state: tasks.length > 0,
      evidence: tasks.length > 0,
      policy: undefined,
      continuity: tasks.every((t) => Boolean(t.continuity)),
    };
  }

  private buildPolicy(): PolicySummary | undefined {
    const policy = this.projectReader.readGlobalPolicy();
    const rules = policy['rules.json'];
    const config = this.projectReader.readConfig();
    const ruleCount = rules && typeof rules === 'object' && Array.isArray((rules as Record<string, unknown>).rules) ? ((rules as Record<string, unknown>).rules as unknown[]).length : undefined;
    const baseline = policy['baseline.json'];
    const lock = policy['policy.lock'];
    return {
      complianceMode: typeof (config as unknown as Record<string, unknown>).complianceMode === 'string' ? String((config as unknown as Record<string, unknown>).complianceMode) : 'Unknown',
      ruleCount,
      baselineStatus: baseline && !(baseline as Record<string, unknown>)._invalid ? 'valid' : 'unknown',
      lockStatus: lock && !(lock as Record<string, unknown>)._invalid ? 'valid' : 'unknown',
      driftCount: 0,
      taskSnapshot: policy,
    };
  }

  private async getGitBranch(): Promise<string | undefined> {
    try {
      const { spawnSync } = require('child_process');
      const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: this.pathBoundary.getProjectRoot(),
        encoding: 'utf8',
        timeout: 5000,
      });
      if (result.status === 0 && result.stdout) {
        return result.stdout.trim();
      }
    } catch {
      // Ignore
    }
    return undefined;
  }

  private async getGitHead(): Promise<string | undefined> {
    try {
      const { spawnSync } = require('child_process');
      const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: this.pathBoundary.getProjectRoot(),
        encoding: 'utf8',
        timeout: 5000,
      });
      if (result.status === 0 && result.stdout) {
        return result.stdout.trim();
      }
    } catch {
      // Ignore
    }
    return undefined;
  }
}

export function createProjectSnapshotBuilder(
  pathBoundary: PathBoundary,
  projectReader: ProjectReader,
  forgeCli: ForgeCli
): ProjectSnapshotBuilder {
  return new ProjectSnapshotBuilder(pathBoundary, projectReader, forgeCli);
}
