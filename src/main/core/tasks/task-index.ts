import { readdirSync, lstatSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PathBoundary } from '@main/security/path-boundary';
import { TASK_STATE_DIR, GATES_DIR } from '@shared/constants';
import type { TaskSummary, EventRecord, GateSummary } from '@shared/domain';
import { parseJsonSafely, parseNdjsonSafely } from '@main/security/resource-limits';
import { buildTaskSummary, type RawTaskArtifacts } from './task-reader';
import type { EventLedgerReader } from '../events/ledger-reader';
import type { ProjectReader } from '../project/project-reader';
import { SchemaValidator } from '../protocol/validator';

export interface TaskIndexEntry {
  taskKey: string;
  taskId: string;
  phase: string;
  lastUpdated?: string;
}

export class TaskIndexer {
  constructor(
    private readonly pathBoundary: PathBoundary,
    private readonly projectReader: ProjectReader
  ) {}

  listTasks(): TaskIndexEntry[] {
    const taskStateDir = this.pathBoundary.resolveForgeLoopPathLexically(TASK_STATE_DIR);
    if (!existsSync(taskStateDir)) return [];

    const entries = readdirSync(taskStateDir);
    const tasks: TaskIndexEntry[] = [];

    for (const entry of entries) {
      const taskDir = join(taskStateDir, entry);
      try {
        if (!lstatSync(taskDir).isDirectory() || lstatSync(taskDir).isSymbolicLink()) continue;
        this.pathBoundary.validatePath(taskDir);
      } catch { continue; }

      const taskJsonPath = join(taskDir, 'task.json');
      if (!existsSync(taskJsonPath)) continue;

      try {
        const taskData = this.projectReader.readTaskDescriptor(entry);
        tasks.push({
          taskKey: entry,
          taskId: typeof taskData.taskId === 'string' ? taskData.taskId : entry,
          phase: typeof taskData.phase === 'string' ? taskData.phase : 'UNKNOWN',
          lastUpdated: typeof taskData.updatedAt === 'string' ? taskData.updatedAt : undefined,
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
  constructor(
    private readonly pathBoundary: PathBoundary,
    private readonly validator: SchemaValidator
  ) {}

  readGates(taskKey: string): GateSummary[] {
    const gatesDir = this.pathBoundary.resolveForgeLoopPathLexically(join(TASK_STATE_DIR, taskKey, GATES_DIR));
    if (!existsSync(gatesDir)) return [];

    const entries = readdirSync(gatesDir).filter((e) => e.endsWith('.json'));
    const gates: GateSummary[] = [];

    for (const entry of entries) {
      const gatePath = join(gatesDir, entry);
      try {
        if (!lstatSync(gatePath).isFile() || lstatSync(gatePath).isSymbolicLink()) continue;
        const validatedPath = this.pathBoundary.validatePath(gatePath);
        const gateData = parseJsonSafely<Record<string, unknown>>(readFileSync(validatedPath, 'utf8'));
        const validation = this.validator.validate('gate.schema.json', gateData);
        if (!validation.valid) continue;

        gates.push({
          id: typeof gateData.gate === 'string' ? gateData.gate : entry.replace('.json', ''),
          name: typeof gateData.gate === 'string' ? gateData.gate : entry.replace('.json', ''),
          status: gateData.status as GateSummary['status'],
          requiredBy: gateData.requiredBy as string[],
          decisions: gateData.decisions as string[],
          unknowns: gateData.unknowns as string[],
          approvedAssumptions: gateData.approvedAssumptions as string[],
          artifacts: gateData.artifacts as GateSummary['artifacts'],
          evidence: gateData.evidence as GateSummary['evidence'],
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

export function createTaskIndexer(pathBoundary: PathBoundary, projectReader: ProjectReader): TaskIndexer {
  return new TaskIndexer(pathBoundary, projectReader);
}

export function createTaskEventReader(pathBoundary: PathBoundary): TaskEventReader {
  return new TaskEventReader(pathBoundary);
}

export function createGateReader(pathBoundary: PathBoundary, validator: SchemaValidator): GateReader {
  return new GateReader(pathBoundary, validator);
}

export function createTaskSnapshotBuilder(
  _pathBoundary: PathBoundary,
  eventLedgerReader: EventLedgerReader,
  gateReader: GateReader
): TaskSnapshotBuilder {
  return new TaskSnapshotBuilder(eventLedgerReader, gateReader);
}
