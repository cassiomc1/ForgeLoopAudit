import { describe, expect, it } from 'vitest';
import type { ProjectUpdate } from '@shared/domain';
import {
  createProjectionRefreshEpochs,
  reduceProjectionRefresh,
  taskProjectionRefreshEpoch,
} from './projection-refresh';

function update(type: ProjectUpdate['type'], taskId?: string): ProjectUpdate {
  return { type, taskId, timestamp: '2026-08-30T00:00:00.000Z' };
}

describe('resource-specific renderer projection refresh', () => {
  it('keeps action and handoff changes away from selected-task attestation reads', () => {
    const initial = createProjectionRefreshEpochs();
    const action = reduceProjectionRefresh(initial, update('action-changed', 'TASK-B'));
    const handoff = reduceProjectionRefresh(initial, update('handoff-changed', 'TASK-B'));

    expect(taskProjectionRefreshEpoch(action, 'attestation', 'TASK-A')).toBe(0);
    expect(taskProjectionRefreshEpoch(handoff, 'attestation', 'TASK-A')).toBe(0);
    expect(taskProjectionRefreshEpoch(action, 'actions', 'TASK-B')).toBe(1);
    expect(taskProjectionRefreshEpoch(handoff, 'handoffs', 'TASK-B')).toBe(1);
  });

  it('refreshes verification scope without refreshing attestation', () => {
    const next = reduceProjectionRefresh(createProjectionRefreshEpochs(), update('verification-scope-changed', 'TASK-A'));
    expect(taskProjectionRefreshEpoch(next, 'verificationScope', 'TASK-A')).toBe(1);
    expect(taskProjectionRefreshEpoch(next, 'attestation', 'TASK-A')).toBe(0);
  });

  it('refreshes attestation only for the changed task', () => {
    const next = reduceProjectionRefresh(createProjectionRefreshEpochs(), update('attestation-changed', 'TASK-A'));
    expect(taskProjectionRefreshEpoch(next, 'attestation', 'TASK-A')).toBe(1);
    expect(taskProjectionRefreshEpoch(next, 'attestation', 'TASK-B')).toBe(0);
  });

  it('keeps a generic snapshot refresh separate from canonical attestation', () => {
    const next = reduceProjectionRefresh(createProjectionRefreshEpochs(), update('snapshot-refreshed'));
    expect(next.genericTask).toBe(1);
    expect(taskProjectionRefreshEpoch(next, 'attestation', 'TASK-A')).toBe(0);
  });

  it('updates approvals and actions together while preserving other resources', () => {
    const next = reduceProjectionRefresh(createProjectionRefreshEpochs(), update('approval-changed', 'TASK-A'));
    expect(taskProjectionRefreshEpoch(next, 'approvals', 'TASK-A')).toBe(1);
    expect(taskProjectionRefreshEpoch(next, 'actions', 'TASK-A')).toBe(1);
    expect(taskProjectionRefreshEpoch(next, 'evaluations', 'TASK-A')).toBe(0);
  });
});
