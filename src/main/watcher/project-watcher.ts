import { join, relative, sep } from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import { PathBoundary } from '@main/security/path-boundary';
import { TASK_STATE_DIR, SESSIONS_DIR, POLICY_DIR } from '@shared/constants';
import { ChangeCoalescer, type CoalescedChange } from './change-coalescer';
import { ForgeLoopStudioError } from '@shared/errors';
import { WATCHER_RETRY_MS, WATCHER_MAX_RETRIES } from '@shared/constants';

export interface WatcherEvent {
  type: 'artifact-changed' | 'task-added' | 'task-removed' | 'event-appended' | 'policy-changed' | 'session-changed' | 'execution-changed' | 'action-changed' | 'approval-changed' | 'evaluation-changed' | 'capability-policy-changed';
  taskKey?: string;
  artifact?: string;
  path: string;
}

export class ProjectWatcher {
  private watcher: FSWatcher | null = null;
  private readonly coalescer: ChangeCoalescer;
  private readonly pathBoundary: PathBoundary;
  private readonly forgeLoopRoot: string;
  private isActive = false;
  private retryCount = 0;

  constructor(
    pathBoundary: PathBoundary,
    private readonly onEvent: (event: WatcherEvent) => void,
    private readonly onError: (error: Error) => void,
    private readonly onStatusChange: (active: boolean) => void
  ) {
    this.pathBoundary = pathBoundary;
    this.forgeLoopRoot = pathBoundary.validateForgeLoopPath('');
    this.coalescer = new ChangeCoalescer();
    this.coalescer.on('coalesced', this.handleCoalescedChanges.bind(this));
  }

  start(): void {
    if (this.isActive) return;

    try {
      const watchPaths = [
        join(this.forgeLoopRoot, '*.json'),
        join(this.forgeLoopRoot, TASK_STATE_DIR, '**', '*.json'),
        join(this.forgeLoopRoot, TASK_STATE_DIR, '**', '*.ndjson'),
        join(this.forgeLoopRoot, SESSIONS_DIR, '*.json'),
        join(this.forgeLoopRoot, POLICY_DIR, '**', '*.json'),
        join(this.forgeLoopRoot, POLICY_DIR, 'policy.lock'),
      ];

      this.watcher = chokidar.watch(watchPaths, {
        ignored: [
          join(this.forgeLoopRoot, '.txn', '**'),
          join(this.forgeLoopRoot, '*.log'),
          join(this.forgeLoopRoot, '*.tmp'),
        ],
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 50,
          pollInterval: 20,
        },
        depth: 10,
      });

      this.watcher
        .on('add', (path) => this.handleFileChange(path, 'add'))
        .on('change', (path) => this.handleFileChange(path, 'change'))
        .on('unlink', (path) => this.handleFileChange(path, 'unlink'))
        .on('addDir', (path) => this.handleDirChange(path, 'add'))
        .on('unlinkDir', (path) => this.handleDirChange(path, 'unlink'))
        .on('error', (error) => this.handleError(error))
        .on('ready', () => {
          this.isActive = true;
          this.retryCount = 0;
          this.onStatusChange(true);
        });

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.coalescer.destroy();
    this.isActive = false;
    this.onStatusChange(false);
  }

  private handleFileChange(path: string, changeType: 'add' | 'change' | 'unlink'): void {
    try {
      const validatedPath = changeType === 'unlink'
        ? this.pathBoundary.validateLexicalPath(path)
        : this.pathBoundary.validatePath(path);
      this.coalescer.addChange({
        type: 'file',
        path: validatedPath,
        changeType,
        timestamp: Date.now(),
      });
    } catch {
      // Ignore paths outside boundary
    }
  }

  private handleDirChange(path: string, changeType: 'add' | 'unlink'): void {
    try {
      const validatedPath = changeType === 'unlink'
        ? this.pathBoundary.validateLexicalPath(path)
        : this.pathBoundary.validatePath(path);
      this.coalescer.addChange({
        type: 'directory',
        path: validatedPath,
        changeType,
        timestamp: Date.now(),
      });
    } catch {
      // Ignore paths outside boundary
    }
  }

  private handleCoalescedChanges(changes: CoalescedChange[]): void {
    for (const change of changes) {
      const event = this.classifyChange(change);
      if (event) {
        this.onEvent(event);
      }
    }
  }

