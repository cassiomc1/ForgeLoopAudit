import { parseJsonSafely } from '@main/security/resource-limits';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PathBoundary } from '@main/security/path-boundary';
import { TASK_STATE_DIR } from '@shared/constants';
import type { EventRecord, EventPage } from '@shared/domain';

export class EventLedgerReader {
  constructor(private readonly pathBoundary: PathBoundary) {}

  readEvents(taskKey: string, limit = 1000): EventRecord[] {
    const candidate = this.pathBoundary.resolveForgeLoopPathLexically(join(TASK_STATE_DIR, taskKey, 'events.ndjson'));
    if (!existsSync(candidate)) return [];
    const eventsPath = this.pathBoundary.validatePath(candidate);

    const content = readFileSync(eventsPath, 'utf8');
    const lines = content.split('\n').filter((line, index, all) => line.trim().length > 0 && !(index === all.length - 1 && !line.endsWith('\n')));
    const events = lines.map((line) => parseJsonSafely<EventRecord>(line)).slice(-limit);
    return events.reverse();
  }

  readEventsPaginated(taskKey: string, cursor?: string, limit = 100): EventPage {
    const allEvents = this.readEvents(taskKey, Number.MAX_SAFE_INTEGER);
    let startIndex = 0;

    if (cursor) {
      const cursorIndex = allEvents.findIndex((e) => e.hash === cursor || String(e.seq) === cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const pageEvents = allEvents.slice(startIndex, startIndex + limit);
    const nextCursor = pageEvents.length > 0 ? (pageEvents[pageEvents.length - 1].hash || String(pageEvents[pageEvents.length - 1].seq)) : undefined;
    const hasMore = startIndex + limit < allEvents.length;

    return {
      events: pageEvents,
      cursor: nextCursor,
      hasMore,
      totalCount: allEvents.length,
    };
  }

  getEventCount(taskKey: string): number {
    const candidate = this.pathBoundary.resolveForgeLoopPathLexically(join(TASK_STATE_DIR, taskKey, 'events.ndjson'));
    if (!existsSync(candidate)) {
      return 0;
    }
    const eventsPath = this.pathBoundary.validatePath(candidate);
    const content = readFileSync(eventsPath, 'utf8');
    return content.split('\n').filter((line: string) => line.trim().length > 0).length;
  }
}

export function createEventLedgerReader(pathBoundary: PathBoundary): EventLedgerReader {
  return new EventLedgerReader(pathBoundary);
}
