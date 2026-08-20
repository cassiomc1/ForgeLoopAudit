import { parseJsonSafely } from '@main/security/resource-limits';
import { closeSync, existsSync, fstatSync, openSync, readSync, readFileSync } from 'fs';
import { join } from 'path';
import { PathBoundary } from '@main/security/path-boundary';
import { TASK_STATE_DIR } from '@shared/constants';
import type { EventRecord, EventPage } from '@shared/domain';

const CHUNK_BYTES = 64 * 1024;

function isEventRecord(value: unknown): value is EventRecord {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return Number.isInteger(event.seq) && typeof event.schemaVersion === 'number' &&
    typeof event.protocolVersion === 'number' && typeof event.taskId === 'string' &&
    typeof event.event === 'string' && typeof event.at === 'string' &&
    (event.previousHash === null || typeof event.previousHash === 'string') && typeof event.hash === 'string';
}

export class EventLedgerReader {
  constructor(private readonly pathBoundary: PathBoundary) {}

  private eventPath(taskKey: string): string | null {
    const candidate = this.pathBoundary.resolveForgeLoopPathLexically(join(TASK_STATE_DIR, taskKey, 'events.ndjson'));
    return existsSync(candidate) ? this.pathBoundary.validatePath(candidate) : null;
  }

  readEvents(taskKey: string, limit = 1000): EventRecord[] {
    return this.readEventsPaginated(taskKey, undefined, limit).events;
  }

  readEventsPaginated(taskKey: string, cursor?: string, limit = 100): EventPage {
    const eventsPath = this.eventPath(taskKey);
    if (!eventsPath) return { events: [], hasMore: false, totalCount: 0, validation: { schema: 'NOT_RUN', chain: 'NOT_RUN' } };
    const boundedLimit = Math.min(Math.max(limit, 1), 500);
    const collected: EventRecord[] = [];
    let foundCursor = !cursor;
    let hasOlder = false;
    let pending = '';
    const fd = openSync(eventsPath, 'r');
    let position = fstatSync(fd).size;
    try {
      for (; position > 0 && (!hasOlder || collected.length < boundedLimit);) {
        const start = Math.max(0, position - CHUNK_BYTES);
        const buffer = Buffer.alloc(position - start);
        readSync(fd, buffer, 0, buffer.length, start);
        pending = buffer.toString('utf8') + pending;
        const lines = pending.split('\n');
        pending = lines.shift() || '';
        for (let index = lines.length - 1; index >= 0; index--) {
          const line = lines[index].trim();
          if (!line) continue;
          let parsed: unknown;
          try { parsed = parseJsonSafely(line); } catch { continue; }
          if (!isEventRecord(parsed)) continue;
          const event = parsed;
          if (!foundCursor) {
            if (event.hash === cursor || String(event.seq) === cursor) foundCursor = true;
            continue;
          }
          if (collected.length < boundedLimit) collected.push(event);
          else { hasOlder = true; break; }
        }
        position = start;
      }
      if (position === 0 && pending.trim()) {
        try {
          const parsed = parseJsonSafely(pending.trim());
          if (isEventRecord(parsed) && foundCursor && collected.length < boundedLimit) collected.push(parsed);
        } catch { /* incomplete or malformed append is ignored until next write */ }
      }
    } finally { closeSync(fd); }

    const nextCursor = collected.length > 0 ? collected[collected.length - 1].hash || String(collected[collected.length - 1].seq) : undefined;
    return {
      events: collected,
      cursor: nextCursor,
      hasMore: hasOlder,
      totalCount: this.getEventCount(taskKey),
      validation: { schema: collected.every(isEventRecord) ? 'VALID' : 'INVALID', chain: 'NOT_RUN' },
    };
  }

  validateIntegrity(taskKey: string): { schema: 'VALID' | 'INVALID'; chain: 'VALID' | 'INVALID' } {
    const eventsPath = this.eventPath(taskKey);
    if (!eventsPath) return { schema: 'VALID', chain: 'VALID' };
    const lines = readFileSync(eventsPath, 'utf8').split('\n').filter((line) => line.trim());
    let previous: EventRecord | undefined;
    for (const line of lines) {
      let parsed: unknown;
      try { parsed = parseJsonSafely(line); } catch { return { schema: 'INVALID', chain: 'INVALID' }; }
      if (!isEventRecord(parsed)) return { schema: 'INVALID', chain: 'INVALID' };
      const event = parsed;
      if (previous && (event.seq !== previous.seq + 1 || event.previousHash !== previous.hash || event.taskId !== previous.taskId)) return { schema: 'VALID', chain: 'INVALID' };
      previous = event;
    }
    return { schema: 'VALID', chain: 'VALID' };
  }

  getEventCount(taskKey: string): number {
    const eventsPath = this.eventPath(taskKey);
    if (!eventsPath) return 0;
    return readFileSync(eventsPath, 'utf8').split('\n').filter((line) => line.trim().length > 0).length;
  }
}

export function createEventLedgerReader(pathBoundary: PathBoundary): EventLedgerReader {
  return new EventLedgerReader(pathBoundary);
}
