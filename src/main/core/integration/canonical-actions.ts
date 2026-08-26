import type { ForgeLoopIntegrationAdapter } from './forgeloop-integration';
import type {
  CapabilityPolicyView,
  DurableActionEffectClass,
  DurableActionState,
  DurableActionView,
  DurableApprovalView,
  TaskActionsView,
} from '@shared/domain';

const ACTION_STATES: readonly DurableActionState[] = [
  'PROPOSED',
  'AUTHORIZED',
  'STARTED',
  'COMMITTED',
  'VERIFIED',
  'FAILED',
  'COMMIT_UNKNOWN',
  'CANCELLED',
];
const ACTION_EFFECT_CLASSES: readonly DurableActionEffectClass[] = [
  'READ_ONLY',
  'REVERSIBLE_WRITE',
  'IRREVERSIBLE_WRITE',
  'EXTERNAL_PUBLICATION',
  'DESTRUCTIVE',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function actionValue(value: unknown): DurableActionView {
  const action = isRecord(value) ? value : {};
  const rawState = stringValue(action.state);
  const rawEffectClass = stringValue(action.effectClass);
  return {
    actionId: stringValue(action.actionId) ?? 'unknown-action',
    actionFingerprint: stringValue(action.actionFingerprint),
    effectClass: ACTION_EFFECT_CLASSES.includes(rawEffectClass as DurableActionEffectClass)
      ? rawEffectClass as DurableActionEffectClass
      : 'UNKNOWN',
    capability: stringValue(action.capability),
    operation: stringValue(action.operation),
    target: stringValue(action.target),
    idempotencyKey: stringValue(action.idempotencyKey),
    requiredForCompletion: booleanValue(action.requiredForCompletion),
    requirement: stringValue(action.requirement),
    provenance: stringValue(action.provenance),
    state: ACTION_STATES.includes(rawState as DurableActionState)
      ? rawState as DurableActionState
      : 'UNKNOWN',
    revision: numberValue(action.revision),
    createdAt: stringValue(action.createdAt),
    updatedAt: stringValue(action.updatedAt),
    lastEvidenceRef: stringValue(action.lastEvidenceRef),
    lastReconciliationAt: stringValue(action.lastReconciliationAt),
    commitResultCode: stringValue(action.commitResultCode),
  };
}

function approvalValue(value: unknown): DurableApprovalView {
  const approval = isRecord(value) ? value : {};
  const status = stringValue(approval.status);
  const decision = stringValue(approval.decision);
  const authorityKind = stringValue(approval.authorityKind);
  return {
    approvalId: stringValue(approval.approvalId) ?? 'unknown-approval',
    actionId: stringValue(approval.actionId),
    actionFingerprint: stringValue(approval.actionFingerprint),
    contractFingerprint: stringValue(approval.contractFingerprint),
    taskRevision: numberValue(approval.taskRevision),
    capability: stringValue(approval.capability),
    status: status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' ? status : 'UNKNOWN',
    requestedAt: stringValue(approval.requestedAt),
    reason: stringValue(approval.reason),
    decision: decision === 'APPROVED' || decision === 'REJECTED' ? decision : null,
    resolvedAt: stringValue(approval.resolvedAt),
    authorityKind: authorityKind === 'CALLER_ACKNOWLEDGED' || authorityKind === 'HOST_ATTESTED' ? authorityKind : null,
    hostGrantRef: stringValue(approval.hostGrantRef),
  };
}

function listFromResource(data: unknown, key: string): unknown[] {
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data[key])) return data[key] as unknown[];
  return [];
}

function projectionError(code: string, message: string) {
  return { code, message };
}

function mapReadiness(metrics: Record<string, unknown> | null) {
  const actions = metrics && isRecord(metrics.actions) ? metrics.actions : null;
  if (!actions) return null;
  const count = (key: string): number | null => numberValue(actions[key]);
  return {
    total: count('total'),
    satisfied: count('trustedSatisfied'),
    unresolved: count('unresolvedRequired'),
    failed: count('failed'),
    ambiguous: count('ambiguous'),
    pending: count('pending'),
    untrusted: count('untrusted'),
    source: 'FORGELOOP_INTEGRATION' as const,
  };
}

export interface CanonicalActionsService {
  getActions(projectRoot: string, taskId: string): Promise<TaskActionsView>;
  getAction(projectRoot: string, taskId: string, actionId: string): Promise<DurableActionView | null>;
  getApprovals(projectRoot: string, taskId: string): Promise<DurableApprovalView[]>;
  getCapabilityPolicy(projectRoot: string): Promise<CapabilityPolicyView>;
}

