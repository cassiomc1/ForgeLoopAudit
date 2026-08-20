import { PHASE_ORDER } from '@shared/domain';
import type { TaskSummary, ForgeLoopPhase, EvidenceCoverageSummary, BlockerSummary, FailureSummary, CheckSummary, GateSummary, NextActionSummary, ContinuitySummary, ContinuityWorkItem } from '@shared/domain';
import type { AllowedArtifact } from '@shared/domain';

export interface RawTaskArtifacts {
  'task.json'?: Record<string, unknown>;
  'contract.json'?: Record<string, unknown>;
  'routing-result.json'?: Record<string, unknown>;
  'preflight.json'?: Record<string, unknown>;
  'work-state.json'?: Record<string, unknown>;
  'continuity.json'?: Record<string, unknown>;
  'execution-receipt.json'?: Record<string, unknown>;
  'policy-snapshot.json'?: Record<string, unknown>;
  'events.ndjson'?: string;
}

function safeString(obj: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = obj?.[key];
  return typeof value === 'string' ? value : undefined;
}

function safeStringArray(obj: Record<string, unknown> | undefined, key: string): string[] {
  const value = obj?.[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function safeNumber(obj: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = obj?.[key];
  return typeof value === 'number' ? value : undefined;
}

function parsePhase(value: unknown): ForgeLoopPhase | undefined {
  if (typeof value !== 'string') return undefined;
  return PHASE_ORDER[value as ForgeLoopPhase] !== undefined ? (value as ForgeLoopPhase) : undefined;
}

function buildEvidenceCoverage(workState: Record<string, unknown> | undefined): EvidenceCoverageSummary {
  const evidenceCoverage = workState?.evidenceCoverage as unknown[] | undefined;
  if (!Array.isArray(evidenceCoverage)) {
    return { total: 0, covered: 0, partial: 0, notVerified: 0, blocked: 0, coveragePercent: 0 };
  }

  let covered = 0;
  let partial = 0;
  let notVerified = 0;
  let blocked = 0;

  for (const item of evidenceCoverage) {
    if (item && typeof item === 'object' && 'status' in item) {
      const status = String(item.status);
      switch (status) {
        case 'COVERED':
          covered++;
          break;
        case 'PARTIAL':
          partial++;
          break;
        case 'NOT_VERIFIED':
          notVerified++;
          break;
        case 'BLOCKED':
          blocked++;
          break;
        default:
          notVerified++;
      }
    }
  }

  const total = evidenceCoverage.length;
  const coveragePercent = total > 0 ? Math.round(((covered + partial * 0.5) / total) * 100) : 0;

  return { total, covered, partial, notVerified, blocked, coveragePercent };
}

function buildBlockers(workState: Record<string, unknown> | undefined): BlockerSummary[] {
  const blockers = workState?.blockers as unknown[] | undefined;
  if (!Array.isArray(blockers)) return [];

  return blockers
    .filter((b): b is Record<string, unknown> => b !== null && typeof b === 'object')
    .map((b) => ({
      id: safeString(b, 'id') || 'unknown',
      message: safeString(b, 'message') || safeString(b, 'reason') || 'Unknown blocker',
      phase: parsePhase(b.phase),
    }));
}

function buildFailures(workState: Record<string, unknown> | undefined): FailureSummary[] {
  const failures = workState?.failures as unknown[] | undefined;
  if (!Array.isArray(failures)) return [];

  return failures
    .filter((f): f is Record<string, unknown> => f !== null && typeof f === 'object')
    .map((f) => ({
      id: safeString(f, 'id') || 'unknown',
      message: safeString(f, 'message') || safeString(f, 'reason') || 'Unknown failure',
      phase: parsePhase(f.phase),
      verificationCycle: safeNumber(f, 'verificationCycle'),
    }));
}

function buildChecks(workState: Record<string, unknown> | undefined): CheckSummary[] {
  const checks = workState?.checks as unknown[] | undefined;
  if (!Array.isArray(checks)) return [];

  return checks
    .filter((c): c is Record<string, unknown> => c !== null && typeof c === 'object')
    .map((c) => ({
      id: safeString(c, 'id') || 'unknown',
      requirement: safeString(c, 'requirement') || safeString(c, 'text') || 'Unknown requirement',
      status: (safeString(c, 'status') as CheckSummary['status']) || 'not-run',
      evidenceKind: (safeString(c, 'evidenceKind') as CheckSummary['evidenceKind']) || 'NOT_VERIFIED',
      verificationCycle: safeNumber(c, 'verificationCycle'),
      timestamp: safeString(c, 'timestamp'),
    }));
}

function buildGates(workState: Record<string, unknown> | undefined, preflight: Record<string, unknown> | undefined): GateSummary[] {
  const requiredGates = safeStringArray(preflight, 'requiredGates');
  const satisfiedGates = safeStringArray(preflight, 'satisfiedGates');
  const gates = workState?.gates as unknown[] | undefined;

  const gateMap = new Map<string, GateSummary>();

  for (const gateId of requiredGates) {
    const satisfied = satisfiedGates.includes(gateId);
    gateMap.set(gateId, {
      id: gateId,
      name: gateId,
      status: satisfied ? 'satisfied' : 'unverified',
    });
  }

  if (Array.isArray(gates)) {
    for (const gate of gates) {
      if (gate && typeof gate === 'object') {
        const gateObj = gate as Record<string, unknown>;
        const id = safeString(gateObj, 'id') || safeString(gateObj, 'name');
        if (id) {
          const existing = gateMap.get(id);
          gateMap.set(id, {
            id,
            name: safeString(gateObj, 'name') || id,
            status: (safeString(gateObj, 'status') as GateSummary['status']) || existing?.status || 'unverified',
            requiredBy: safeStringArray(gateObj, 'requiredBy'),
            decisions: safeStringArray(gateObj, 'decisions'),
            unknowns: safeStringArray(gateObj, 'unknowns'),
            approvedAssumptions: safeStringArray(gateObj, 'approvedAssumptions'),
            artifacts: safeStringArray(gateObj, 'artifacts'),
            evidence: safeStringArray(gateObj, 'evidence'),
          });
        }
      }
    }
  }

  return Array.from(gateMap.values());
}

function buildNextAction(_workState: Record<string, unknown> | undefined, nextResult: Record<string, unknown> | undefined): NextActionSummary | undefined {
  if (nextResult) {
    const action = safeString(nextResult, 'nextAction');
    if (!action) return undefined;
    const terminal = nextResult.terminal === true || action === 'NONE';
    return { type: terminal ? 'terminal' : 'progress', action, terminal, currentPhase: parsePhase(nextResult.currentPhase), reasonCodes: safeStringArray(nextResult, 'reasonCodes'), missingArtifacts: safeStringArray(nextResult, 'missingArtifacts'), commandSynopses: safeStringArray(nextResult, 'commands'), reasons: Array.isArray(nextResult.reasons) ? nextResult.reasons as NextActionSummary['reasons'] : [] };
  }
  return undefined;
}

function parseWorkItems(value: unknown): ContinuityWorkItem[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object').map((item) => ({ id: safeString(item, 'id') || 'unknown', summary: safeString(item, 'summary') || 'Unknown work item' })) : [];
}

function buildContinuity(continuity: Record<string, unknown> | undefined): ContinuitySummary | undefined {
  if (!continuity) return undefined;

  return {
    taskId: safeString(continuity, 'taskId'),
    phase: safeString(continuity, 'phase'),
    updatedAt: safeString(continuity, 'updatedAt'),
    currentFocus: continuity.currentFocus,
    remainingWork: parseWorkItems(continuity.remainingWork),
    knownIssues: parseWorkItems(continuity.knownIssues),
    changedAreas: safeStringArray(continuity, 'changedAreas'),
    inspectFirst: safeStringArray(continuity, 'inspectFirst'),
    resumeNote: safeString(continuity, 'resumeNote'),
    repositoryFingerprint: continuity.repositoryFingerprint,
    verificationCycle: safeNumber(continuity, 'verificationCycle'),
  };
}

export function buildTaskSummary(
  taskKey: string,
  artifacts: RawTaskArtifacts,
  nextResult?: Record<string, unknown>
): TaskSummary {
  const taskJson = artifacts['task.json'];
  const workState = artifacts['work-state.json'];
  const preflight = artifacts['preflight.json'];
  const continuity = artifacts['continuity.json'];

  const taskId = safeString(taskJson, 'taskId') || taskKey;
  const phase = parsePhase(workState?.phase) || parsePhase(taskJson?.phase) || 'RECEIVED';
  const previousPhase = parsePhase(workState?.previousPhase);

  const evidenceCoverage = buildEvidenceCoverage(workState);
  const blockers = buildBlockers(workState);
  const failures = buildFailures(workState);
  const checks = buildChecks(workState);
  const gates = buildGates(workState, preflight);
  const nextAction = buildNextAction(workState, nextResult);
  const continuitySummary = buildContinuity(continuity);

  return {
    taskId,
    taskKey,
    objective: safeString(artifacts['contract.json'], 'objective'),
    phase,
    previousPhase,
    selectedGuides: safeStringArray(workState, 'selectedGuides'),
    completedSteps: safeStringArray(workState, 'completedSteps'),
    pendingSteps: safeStringArray(workState, 'pendingSteps'),
    blockers,
    failures,
    checks,
    gates,
    evidenceCoverage,
    verificationCycle: safeNumber(workState, 'verificationCycle'),
    publicationStatus: safeString(workState, 'publicationStatus'),
    lastUpdated: safeString(workState, 'lastUpdated'),
    nextAction,
    continuity: continuitySummary,
    writeClaims: safeStringArray(taskJson, 'writeClaims'),
    policySnapshot: artifacts['policy-snapshot.json'],
  };
}

export function getRawArtifact(artifacts: RawTaskArtifacts, artifact: AllowedArtifact): string | undefined {
  const key = artifact as keyof RawTaskArtifacts;
  const value = artifacts[key];
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}
