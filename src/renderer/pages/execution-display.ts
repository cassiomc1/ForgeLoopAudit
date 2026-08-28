import type { ExecutionRecord } from '@shared/domain';

export const NOT_RECORDED_EXECUTION_METADATA = 'Not recorded by this artifact';

export interface ExecutionProvenanceDetail {
  label: string;
  value: string;
}

function recordedValue(value: string | undefined): string {
  return typeof value === 'string' && value.length > 0
    ? value
    : NOT_RECORDED_EXECUTION_METADATA;
}

export function executionKindLabel(execution: ExecutionRecord): string {
  return recordedValue(execution.executionKind);
}

export function isolationModeLabel(execution: ExecutionRecord): string {
  return recordedValue(execution.executionIsolation ?? execution.isolation?.mode);
}

export function executionProvenanceDetails(execution: ExecutionRecord): ExecutionProvenanceDetail[] {
  const isolation = execution.isolation;
  return [
    { label: 'Execution kind', value: executionKindLabel(execution) },
    { label: 'Protocol project root', value: recordedValue(execution.protocolProjectRoot) },
    { label: 'Execution cwd', value: recordedValue(execution.cwd) },
    { label: 'Isolation mode', value: isolationModeLabel(execution) },
    { label: 'Isolated', value: isolation ? (isolation.isolated ? 'Yes' : 'No') : NOT_RECORDED_EXECUTION_METADATA },
    { label: 'Live project writable', value: isolation ? (isolation.liveProjectWritable ? 'Yes' : 'No') : NOT_RECORDED_EXECUTION_METADATA },
    { label: 'Network policy', value: recordedValue(isolation?.networkPolicy) },
    { label: 'Environment policy', value: recordedValue(isolation?.environmentPolicy) },
  ];
}