export function createCanonicalActionsService(options: {
  integration: ForgeLoopIntegrationAdapter;
  featureSupport?: { durableActions?: boolean; approvals?: boolean; capabilityPolicy?: boolean };
}): CanonicalActionsService {
  const { integration, featureSupport } = options;

  return {
    async getActions(projectRoot, taskId): Promise<TaskActionsView> {
      if (featureSupport && featureSupport.durableActions !== true) {
        return {
          available: false,
          source: 'UNAVAILABLE',
          actions: [],
          approvals: [],
          readiness: null,
          error: projectionError('E_FEATURE_UNAVAILABLE', 'Not available with the bundled ForgeLoop capability set.'),
        };
      }
      try {
        if (!integration.readTaskActions) throw new Error('Canonical durable-action resources are not available.');
        const [actionsData, approvalsData, metricsData] = await Promise.all([
          integration.readTaskActions(projectRoot, taskId),
          featureSupport?.approvals === false || !integration.readTaskApprovals
            ? Promise.resolve<Record<string, unknown>>({ approvals: [] })
            : integration.readTaskApprovals(projectRoot, taskId),
          integration.readTaskMetrics ? integration.readTaskMetrics(projectRoot, taskId).catch(() => null) : Promise.resolve(null),
        ]);
        const metrics = isRecord(metricsData) ? metricsData : null;
        return {
          available: true,
          source: 'FORGELOOP_INTEGRATION',
          actions: listFromResource(actionsData, 'actions').map(actionValue),
          approvals: listFromResource(approvalsData, 'approvals').map(approvalValue),
          readiness: mapReadiness(metrics),
          error: null,
        };
      } catch (error) {
        return {
          available: false,
          source: 'UNAVAILABLE',
          actions: [],
          approvals: [],
          readiness: null,
          error: projectionError('E_CANONICAL_ACTIONS_INVOCATION', error instanceof Error ? error.message : String(error)),
        };
      }
    },

    async getAction(projectRoot, taskId, actionId): Promise<DurableActionView | null> {
      if (featureSupport && featureSupport.durableActions !== true) return null;
      if (!integration.readTaskAction) return null;
      try {
        return actionValue(await integration.readTaskAction(projectRoot, taskId, actionId));
      } catch {
        return null;
      }
    },

    async getApprovals(projectRoot, taskId): Promise<DurableApprovalView[]> {
      if (featureSupport && featureSupport.approvals !== true) return [];
      if (!integration.readTaskApprovals) return [];
      try {
        return listFromResource(await integration.readTaskApprovals(projectRoot, taskId), 'approvals').map(approvalValue);
      } catch {
        return [];
      }
    },

    async getCapabilityPolicy(projectRoot): Promise<CapabilityPolicyView> {
      if (featureSupport && featureSupport.capabilityPolicy !== true) {
        return {
          available: false,
          source: 'UNAVAILABLE',
          defaultDecision: null,
          rules: [],
          fingerprint: null,
          path: null,
          error: projectionError('E_FEATURE_UNAVAILABLE', 'Not available with the bundled ForgeLoop capability set.'),
        };
      }
      try {
        if (!integration.readCapabilityPolicy) throw new Error('Canonical capability-policy resource is not available.');
        const data = await integration.readCapabilityPolicy(projectRoot);
        if (!isRecord(data)) {
          return { available: true, source: 'FORGELOOP_INTEGRATION', defaultDecision: null, rules: [], fingerprint: null, path: null, error: null };
        }
        const policy = isRecord(data.policy) ? data.policy : data;
        const rules = Array.isArray(policy.rules) ? policy.rules : [];
        return {
          available: true,
          source: 'FORGELOOP_INTEGRATION',
          defaultDecision: policy.defaultDecision === 'ALLOW' || policy.defaultDecision === 'DENY' ? policy.defaultDecision : null,
          rules: rules.filter(isRecord).map((rule) => {
            const decision = stringValue(rule.decision);
            return {
              capability: stringValue(rule.capability) ?? 'unknown',
              decision: decision === 'ALLOW' || decision === 'DENY' || decision === 'REQUIRE_AUTHORITY' || decision === 'REQUIRE_APPROVAL'
                ? decision
                : 'UNKNOWN',
            };
          }),
          fingerprint: stringValue(data.fingerprint),
          path: stringValue(data.path),
          error: null,
        };
      } catch (error) {
        return {
          available: false,
          source: 'UNAVAILABLE',
          defaultDecision: null,
          rules: [],
          fingerprint: null,
          path: null,
          error: projectionError('E_CANONICAL_CAPABILITY_POLICY_INVOCATION', error instanceof Error ? error.message : String(error)),
        };
      }
    },
  };
}
