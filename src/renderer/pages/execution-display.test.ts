import { describe, expect, it } from 'vitest';
import type { ExecutionRecord } from '@shared/domain';
import {
  executionKindLabel,
  executionProvenanceDetails,
  isolationModeLabel,
} from './execution-display';

const LEGACY_EXECUTION = {} as ExecutionRecord;

const ISOLATED_EXECUTION = {
  executionKind: 'VERIFICATION',
  protocolProjectRoot: '/repo',
  cwd: '/repo/.forgeloop-isolation/worktree',
  executionIsolation: 'PROJECT_ISOLATED',
  isolation: {
    mode: 'PROJECT_ISOLATED',
    isolated: true,
    liveProjectWritable: false,
    networkPolicy: 'INHERITED',
    environmentPolicy: 'SANITIZED',
  },
} as unknown as ExecutionRecord;

describe('execution display helpers', () => {
  it('labels absent execution provenance explicitly', () => {
    expect(executionKindLabel(LEGACY_EXECUTION)).toBe('Not recorded by this artifact');
    expect(isolationModeLabel(LEGACY_EXECUTION)).toBe('Not recorded by this artifact');
  });

  it('formats persisted isolation provenance without inferring semantics', () => {
    expect(executionKindLabel(ISOLATED_EXECUTION)).toBe('VERIFICATION');
    expect(isolationModeLabel(ISOLATED_EXECUTION)).toBe('PROJECT_ISOLATED');
    expect(executionProvenanceDetails(ISOLATED_EXECUTION)).toEqual([
      { label: 'Execution kind', value: 'VERIFICATION' },
      { label: 'Protocol project root', value: '/repo' },
      { label: 'Execution cwd', value: '/repo/.forgeloop-isolation/worktree' },
      { label: 'Isolation mode', value: 'PROJECT_ISOLATED' },
      { label: 'Isolated', value: 'Yes' },
      { label: 'Live project writable', value: 'No' },
      { label: 'Network policy', value: 'INHERITED' },
      { label: 'Environment policy', value: 'SANITIZED' },
    ]);
  });
});
