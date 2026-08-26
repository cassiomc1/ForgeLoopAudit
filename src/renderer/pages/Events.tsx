import { useState, useEffect } from 'react';
import type { ProjectSnapshot, TaskSummary, EventRecord, EventPage } from '@shared/domain';
import { NoEventsState } from '../components/ui/EmptyState';
import { cn, formatDate, shortHash } from '../lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EventsProps {
  snapshot: ProjectSnapshot;
  selectedTaskId?: string | null;
  onSelectedTaskChange?: (taskId: string) => void;
}

export function Events({ snapshot, selectedTaskId, onSelectedTaskChange }: EventsProps) {
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(
    snapshot.tasks.find((t) => t.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null
  );
  useEffect(() => { setSelectedTask(snapshot.tasks.find((t) => t.taskId === selectedTaskId) || snapshot.tasks.find((t) => t.taskId === snapshot.activeTaskId) || snapshot.tasks[0] || null); }, [snapshot, selectedTaskId]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [validation, setValidation] = useState<EventPage['validation']>();

  useEffect(() => {
    if (selectedTask) {
      loadEvents(selectedTask.taskId);
    }
  }, [selectedTask]);

  const loadEvents = async (taskId: string) => {
    setLoading(true);
    try {
      const result = await window.forgeLoopStudio.getTaskEvents(taskId, undefined, 100);
      setEvents(result.events || []);
      setValidation(result.validation);
    } catch (err) {
      console.error('Failed to load events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const validateLedger = async () => {
    if (!selectedTask) return;
    try { setValidation(await window.forgeLoopStudio.validateEventLedger(selectedTask.taskId)); }
    catch { setValidation({ schema: 'INVALID', chain: 'INVALID', scope: 'LEDGER', errors: ['Ledger validation failed'] }); }
  };

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    if (filter === 'verification') return event.event.includes('VERIFICATION');
    if (filter === 'lifecycle') return event.event.includes('STARTED') || event.event.includes('COMPLETED') || event.event.includes('VALIDATED');
    if (filter === 'policy') return event.event.includes('POLICY') || event.event.includes('GATE');
    if (filter === 'diagnosis') return event.event.includes('DIAGNOSTIC') || event.event.includes('HYPOTHESIS') || event.event.includes('INTERVENTION') || event.event.includes('REFLECTION');
    if (filter === 'actions') return event.event.includes('ACTION');
    if (filter === 'approvals') return event.event.includes('APPROVAL');
    if (filter === 'trajectory') return event.event.includes('TRAJECTORY') || event.event.includes('EVALUATION') || event.event.includes('CYCLE');
    if (filter === 'continuity') return event.event.includes('CONTINUITY') || event.event.includes('RECOVERY') || event.event.includes('SESSION');
    if (filter === 'errors') return event.event.includes('REJECTED') || event.event.includes('BLOCKED') || event.event.includes('FAILED');
    return true;
  });

  const getEventColor = (event: string) => {
    if (event.includes('REJECTED') || event.includes('BLOCKED') || event.includes('FAILED') || event.includes('COMMIT_UNKNOWN')) return 'text-forge-danger';
    if (event.includes('COMPLETED') || event.includes('VALIDATED') || event.includes('SATISFIED')) return 'text-forge-success';
    if (event.includes('ACTION') || event.includes('APPROVAL')) return 'text-forge-warning';
    if (event.includes('STARTED') || event.includes('RECORDED')) return 'text-forge-accent';
    return 'text-forge-text-secondary';
  };

  if (snapshot.tasks.length === 0) {
    return <NoEventsState />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-forge-text-primary">Event Ledger</h1>
          <p className="text-sm text-forge-text-muted mt-1">Chronological engineering timeline</p>
        </div>
          <div className="flex items-center gap-3">
          <select
            className="input w-48"
            value={selectedTask?.taskId || ''}
            onChange={(e) => {
              const task = snapshot.tasks.find((t) => t.taskId === e.target.value);
              setSelectedTask(task || null);
              if (task) onSelectedTaskChange?.(task.taskId);
            }}
          >
            {snapshot.tasks.map((task) => (
              <option key={task.taskId} value={task.taskId}>
                {task.taskId}
              </option>
            ))}
            </select>
            <button className="button-secondary text-xs" onClick={() => void validateLedger()}>Validate ledger</button>
          <div className="flex items-center gap-1 bg-forge-secondary-surface rounded-6 p-0.5">
            {['all', 'verification', 'lifecycle', 'diagnosis', 'actions', 'approvals', 'trajectory', 'continuity', 'policy', 'errors'].map((f) => (
              <button
                key={f}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-4 transition-colors',
                  filter === f
                    ? 'bg-forge-accent/10 text-forge-accent'
                    : 'text-forge-text-muted hover:text-forge-text-primary'
                )}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {validation && (
        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-3 text-xs text-forge-text-secondary">
          <span>Page schema: {validation.schema}</span> · <span>Ledger chain: {validation.chain}</span>
          {validation.invalidLineCount ? <span> · Invalid lines: {validation.invalidLineCount}</span> : null}
          {validation.errors && validation.errors.length > 0 ? <p className="mt-1 text-forge-danger">{validation.errors.join(' · ')}</p> : null}
        </div>
      )}

      <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-forge-text-muted">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-sm text-forge-text-muted">No events found</div>
        ) : (
          <div className="divide-y divide-forge-border-subtle/50">
            {filteredEvents.map((event) => (
              <button
                key={event.hash}
                className={cn(
                  'w-full px-4 py-3 flex items-center gap-4 hover:bg-forge-hover-surface transition-colors text-left',
                  selectedEvent?.hash === event.hash && 'bg-forge-accent/5'
                )}
                onClick={() => setSelectedEvent(selectedEvent?.hash === event.hash ? null : event)}
              >
                <span className="text-xs font-mono text-forge-text-muted w-12">#{event.seq}</span>
                <span className={cn('text-sm font-medium flex-1', getEventColor(event.event))}>
                  {event.event}
                </span>
                <span className="text-xs text-forge-text-muted font-mono">
                  {shortHash(event.hash)}
                </span>
                <span className="text-xs text-forge-text-muted">
                  {new Date(event.at).toLocaleTimeString()}
                </span>
                {selectedEvent?.hash === event.hash ? (
                  <ChevronUp className="w-4 h-4 text-forge-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-forge-text-muted" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Event Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-forge-text-muted mb-1">Sequence</p>
              <p className="text-sm font-mono text-forge-text-primary">#{selectedEvent.seq}</p>
            </div>
            <div>
              <p className="text-xs text-forge-text-muted mb-1">Event</p>
              <p className="text-sm text-forge-text-primary">{selectedEvent.event}</p>
            </div>
            <div>
              <p className="text-xs text-forge-text-muted mb-1">Timestamp</p>
              <p className="text-sm font-mono text-forge-text-primary">{formatDate(selectedEvent.at)}</p>
            </div>
            <div>
              <p className="text-xs text-forge-text-muted mb-1">Task</p>
              <p className="text-sm font-mono text-forge-text-primary">{selectedEvent.taskId}</p>
            </div>
            <div>
              <p className="text-xs text-forge-text-muted mb-1">Hash</p>
              <p className="text-sm font-mono text-forge-text-primary break-all">{selectedEvent.hash}</p>
            </div>
            <div>
              <p className="text-xs text-forge-text-muted mb-1">Previous Hash</p>
              <p className="text-sm font-mono text-forge-text-primary break-all">
                {selectedEvent.previousHash || 'None'}
              </p>
            </div>
            {selectedEvent.fingerprint && (
              <div>
                <p className="text-xs text-forge-text-muted mb-1">Fingerprint</p>
                <p className="text-sm font-mono text-forge-text-primary break-all">{selectedEvent.fingerprint}</p>
              </div>
            )}
          </div>
          {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-forge-text-muted mb-2">Details</p>
              <pre className="text-xs text-forge-text-secondary font-mono bg-forge-secondary-surface rounded-6 p-3 overflow-auto max-h-[200px]">
                {JSON.stringify(selectedEvent.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
