import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ResponsibilityView, TaskHandoffsView, TaskSummary, WorkspaceBindingView } from '@shared/domain';
import { TaskBoundariesContent, type BoundaryData } from './TaskBoundariesPanel';

const task = {
  taskId: 'TASK-003',
  operationalState: 'ACTIVE',
  ownership: {
    claimState: 'ACTIVE',
    mutationAllowed: true,
    ownershipValid: true,
    historicalWriteClaims: [],
    effectiveWriteClaims: [],
    reasonCodes: [],
    source: 'FORGELOOP_INTEGRATION',
  },
} as unknown as TaskSummary;

const workspace = (status: WorkspaceBindingView['status']): WorkspaceBindingView => ({
  available: true,
  source: 'FORGELOOP_INTEGRATION',
  status,
  taskId: 'TASK-003',
  path: null,
  bindingFingerprint: 'a'.repeat(64),
  mode: 'GIT_WORKTREE',
  branchAtBind: 'main',
  headAtBind: 'b'.repeat(40),
  error: status === 'INVALID' ? { code: 'E_WORKSPACE_BINDING_INVALID', message: 'Binding is invalid.' } : null,
});

const responsibility = (status: ResponsibilityView['status']): ResponsibilityView => ({
  available: true,
  source: 'FORGELOOP_INTEGRATION',
  status,
  label: 'checkout implementation',
  allowedPaths: ['src/**'],
  readOnlyPaths: [],
  requiredCheckIds: [],
  frozenInputs: { contract: true, route: false, claims: true },
  changedPaths: ['src/checkout.ts'],
  fingerprint: 'c'.repeat(64),
  errors: status === 'INVALID' ? [{ code: 'E_RESPONSIBILITY_SCOPE_VIOLATION', message: 'Changed path is outside the responsibility.' }] : [],
});

const emptyHandoffs: TaskHandoffsView = {
  available: true,
  source: 'FORGELOOP_INTEGRATION',
  count: 0,
  handoffs: [],
  error: null,
};

function markup(data: BoundaryData): string {
  return renderToStaticMarkup(createElement(TaskBoundariesContent, { task, data }));
}

describe('Task Boundaries presentation', () => {
  it('renders neutral, success, warning and invalid workspace states', () => {
    expect(markup({ workspace: workspace('UNBOUND'), responsibility: responsibility('NOT_APPLICABLE'), handoffs: emptyHandoffs })).toContain('This is valid because workspace binding is optional.');
    expect(markup({ workspace: workspace('MATCH'), responsibility: responsibility('VALID'), handoffs: emptyHandoffs })).toContain('Current Git worktree matches the task binding.');
    expect(markup({ workspace: workspace('MISMATCH'), responsibility: responsibility('VALID'), handoffs: emptyHandoffs })).toContain('does not match the task binding');
    expect(markup({ workspace: workspace('UNAVAILABLE'), responsibility: responsibility('VALID'), handoffs: emptyHandoffs })).toContain('could not resolve the current Git worktree identity');
    expect(markup({ workspace: workspace('INVALID'), responsibility: responsibility('INVALID'), handoffs: emptyHandoffs })).toContain('E_WORKSPACE_BINDING_INVALID');
  });

  it('keeps responsibility errors and the zero-handoff state explicit', () => {
    const html = markup({ workspace: workspace('MATCH'), responsibility: responsibility('INVALID'), handoffs: emptyHandoffs });
    expect(html).toContain('E_RESPONSIBILITY_SCOPE_VIOLATION');
    expect(html).toContain('No canonical handoff snapshots recorded.');
    expect(html).toContain('Immutable protocol snapshot — not review, completion, delegation, or authority evidence.');
  });
});
