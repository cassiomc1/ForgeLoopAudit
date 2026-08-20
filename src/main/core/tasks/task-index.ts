import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PathBoundary } from '@main/security/path-boundary';
import { TASK_STATE_DIR, GATES_DIR } from '@shared/constants';
import type { TaskSummary, EventRecord, GateSummary } from '@shared/domain';
import { parseNdjsonSafely } from '@main/security/resource-limits';
import { buildTaskSummary, type RawTaskArtifacts } from './task-reader';
import type { EventLedgerReader } from '../events/ledger-reader';

export interface TaskIndexEntry {
  taskKey: string;
  taskId: string;
  phase: string;
  lastUpdated?: string;
}

export class TaskIndexer {
  constructor(private readonly pathBoundary: PathBoundary) {}

  listTasks(): TaskIndexEntry[] {
    const taskStateDir = this.pathBoundary.resolveForgeLoopPathLexically(TASK_STATE_DIR);
    if (!existsSync(taskStateDir)) return [];

    const entries = readdirSync(taskStateDir);
    const tasks: TaskIndexEntry[] = [];

    for (const entry of entries) {
      const taskDir = join(taskStateDir, entry);
      if (!statSync(taskDir).isDirectory()) continue;

      const taskJsonPath = join(taskDir, 'task.json');
      if (!existsSync(taskJsonPath)) continue;

      try {
        const content = this.pathBoundary.validatePath(taskJsonPath);
        const taskData = JSON.parse(readFileSync(content, 'utf8'));
        tasks.push({
          taskKey: entry,
          taskId: taskData.taskId || entry,
          phase: taskData.phase || 'UNKNOWN',
          lastUpdated: taskData.updatedAt,
        });
      } catch {
        tasks.push({
          taskKey: entry,
          taskId: entry,
          phase: 'UNKNOWN',
        });
      }
    }

    return tasks.sort((a, b) => (b.lastUpdated || '').localeCompare(a.lastUpdated || ''));
  }
}

export class TaskEventReader {
  constructor(private readonly pathBoundary: PathBoundary) {}

  readEvents(taskKey: string, limit = 1000): EventRecord[] {
    const candidate = this.pathBoundary.resolveForgeLoopPathLexically(join(TASK_STATE_DIR, taskKey, 'events.ndjson'));
    if (!existsSync(candidate)) return [];
    const eventsPath = this.pathBoundary.validatePath(candidate);

    const content = readFileSync(eventsPath, 'utf8');
    const events = parseNdjsonSafely<EventRecord>(content, limit);
    return events.reverse();
  }

  readEventsPaginated(taskKey: string, cursor?: string, limit = 100): { events: EventRecord[]; cursor?: string; hasMore: boolean } {
    const allEvents = this.readEvents(taskKey, limit * 2);
    let startIndex = 0;

    if (cursor) {
      const cursorIndex = allEvents.findIndex((e) => e.hash === cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const pageEvents = allEvents.slice(startIndex, startIndex + limit);
    const nextCursor = pageEvents.length > 0 ? pageEvents[pageEvents.length - 1].hash : undefined;
    const hasMore = startIndex + limit < allEvents.length;

    return {
      events: pageEvents,
      cursor: nextCursor,
      hasMore,
    };
  }
}

export class GateReader {
  constructor(private readonly pathBoundary: PathBoundary) {}

  readGates(taskKey: string): GateSummary[] {
    const gatesDir = this.pathBoundary.resolveForgeLoopPathLexically(join(TASK_STATE_DIR, taskKey, GATES_DIR));
    if (!existsSync(gatesDir)) return [];

    const entries = readdirSync(gatesDir).filter((e) => e.endsWith('.json'));
    const gates: GateSummary[] = [];

    for (const entry of entries) {
      const gatePath = join(gatesDir, entry);
      try {
        const validatedPath = this.pathBoundary.validatePath(gatePath);
        const content = readFileSync(validatedPath, 'utf8');
        const gateData = JSON.parse(content);

        gates.push({
          id: gateData.id || entry.replace('.json', ''),
          name: gateData.name || gateData.id || entry.replace('.json', ''),
          status: gateData.status || 'unverified',
          requiredBy: gateData.requiredBy,
          decisions: gateData.decisions,
          unknowns: gateData.unknowns,
          approvedAssumptions: gateData.approvedAssumptions,
          artifacts: gateData.artifacts,
          evidence: gateData.evidence,
        });
      } catch {
        // Skip invalid gate files
      }
    }

    return gates;
  }
}

export class TaskSnapshotBuilder {
  constructor(
    private readonly eventLedgerReader: EventLedgerReader,
    private readonly gateReader: GateReader
  ) {}

  buildSnapshot(taskKey: string, artifacts: RawTaskArtifacts, nextResult?: Record<string, unknown>): {
    summary: TaskSummary;
    events: EventRecord[];
  } {
    const summary = buildTaskSummary(taskKey, artifacts, nextResult);
    const gateDetails = this.gateReader.readGates(taskKey);
    summary.gates = [...summary.gates.filter((gate) => !gateDetails.some((detail) => detail.id === gate.id)), ...gateDetails];
    const events = this.eventLedgerReader.readEvents(taskKey);

    return { summary, events };
  }
}

export function createTaskIndexer(pathBoundary: PathBoundary): TaskIndexer {
  return new TaskIndexer(pathBoundary);
}

export function createTaskEventReader(pathBoundary: PathBoundary): TaskEventReader {
  return new TaskEventReader(pathBoundary);
}

export function createGateReader(pathBoundary: PathBoundary): GateReader {
  return new GateReader(pathBoundary);
}

export function createTaskSnapshotBuilder(
  _pathBoundary: PathBoundary,
  eventLedgerReader: EventLedgerReader,
  gateReader: GateReader
): TaskSnapshotBuilder {
  return new TaskSnapshotBuilder(eventLedgerReader, gateReader);
}
