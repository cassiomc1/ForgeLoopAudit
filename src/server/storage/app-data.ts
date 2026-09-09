import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type { RecentProject } from '@shared/domain';

const RECENT_PROJECT_LIMIT = 10;

/**
 * Resolve the web host's private application-data directory. The directory is
 * deliberately separate from the audited repository: project data is read
 * from the selected project, while settings, audit history, and exports are
 * owned by this local host.
 */
export function resolveApplicationDataRoot(environment: NodeJS.ProcessEnv = process.env): string {
  const override = environment.FORGELOOP_AUDIT_DATA_DIR?.trim();
  if (override) return resolve(override);

  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'ForgeLoopAudit');
  if (process.platform === 'win32') return join(environment.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'ForgeLoopAudit');
  return join(environment.XDG_STATE_HOME || join(homedir(), '.local', 'state'), 'forgeloop-audit');
}

export interface RecentProjectsStoreOptions {
  applicationDataRoot: string;
}

export class RecentProjectsStore {
  private readonly filePath: string;

  constructor(options: RecentProjectsStoreOptions) {
    this.filePath = join(resolve(options.applicationDataRoot), 'settings', 'recent-projects.json');
  }

  async list(): Promise<RecentProject[]> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter(isRecentProject).slice(0, RECENT_PROJECT_LIMIT)
        : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      return [];
    }
  }

  async add(project: RecentProject): Promise<void> {
    const current = await this.list();
    const next = [project, ...current.filter((entry) => entry.path !== project.path)].slice(0, RECENT_PROJECT_LIMIT);
    await this.write(next);
  }

  async remove(path: string): Promise<void> {
    await this.write((await this.list()).filter((entry) => entry.path !== path));
  }

  private async write(projects: RecentProject[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(projects, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  }
}

function isRecentProject(value: unknown): value is RecentProject {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.path === 'string'
    && record.path.length > 0
    && typeof record.name === 'string'
    && typeof record.lastOpenedAt === 'string'
    && (record.kind === undefined || record.kind === 'PROJECT' || record.kind === 'DEMO');
}