  private classifyChange(change: CoalescedChange): WatcherEvent | null {
    const relativePath = relative(this.forgeLoopRoot, change.path).split(sep).join('/');

    if (relativePath.startsWith(TASK_STATE_DIR + '/')) {
      const parts = relativePath.split('/');
      if (parts.length >= 2) {
        const taskKey = parts[1];

        if (change.path.endsWith('events.ndjson')) {
          return {
            type: 'event-appended',
            taskKey,
            artifact: 'events.ndjson',
            path: change.path,
          };
        }

        // Execution provenance artifacts live in their own per-task
        // directory; they get a lightweight bounded event instead of a full
        // snapshot rebuild so bursts never trigger rebuild storms.
        if (parts.length >= 3 && parts[2] === 'executions' && change.path.endsWith('.json')) {
          return {
            type: 'execution-changed',
            taskKey,
            artifact: parts[parts.length - 1],
            path: change.path,
          };
        }

        if (parts.length >= 3 && parts[2] === 'actions' && /^action-[A-Za-z0-9_-]+\.json$/.test(parts[parts.length - 1])) {
          return {
            type: 'action-changed',
            taskKey,
            artifact: parts[parts.length - 1],
            path: change.path,
          };
        }

        if (parts.length >= 3 && parts[2] === 'approvals' && /^approval-[A-Za-z0-9_-]+\.json$/.test(parts[parts.length - 1])) {
          return {
            type: 'approval-changed',
            taskKey,
            artifact: parts[parts.length - 1],
            path: change.path,
          };
        }

        if (parts.length >= 3 && parts[2] === 'evaluations' && /^eval-[A-Za-z0-9_-]+\.json$/.test(parts[parts.length - 1])) {
          return {
            type: 'evaluation-changed',
            taskKey,
            artifact: parts[parts.length - 1],
            path: change.path,
          };
        }

        if (change.path.endsWith('recovery.json')) {
          return {
            type: 'artifact-changed',
            taskKey,
            artifact: 'recovery.json',
            path: change.path,
          };
        }

        if (change.path.endsWith('.json')) {
          const artifact = parts[parts.length - 1];
          return {
            type: 'artifact-changed',
            taskKey,
            artifact,
            path: change.path,
          };
        }

        if (change.type === 'directory' && change.changeType === 'add' && parts.length === 2) {
          return {
            type: 'task-added',
            taskKey,
            path: change.path,
          };
        }

        if (change.type === 'directory' && change.changeType === 'unlink' && parts.length === 2) {
          return {
            type: 'task-removed',
            taskKey,
            path: change.path,
          };
        }
      }
    }

    if (relativePath.startsWith(SESSIONS_DIR + '/')) {
      return {
        type: 'session-changed',
        path: change.path,
      };
    }

    if (relativePath === `${POLICY_DIR}/capabilities.json`) {
      return {
        type: 'capability-policy-changed',
        path: change.path,
      };
    }

    if (relativePath.startsWith(POLICY_DIR + '/')) {
      return {
        type: 'policy-changed',
        path: change.path,
      };
    }

    if (relativePath === 'config.json' || relativePath === 'sources.json') {
      return {
        type: 'artifact-changed',
        artifact: relativePath,
        path: change.path,
      };
    }

    return null;
  }

  private handleError(error: Error): void {
    this.isActive = false;
    void this.watcher?.close();
    this.watcher = null;
    this.onError(error);

    if (this.retryCount < WATCHER_MAX_RETRIES) {
      this.retryCount++;
      setTimeout(() => {
        if (!this.isActive) {
          this.start();
        }
      }, WATCHER_RETRY_MS * this.retryCount);
    } else {
      this.onStatusChange(false);
      this.onError(ForgeLoopStudioError.watcherFailed(`Max retries exceeded: ${error.message}`));
    }
  }

  getStatus(): { active: boolean; forgeLoopRoot: string } {
    return {
      active: this.isActive,
      forgeLoopRoot: this.forgeLoopRoot,
    };
  }
}

export function createProjectWatcher(
  pathBoundary: PathBoundary,
  onEvent: (event: WatcherEvent) => void,
  onError: (error: Error) => void,
  onStatusChange: (active: boolean) => void
): ProjectWatcher {
  return new ProjectWatcher(pathBoundary, onEvent, onError, onStatusChange);
}
