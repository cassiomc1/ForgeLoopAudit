import { assertSchemaValid, fingerprint, serializeJson, sha256FileBytes, taskKeyFor } from './fixtures.mjs';
import { EventLedgerBuilder } from './event-builder.mjs';

const BRANCH = 'main';
const HEAD = '3f9c1d2e77a4b5089c6e12ab34f5d6e7890abcde';

function repositoryFingerprint() {
  return { branch: BRANCH, head: HEAD };
}

function baseArtifact(taskId) {
  return { schemaVersion: 1, protocolVersion: 1, taskId };
}

function taskDescriptor(taskId, createdAt, updatedAt) {
  return { ...baseArtifact(taskId), taskKey: taskKeyFor(taskId), createdAt, updatedAt, writeClaims: [] };
}

function contract(taskId, shape) {
  return {
    ...baseArtifact(taskId),
    objective: shape.objective,
    deliverables: shape.deliverables,
    constraints: shape.constraints,
    risks: shape.risks,
    verification: shape.verification,
    successCriteria: shape.successCriteria,
    stopConditions: shape.stopConditions,
    unresolvedDecisions: shape.unresolvedDecisions,
    sourceRefs: shape.sourceRefs,
  };
}

function routingResult(taskId, primary, guides, reasons) {
  return {
    schemaVersion: 1,
    protocolVersion: 1,
    contractFingerprint: fingerprint(`contract:${taskId}`),
    input: { taskId, project: 'forgehop' },
    primary,
    guides,
    reasons,
    excluded: {},
  };
}

function preflight(taskId, { status = 'READY', requiredGates = [], satisfiedGates = [], errors = [] } = {}) {
  return {
    ...baseArtifact(taskId),
    status,
    profile: { languages: ['typescript'], framework: 'vite-react', packageManager: 'npm' },
    contract: { fingerprint: fingerprint(`contract:${taskId}`), objectivePresent: true },
    routing: { primary: 'implementation', guidesSelected: true },
    requiredGates,
    satisfiedGates,
    errors,
  };
}

const WORK_STATE_OPTIONAL_FIELDS = [
  'routeFingerprint',
  'previousPhase',
  'diagnosedHypothesis',
  'verificationCycle',
  'lastCompletionAttempt',
  'publicationStatus',
  'revision',
];

function workState(taskId, shape) {
  return {
    schemaVersion: 1,
    protocolVersion: 1,
    taskId,
    contractFingerprint: fingerprint(`contract:${taskId}`),
    routeFingerprint: fingerprint(`route:${taskId}`),
    repositoryFingerprint: repositoryFingerprint(),
    phase: shape.phase,
    selectedGuides: shape.selectedGuides ?? [],
    requiredGates: shape.requiredGates ?? [],
    satisfiedGates: shape.satisfiedGates ?? [],
    complianceMode: 'standard',
    completedSteps: shape.completedSteps ?? [],
    pendingSteps: shape.pendingSteps ?? [],
    checks: shape.checks ?? [],
    failures: shape.failures ?? [],
    blockers: shape.blockers ?? [],
    evidenceCoverage: shape.evidenceCoverage ?? [],
    lastUpdated: shape.lastUpdated,
    ...Object.fromEntries(
      WORK_STATE_OPTIONAL_FIELDS.filter((field) => shape[field] !== undefined).map((field) => [field, shape[field]]),
    ),
  };
}

function continuity(taskId, phase, updatedAt, shape) {
  return {
    ...baseArtifact(taskId),
    workStateFingerprint: fingerprint(`work-state:${taskId}`),
    contractFingerprint: fingerprint(`contract:${taskId}`),
    phase,
    repositoryFingerprint: repositoryFingerprint(),
    updatedAt,
    remainingWork: shape.remainingWork,
    knownIssues: shape.knownIssues,
    changedAreas: shape.changedAreas,
    inspectFirst: shape.inspectFirst,
    ...(shape.currentFocus ? { currentFocus: shape.currentFocus } : {}),
    ...(shape.resumeNote ? { resumeNote: shape.resumeNote } : {}),
  };
}

function executionReceipt(taskId, shape) {
  return {
    ...baseArtifact(taskId),
    contractFingerprint: fingerprint(`contract:${taskId}`),
    routeFingerprint: fingerprint(`route:${taskId}`),
    stateFingerprint: fingerprint(`work-state:${taskId}`),
    selectedGuides: shape.selectedGuides,
    changedPaths: shape.changedPaths,
    checks: shape.checks,
    review: shape.review,
    limitations: shape.limitations,
    publication: { committed: true, pushed: true, pullRequest: null, deployed: false },
    status: 'complete',
    taskStatus: 'complete',
    verificationStatus: 'valid',
    publicationStatus: 'pushed',
    productionReadiness: 'not-verified',
    evidence: shape.evidence,
    evidenceCoverage: shape.evidenceCoverage,
  };
}

function gate(taskId, gateName, status, evidence, decisions = [], artifactPath = 'src/catalog.ts') {
  return {
    ...baseArtifact(taskId),
    gate: gateName,
    status,
    requiredBy: [`policy:${gateName}`],
    artifacts: [{ path: artifactPath, sha256: fingerprint(`artifact:${taskId}:${gateName}`) }],
    decisions,
    unknowns: [],
    approvedAssumptions: [],
    evidence,
  };
}

function covered(status = 'COVERED') {
  return { status };
}

const TASKS = {
  catalog: {
    id: 'TASK-001',
    title: 'Implement premium product catalog',
    startAt: '2026-08-03T09:00:00.000Z',
    phase: 'COMPLETE',
  },
  cart: {
    id: 'TASK-002',
    title: 'Add shopping cart persistence',
    startAt: '2026-08-04T09:30:00.000Z',
    phase: 'VERIFYING',
  },
  checkout: {
    id: 'TASK-003',
    title: 'Implement checkout API integration',
    startAt: '2026-08-05T08:15:00.000Z',
    phase: 'EXECUTING',
  },
  a11y: {
    id: 'TASK-004',
    title: 'Accessibility and keyboard navigation audit',
    startAt: '2026-08-06T10:00:00.000Z',
    phase: 'BLOCKED',
  },
  perf: {
    id: 'TASK-005',
    title: 'Improve image loading performance',
    startAt: '2026-08-07T11:45:00.000Z',
    phase: 'PLANNED',
  },
  security: {
    id: 'TASK-006',
    title: 'Security review of checkout flow',
    startAt: '2026-08-07T14:00:00.000Z',
    phase: 'COMPLETE',
  },
};

function buildCatalogTask() {
  const t = TASKS.catalog;
  const taskId = t.id;
  const ledger = new EventLedgerBuilder(taskId, { startAt: t.startAt });
  ledger.append('TASK_CREATED', { title: t.title });
  ledger.append('CONTRACT_ACCEPTED', { objective: t.title });
  ledger.append('PLAN_CREATED', { steps: ['models', 'filtering', 'grid view'] });
  ledger.append('EXECUTION_STARTED', { area: 'src/catalog.ts' });
  ledger.append('CHECK_PASSED', { check: 'unit-tests', result: 'catalog unit tests: 14 passed' });
  ledger.append('CHECK_PASSED', { check: 'typecheck', result: 'tsc --noEmit clean' });
  ledger.append('CHECK_PASSED', { check: 'lint', result: 'eslint clean' });
  ledger.append('REVIEW_PASSED', { reviewer: 'harness-a' });
  ledger.append('VALIDATION_PASSED', { coverage: '100% of success criteria observed' });
  ledger.append('TASK_COMPLETED', { receipt: 'execution-receipt.json' });

  const checks = [
    { id: 'catalog-unit-tests', requirement: 'Catalog unit tests pass', status: 'passed', evidenceKind: 'OBSERVED', timestamp: '2026-08-03T09:35:00.000Z' },
    { id: 'typecheck', requirement: 'TypeScript compiles without errors', status: 'passed', evidenceKind: 'OBSERVED', timestamp: '2026-08-03T09:40:00.000Z' },
    { id: 'lint', requirement: 'Lint passes on changed files', status: 'passed', evidenceKind: 'OBSERVED', timestamp: '2026-08-03T09:42:00.000Z' },
  ];
  const coverage = [covered(), covered(), covered(), covered()];
  const artifacts = {};
  artifacts['task.json'] = taskDescriptor(taskId, t.startAt, '2026-08-03T10:05:00.000Z');
  artifacts['contract.json'] = contract(taskId, {
    objective: 'Implement the premium product catalog with filtering and a responsive grid view.',
    deliverables: ['Product data model with typed catalog entries', 'Category and price filtering', 'Responsive product grid component'],
    constraints: ['No new runtime dependencies', 'Must render read-only in Studio demo scope'],
    risks: ['Large catalogs could slow initial render'],
    verification: ['Catalog unit tests pass (14 cases)', 'Filtering logic covered by table-driven tests'],
    successCriteria: ['Products render in a responsive grid', 'Filters combine category and price range'],
    stopConditions: ['Any failing unit test blocks completion'],
    unresolvedDecisions: [],
    sourceRefs: ['src/catalog.ts', 'tests/catalog.test.ts'],
  });
  artifacts['routing-result.json'] = routingResult(taskId, 'implementation', ['testing', 'clean-code'], { implementation: ['Direct feature work with test coverage'] });
  artifacts['preflight.json'] = preflight(taskId, { requiredGates: ['unit-tests', 'typecheck', 'lint'], satisfiedGates: ['unit-tests', 'typecheck', 'lint'] });
  artifacts['work-state.json'] = workState(taskId, {
    phase: 'COMPLETE',
    selectedGuides: ['testing', 'clean-code'],
    requiredGates: ['unit-tests', 'typecheck', 'lint'],
    satisfiedGates: ['unit-tests', 'typecheck', 'lint'],
    completedSteps: ['Model product entries', 'Implement filtering', 'Build grid view', 'Verify with unit tests'],
    pendingSteps: [],
    checks,
    publicationStatus: 'pushed',
    revision: 3,
    evidenceCoverage: coverage,
    lastUpdated: '2026-08-03T10:05:00.000Z',
  });
  artifacts['continuity.json'] = continuity(taskId, 'COMPLETE', '2026-08-03T10:06:00.000Z', {
    remainingWork: [{ id: 'follow-up-seo', summary: 'Consider SEO metadata for catalog routes in a future task' }],
    knownIssues: [],
    changedAreas: ['src/catalog.ts', 'tests/catalog.test.ts'],
    inspectFirst: [],
    resumeNote: 'Completed; kept as reference lifecycle for the ForgeShop demo.',
  });
  artifacts['execution-receipt.json'] = executionReceipt(taskId, {
    selectedGuides: ['testing', 'clean-code'],
    changedPaths: ['src/catalog.ts', 'tests/catalog.test.ts'],
    checks,
    review: { reviewer: 'harness-a', outcome: 'approved', notes: 'Grid keyboard focus order verified manually.' },
    limitations: ['Demo fixture only; no real storefront is built.'],
    evidence: [
      { kind: 'OBSERVED', source: 'vitest run', result: 'catalog unit tests: 14 passed' },
      { kind: 'OBSERVED', source: 'tsc --noEmit', result: 'no type errors' },
    ],
    evidenceCoverage: coverage,
  });
  artifacts['gates/unit-tests.json'] = gate(taskId, 'unit-tests', 'satisfied', [{ kind: 'OBSERVED', source: 'vitest run', result: '14 passed' }]);
  artifacts['gates/typecheck.json'] = gate(taskId, 'typecheck', 'satisfied', [{ kind: 'OBSERVED', source: 'tsc --noEmit', result: 'clean' }]);
  artifacts['gates/lint.json'] = gate(taskId, 'lint', 'satisfied', [{ kind: 'OBSERVED', source: 'eslint', result: 'clean' }]);
  return { taskId, ledger, artifacts };
}

function buildCartTask() {
  const t = TASKS.cart;
  const taskId = t.id;
  const ledger = new EventLedgerBuilder(taskId, { startAt: t.startAt });
  ledger.append('TASK_CREATED', { title: t.title });
  ledger.append('CONTRACT_ACCEPTED', { objective: t.title });
  ledger.append('PLAN_CREATED', { steps: ['cart store', 'localStorage adapter', 'hydration on launch'] });
  ledger.append('EXECUTION_STARTED', { area: 'src/cart.ts' });
  ledger.append('CHECK_PASSED', { check: 'unit-tests', result: 'cart unit tests: 8 passed' });
  ledger.append('EXECUTION_COMPLETED', { area: 'src/cart.ts' });
  ledger.append('VERIFICATION_STARTED', { cycle: 1 });
  ledger.append('CHECK_WARNING', { check: 'hydration-edge-case', note: 'Hydration edge case found for corrupted stored carts' });

  const checks = [
    { id: 'cart-unit-tests', requirement: 'Cart unit tests pass', status: 'passed', evidenceKind: 'OBSERVED', timestamp: '2026-08-04T10:20:00.000Z' },
    { id: 'corrupt-cart-hydration', requirement: 'Corrupted persisted carts are discarded safely', status: 'failed', evidenceKind: 'NOT_VERIFIED', timestamp: '2026-08-04T10:55:00.000Z' },
    { id: 'typecheck', requirement: 'TypeScript compiles without errors', status: 'passed', evidenceKind: 'OBSERVED', timestamp: '2026-08-04T10:58:00.000Z' },
  ];
  const coverage = [covered(), { status: 'PARTIAL' }, covered(), { status: 'NOT_VERIFIED' }];
  const artifacts = {};
  artifacts['task.json'] = taskDescriptor(taskId, t.startAt, '2026-08-04T11:00:00.000Z');
  artifacts['contract.json'] = contract(taskId, {
    objective: 'Persist the shopping cart across sessions using a local storage adapter.',
    deliverables: ['Typed cart store', 'Storage adapter with corruption handling', 'Hydration on application launch'],
    constraints: ['Storage quota must stay under 1 MiB', 'No personal data may be persisted'],
    risks: ['Corrupted storage payloads could break hydration'],
    verification: ['Cart unit tests pass (8 cases)', 'Corrupted payloads are discarded safely'],
    successCriteria: ['Cart survives a simulated restart', 'Corrupted carts are dropped with a warning'],
    stopConditions: ['Data loss beyond the current cart must halt execution'],
    unresolvedDecisions: ['Whether to version the storage payload format'],
    sourceRefs: ['src/cart.ts', 'tests/cart.test.ts'],
  });
  artifacts['routing-result.json'] = routingResult(taskId, 'implementation', ['testing', 'design'], { implementation: ['Store plus adapter pattern'] });
  artifacts['preflight.json'] = preflight(taskId, { requiredGates: ['unit-tests', 'typecheck'], satisfiedGates: ['unit-tests', 'typecheck'] });
  artifacts['work-state.json'] = workState(taskId, {
    phase: 'VERIFYING',
    previousPhase: 'EXECUTING',
    selectedGuides: ['testing', 'design'],
    requiredGates: ['unit-tests', 'typecheck'],
    satisfiedGates: ['unit-tests', 'typecheck'],
    completedSteps: ['Cart store', 'Storage adapter', 'Launch hydration'],
    pendingSteps: ['Harden hydration against corrupted payloads', 'Re-run verification cycle'],
    checks,
    verificationCycle: 1,
    lastCompletionAttempt: {
      status: 'REJECTED',
      reasonCodes: ['MISSING_VERIFICATION_EVIDENCE'],
      missingRequirementIds: ['corrupt-cart-hydration'],
      verificationCycle: 1,
      receiptFingerprint: null,
      timestamp: '2026-08-04T11:00:00.000Z',
    },
    evidenceCoverage: coverage,
    lastUpdated: '2026-08-04T11:02:00.000Z',
  });
  artifacts['continuity.json'] = continuity(taskId, 'VERIFYING', '2026-08-04T11:03:00.000Z', {
    verificationCycle: 1,
    currentFocus: { id: 'harden-hydration', summary: 'Discard corrupted carts and surface a user-visible warning' },
    remainingWork: [
      { id: 'harden-hydration', summary: 'Discard corrupted carts and surface a user-visible warning' },
      { id: 'reverify', summary: 'Run verification cycle 2 with new hydration tests' },
    ],
    knownIssues: [{ id: 'corrupt-cart-hydration', summary: 'Corrupted payload currently throws instead of being discarded' }],
    changedAreas: ['src/cart.ts', 'tests/cart.test.ts'],
    inspectFirst: ['src/cart.ts', 'tests/cart.test.ts'],
    resumeNote: 'Verification cycle 1 rejected: hydration edge case still open. Resume in VERIFYING.',
  });
  return { taskId, ledger, artifacts };
}

function buildCheckoutTask() {
  const t = TASKS.checkout;
  const taskId = t.id;
  const ledger = new EventLedgerBuilder(taskId, { startAt: t.startAt });
  ledger.append('TASK_CREATED', { title: t.title });
  ledger.append('CONTRACT_ACCEPTED', { objective: t.title });
  ledger.append('PLAN_APPROVED', { steps: ['client', 'error mapping', 'retry policy'] });
  ledger.append('EXECUTION_STARTED', { area: 'src/checkout.ts' });
  ledger.append('CHECK_PASSED', { check: 'integration-tests', result: 'checkout integration tests: 6 passed' });

  const checks = [
    { id: 'checkout-integration-tests', requirement: 'Checkout integration tests pass', status: 'passed', evidenceKind: 'OBSERVED', timestamp: '2026-08-05T09:10:00.000Z' },
    { id: 'retry-policy-tests', requirement: 'Retry policy handles transient failures', status: 'not-run', evidenceKind: 'NOT_VERIFIED', timestamp: '2026-08-05T09:12:00.000Z' },
  ];
  const coverage = [covered(), { status: 'NOT_VERIFIED' }, { status: 'PARTIAL' }];
  const artifacts = {};
  artifacts['task.json'] = taskDescriptor(taskId, t.startAt, '2026-08-05T09:15:00.000Z');
  artifacts['contract.json'] = contract(taskId, {
    objective: 'Integrate the checkout API client with error mapping and a retry policy.',
    deliverables: ['Checkout API client', 'Typed error mapping', 'Retry policy for transient failures'],
    constraints: ['No secrets in demo code', 'All network calls mocked in tests'],
    risks: ['Payment provider outages could hang checkout'],
    verification: ['Checkout integration tests pass (6 cases)', 'Retry policy handles transient failures'],
    successCriteria: ['Orders submit through the client', 'Transient errors retry with backoff'],
    stopConditions: ['Any leaked credential stops execution immediately'],
    unresolvedDecisions: ['Final retry backoff ceiling'],
    sourceRefs: ['src/checkout.ts', 'tests/checkout.test.ts'],
  });
  artifacts['routing-result.json'] = routingResult(taskId, 'implementation', ['security', 'testing'], { implementation: ['Client with explicit error taxonomy'] });
  artifacts['preflight.json'] = preflight(taskId, { requiredGates: ['integration-tests', 'security-review'], satisfiedGates: [] });
  artifacts['work-state.json'] = workState(taskId, {
    phase: 'EXECUTING',
    selectedGuides: ['security', 'testing'],
    requiredGates: ['integration-tests', 'security-review'],
    satisfiedGates: ['integration-tests'],
    completedSteps: ['API client skeleton', 'Error mapping'],
    pendingSteps: ['Retry policy', 'Security review'],
    checks,
    evidenceCoverage: coverage,
    lastUpdated: '2026-08-05T09:15:00.000Z',
  });
  artifacts['continuity.json'] = continuity(taskId, 'EXECUTING', '2026-08-05T09:16:00.000Z', {
    currentFocus: { id: 'retry-policy', summary: 'Implement exponential backoff retry for transient checkout failures' },
    remainingWork: [
      { id: 'retry-policy', summary: 'Implement exponential backoff retry for transient checkout failures' },
      { id: 'security-review', summary: 'Pass the checkout security review gate' },
    ],
    knownIssues: [],
    changedAreas: ['src/checkout.ts'],
    inspectFirst: ['src/checkout.ts'],
    resumeNote: 'Execution in progress; integration tests green, retry policy next.',
  });
  return { taskId, ledger, artifacts };
}

function buildA11yTask() {
  const t = TASKS.a11y;
  const taskId = t.id;
  const ledger = new EventLedgerBuilder(taskId, { startAt: t.startAt });
  ledger.append('TASK_CREATED', { title: t.title });
  ledger.append('CONTRACT_ACCEPTED', { objective: t.title });
  ledger.append('SESSION_ACTIVATED', { harness: 'harness-a' });
  ledger.append('EXECUTION_STARTED', { area: 'audit:keyboard-navigation' });
  ledger.append('CHECK_FAILED', { check: 'keyboard-navigation', finding: '2 keyboard navigation findings in grid pagination' });
  ledger.append('TASK_BLOCKED', { reason: 'ACCESSIBILITY_GATE_FAILED' });
  ledger.append('RECOVERY_ROUTE_SELECTED', { route: 'correct-and-resume', decidedBy: 'harness-a' });
  ledger.append('HANDOFF_CREATED', { from: 'harness-a', to: 'harness-b', note: 'Resume after fixing grid pagination focus trap' });
  ledger.append('SESSION_ACTIVATED', { harness: 'harness-b' });
  ledger.append('RESUMED_FROM_CONTINUITY', { harness: 'harness-b', phase: 'CORRECTING' });

  const checks = [
    { id: 'keyboard-navigation', requirement: 'All interactive controls are reachable by keyboard', status: 'failed', evidenceKind: 'BLOCKED', timestamp: '2026-08-06T10:40:00.000Z' },
    { id: 'screen-reader-labels', requirement: 'Dynamic regions expose accessible names', status: 'passed', evidenceKind: 'OBSERVED', timestamp: '2026-08-06T10:38:00.000Z' },
  ];
  const coverage = [{ status: 'COVERED' }, { status: 'BLOCKED' }];
  const artifacts = {};
  artifacts['task.json'] = taskDescriptor(taskId, t.startAt, '2026-08-06T11:20:00.000Z');
  artifacts['contract.json'] = contract(taskId, {
    objective: 'Audit and fix accessibility gaps with emphasis on keyboard navigation.',
    deliverables: ['Keyboard navigation audit report', 'Fixes for all blocking findings', 'Regression checks for focus order'],
    constraints: ['WCAG 2.1 AA targets', 'No visual regressions allowed'],
    risks: ['Focus fixes could introduce tab loops'],
    verification: ['axe scan reports no critical findings', 'Keyboard-only walkthrough completes checkout'],
    successCriteria: ['Every interactive control is reachable by keyboard', 'Focus order matches visual order'],
    stopConditions: ['A regression in screen-reader labels halts the audit'],
    unresolvedDecisions: [],
    sourceRefs: ['src/app.ts', 'src/catalog.ts'],
  });
  artifacts['routing-result.json'] = routingResult(taskId, 'diagnosis', ['accessibility', 'testing'], { diagnosis: ['Failed audit requires correction before resuming'] });
  artifacts['preflight.json'] = preflight(taskId, { status: 'READY', requiredGates: ['accessibility-audit'], satisfiedGates: [] });
  artifacts['work-state.json'] = workState(taskId, {
    phase: 'BLOCKED',
    previousPhase: 'VERIFYING',
    selectedGuides: ['accessibility', 'testing'],
    requiredGates: ['accessibility-audit'],
    satisfiedGates: [],
    completedSteps: ['Automated axe scan', 'Manual keyboard walkthrough (partial)'],
    pendingSteps: ['Fix grid pagination focus trap', 'Re-run accessibility audit'],
    checks,
    failures: [{ id: 'keyboard-navigation-finding', description: 'Pagination next button traps focus and skips filters', severity: 'HIGH' }],
    blockers: [{ id: 'accessibility-gate', reason: 'ACCESSIBILITY_GATE_FAILED', detail: '2 keyboard navigation findings block completion' }],
    diagnosedHypothesis: 'Pagination control renders a div with a click handler instead of a button, trapping sequential focus.',
    evidenceCoverage: coverage,
    lastUpdated: '2026-08-06T11:20:00.000Z',
  });
  artifacts['continuity.json'] = continuity(taskId, 'BLOCKED', '2026-08-06T11:25:00.000Z', {
    currentFocus: { id: 'fix-focus-trap', summary: 'Replace pagination div with a real button and restore filter focus flow' },
    remainingWork: [
      { id: 'fix-focus-trap', summary: 'Replace pagination div with a real button and restore filter focus flow' },
      { id: 'rerun-audit', summary: 'Re-run keyboard walkthrough and axe scan' },
    ],
    knownIssues: [{ id: 'keyboard-navigation-finding', summary: '2 keyboard navigation findings in grid pagination' }],
    changedAreas: ['src/catalog.ts'],
    inspectFirst: ['src/catalog.ts', 'src/catalog.ts'],
    resumeNote: 'Blocked by accessibility gate. harness-a recorded findings; harness-b resumes in CORRECTING after the focus-trap fix.',
  });
  artifacts['policy-snapshot.json'] = {
    schemaVersion: 1,
    policyDigest: fingerprint('policy:forgehop'),
    rules: ['accessibility-keyboard-navigation', 'testing-required-checks'],
    capturedAt: '2026-08-06T10:05:00.000Z',
  };
  artifacts['gates/accessibility-audit.json'] = gate(
    taskId,
    'accessibility-audit',
    'blocked',
    [{ kind: 'BLOCKED', source: 'audit:keyboard-navigation', result: '2 keyboard navigation findings in grid pagination' }],
    ['Correction required before the audit can be re-run'],
  );
  return { taskId, ledger, artifacts };
}

function buildPerfTask() {
  const t = TASKS.perf;
  const taskId = t.id;
  const ledger = new EventLedgerBuilder(taskId, { startAt: t.startAt });
  ledger.append('TASK_CREATED', { title: t.title });
  ledger.append('PLANNING_STARTED', { baseline: 'LCP 3.1s on the seeded catalog page' });

  const artifacts = {};
  artifacts['task.json'] = taskDescriptor(taskId, t.startAt, '2026-08-07T11:50:00.000Z');
  artifacts['contract.json'] = contract(taskId, {
    objective: 'Improve image loading performance so the largest contentful paint stays under 2 seconds.',
    deliverables: ['Lazy-loaded product imagery', 'Responsive image sizes', 'Performance budget check'],
    constraints: ['No layout shifts above 0.1 CLS', 'Keep bundle size neutral'],
    risks: ['Lazy loading could delay above-the-fold images'],
    verification: ['Measured LCP improves from 3.1s to at most 1.8s', 'CLS stays under 0.1'],
    successCriteria: ['LCP at most 1.8s on the seeded catalog page'],
    stopConditions: ['A CLS regression above 0.1 stops optimization work'],
    unresolvedDecisions: ['CDN choice for demo imagery'],
    sourceRefs: ['src/catalog.ts'],
  });
  artifacts['routing-result.json'] = routingResult(taskId, 'planning', ['performance', 'design'], { planning: ['Baseline measurement before optimization'] });
  artifacts['preflight.json'] = preflight(taskId, { requiredGates: ['performance-budget'], satisfiedGates: [] });
  artifacts['work-state.json'] = workState(taskId, {
    phase: 'PLANNED',
    selectedGuides: ['performance', 'design'],
    requiredGates: ['performance-budget'],
    satisfiedGates: [],
    completedSteps: ['Baseline measurement'],
    pendingSteps: ['Lazy loading', 'Responsive sizes', 'Budget verification'],
    checks: [],
    evidenceCoverage: [{ status: 'NOT_VERIFIED' }],
    lastUpdated: '2026-08-07T11:50:00.000Z',
  });
  artifacts['continuity.json'] = continuity(taskId, 'PLANNED', '2026-08-07T11:55:00.000Z', {
    remainingWork: [{ id: 'lazy-loading', summary: 'Add lazy loading and responsive sizes to catalog imagery' }],
    knownIssues: [],
    changedAreas: [],
    inspectFirst: ['src/catalog.ts'],
    resumeNote: 'Planned; baseline LCP 3.1s recorded, target 1.8s.',
  });
  return { taskId, ledger, artifacts };
}

function buildSecurityTask() {
  const t = TASKS.security;
  const taskId = t.id;
  const ledger = new EventLedgerBuilder(taskId, { startAt: t.startAt });
  ledger.append('TASK_CREATED', { title: t.title });
  ledger.append('CONTRACT_ACCEPTED', { objective: t.title });
  ledger.append('PLAN_CREATED', { steps: ['threat model', 'dependency scan', 'flow review'] });
  ledger.append('EXECUTION_STARTED', { area: 'audit:checkout-security' });
  ledger.append('CHECK_PASSED', { check: 'security-scan', result: 'security scan: no critical findings' });
  ledger.append('CHECK_PASSED', { check: 'secret-scan', result: 'no secrets detected in checkout flow' });
  ledger.append('REVIEW_PASSED', { reviewer: 'harness-b' });
  ledger.append('TASK_COMPLETED', { receipt: 'execution-receipt.json' });

  const checks = [
    { id: 'security-scan', requirement: 'Dependency and flow scan reports no critical findings', status: 'passed', evidenceKind: 'OBSERVED', timestamp: '2026-08-07T14:40:00.000Z' },
    { id: 'secret-scan', requirement: 'No secrets committed in checkout flow', status: 'passed', evidenceKind: 'OBSERVED', timestamp: '2026-08-07T14:45:00.000Z' },
  ];
  const coverage = [covered(), covered(), covered()];
  const artifacts = {};
  artifacts['task.json'] = taskDescriptor(taskId, t.startAt, '2026-08-07T15:00:00.000Z');
  artifacts['contract.json'] = contract(taskId, {
    objective: 'Review the checkout flow for security weaknesses before integration ships.',
    deliverables: ['Threat model for checkout', 'Scan results with dispositions', 'Sign-off for TASK-003 integration'],
    constraints: ['Findings must map to OWASP categories', 'No real credentials anywhere in the demo'],
    risks: ['Review fatigue could miss injection paths'],
    verification: ['Security scan reports no critical findings', 'Checkout flow reviewed against the threat model'],
    successCriteria: ['No critical or high findings remain untriaged'],
    stopConditions: ['Any critical finding halts the review until triaged'],
    unresolvedDecisions: [],
    sourceRefs: ['src/checkout.ts'],
  });
  artifacts['routing-result.json'] = routingResult(taskId, 'review', ['security'], { review: ['Read-only audit with scan evidence'] });
  artifacts['preflight.json'] = preflight(taskId, { requiredGates: ['security-review'], satisfiedGates: ['security-review'] });
  artifacts['work-state.json'] = workState(taskId, {
    phase: 'COMPLETE',
    selectedGuides: ['security'],
    requiredGates: ['security-review'],
    satisfiedGates: ['security-review'],
    completedSteps: ['Threat model', 'Dependency scan', 'Flow review', 'Sign-off'],
    pendingSteps: [],
    checks,
    publicationStatus: 'committed',
    revision: 2,
    evidenceCoverage: coverage,
    lastUpdated: '2026-08-07T15:00:00.000Z',
  });
  artifacts['continuity.json'] = continuity(taskId, 'COMPLETE', '2026-08-07T15:01:00.000Z', {
    remainingWork: [{ id: 'recheck-after-retry', summary: 'Re-run the security review once TASK-003 adds its retry policy' }],
    knownIssues: [],
    changedAreas: [],
    inspectFirst: [],
    resumeNote: 'Review complete; revisit after checkout retry policy lands.',
  });
  artifacts['execution-receipt.json'] = executionReceipt(taskId, {
    selectedGuides: ['security'],
    changedPaths: [],
    checks,
    review: { reviewer: 'harness-b', outcome: 'approved', notes: 'Checkout flow cleared for integration continuation.' },
    limitations: ['Static review only; no live payment traffic is exercised in the demo.'],
    evidence: [
      { kind: 'OBSERVED', source: 'audit:security-scan', result: 'no critical findings' },
      { kind: 'OBSERVED', source: 'audit:secret-scan', result: 'no secrets detected' },
    ],
    evidenceCoverage: coverage,
  });
  artifacts['policy-snapshot.json'] = {
    schemaVersion: 1,
    policyDigest: fingerprint('policy:forgehop'),
    rules: ['security-no-critical-findings', 'security-no-secrets'],
    capturedAt: '2026-08-07T14:05:00.000Z',
  };
  artifacts['gates/security-review.json'] = gate(taskId, 'security-review', 'satisfied', [{ kind: 'OBSERVED', source: 'audit:security-scan', result: 'no critical findings' }], [], 'src/checkout.ts');
  return { taskId, ledger, artifacts };
}

function buildPolicyFiles() {
  const rules = {
    schemaVersion: 1,
    rules: [
      {
        id: 'security-no-critical-findings',
        severity: 'HIGH',
        source: 'project',
        blocking: true,
        why: 'Critical security findings must never ship in the checkout flow.',
        fix: 'Triage and fix every critical finding, then re-run the security scan.',
        confidence: 'HIGH',
        scope: { includes: ['src/checkout.ts'], excludes: [] },
        check: { type: 'command', command: ['node', 'tests/security-scan.mjs'], threshold: 0 },
      },
      {
        id: 'security-no-secrets',
        severity: 'HIGH',
        source: 'project',
        blocking: true,
        why: 'Secrets in source control are irreversible exposure.',
        fix: 'Remove the secret, rotate it, and add a scanning guard.',
        confidence: 'HIGH',
        scope: { includes: ['src/**', 'tests/**'], excludes: [] },
        check: { type: 'command', command: ['node', 'tests/secret-scan.mjs'] },
      },
      {
        id: 'accessibility-keyboard-navigation',
        severity: 'HIGH',
        source: 'project',
        blocking: true,
        why: 'Keyboard users must reach every interactive control.',
        fix: 'Use native focusable elements and verify tab order in the walkthrough.',
        confidence: 'MEDIUM',
        scope: { includes: ['src/**'], excludes: [] },
        check: { type: 'audit', adapter: 'axe', parameters: { standard: 'WCAG 2.1 AA' } },
      },
      {
        id: 'testing-required-checks',
        severity: 'HIGH',
        source: 'project',
        blocking: true,
        why: 'Unit and integration tests are the executable specification.',
        fix: 'Add or repair the failing tests before requesting review.',
        confidence: 'HIGH',
        scope: { includes: ['tests/**'], excludes: [] },
        check: { type: 'command', command: ['npm', 'test'] },
      },
      {
        id: 'performance-lcp-budget',
        severity: 'MEDIUM',
        source: 'project',
        blocking: false,
        why: 'Perceived performance is part of the premium positioning.',
        fix: 'Optimize loading until LCP is at most 1.8 seconds.',
        confidence: 'MEDIUM',
        scope: { includes: ['src/catalog.ts'], excludes: [] },
        check: { type: 'metric', adapter: 'lighthouse', threshold: 1800 },
      },
      {
        id: 'clean-code-no-dead-code',
        severity: 'LOW',
        source: 'project',
        blocking: false,
        why: 'Dead code obscures intent for future tasks.',
        fix: 'Delete unused exports during touch-and-improve passes.',
        confidence: 'LOW',
        scope: { includes: ['src/**'], excludes: [] },
        check: { type: 'lint', adapter: 'eslint' },
      },
      {
        id: 'design-consistent-tokens',
        severity: 'INFO',
        source: 'project',
        blocking: false,
        why: 'Consistent design tokens keep the storefront premium.',
        fix: 'Prefer shared tokens over ad-hoc colors and spacing.',
        confidence: 'LOW',
        scope: { includes: ['src/**'], excludes: [] },
        check: { type: 'review', parameters: { checklist: 'design-tokens' } },
      },
    ],
  };
  const discovery = {
    schemaVersion: 1,
    languages: ['typescript'],
    testing: { detected: true, framework: 'vitest', command: ['npx', 'vitest', 'run'], confidence: 'HIGH' },
    linting: { detected: true, tool: 'eslint', command: ['npx', 'eslint', '.'], confidence: 'HIGH' },
    architecture: { value: 'feature-modules', confidence: 'MEDIUM', enforcement: 'ADVISORY' },
    discoveredRules: [
      { id: 'clean-code-no-dead-code', origin: 'eslint config inspection' },
      { id: 'design-consistent-tokens', origin: 'design token inventory review' },
    ],
  };
  const baseline = {
    schemaVersion: 1,
    createdAt: '2026-08-01T09:00:00.000Z',
    entries: [
      {
        ruleId: 'performance-lcp-budget',
        fingerprints: [fingerprint('baseline:lcp-3.1s')],
        details: [{ note: 'Baseline captured before optimization work started.' }],
      },
    ],
  };
  const rulesText = serializeJson(rules);
  const baselineText = serializeJson(baseline);
  const lock = {
    schemaVersion: 1,
    algorithm: 'sha256',
    digest: sha256FileBytes(rulesText + baselineText),
    rulesDigest: sha256FileBytes(rulesText),
    baselineDigest: sha256FileBytes(baselineText),
    capturedAt: '2026-08-01T09:00:00.000Z',
  };
  return { rules, discovery, baseline, lock };
}

export function buildForgeShopProject() {
  const files = new Map();

  function put(relativePath, value, artifactName) {
    if (artifactName) assertSchemaValid(artifactName, value);
    files.set(relativePath, typeof value === 'string' ? value : serializeJson(value));
  }

  put('.forgeloop/config.json', {
    schemaVersion: 1,
    protocolVersion: 1,
    complianceMode: 'standard',
    requiredGates: ['unit-tests', 'typecheck', 'lint'],
    requiredEvidence: ['OBSERVED'],
  }, 'config.json');

  put('.forgeloop/sources.json', {
    schemaVersion: 1,
    protocolVersion: 1,
    sources: {
      'user-request-forgehop': { kind: 'user-request', summary: 'Build ForgeShop, a small premium e-commerce web application, through ForgeLoop.' },
      'repository-fact-stack': { kind: 'repository-fact', summary: 'TypeScript sources under src/ with vitest tests under tests/.', path: 'package.json' },
      'observation-catalog-lcp': { kind: 'observation', summary: 'Seeded catalog page measured LCP 3.1s before optimization.' },
      'agent-decision-task-order': { kind: 'agent-decision', summary: 'Security review of checkout runs before checkout integration completes.' },
    },
  }, 'sources.json');

  put('.forgeloop/sessions/session-harness-a.json', {
    schemaVersion: 1,
    protocolVersion: 1,
    sessionId: 'session-harness-a',
    activationMarker: 'forgehop:harness-a:2026-08-06',
    createdAt: '2026-08-06T10:05:00.000Z',
  }, 'session.json');
  put('.forgeloop/sessions/session-harness-b.json', {
    schemaVersion: 1,
    protocolVersion: 1,
    sessionId: 'session-harness-b',
    activationMarker: 'forgehop:harness-b:2026-08-06',
    createdAt: '2026-08-06T11:22:00.000Z',
  }, 'session.json');

  const policy = buildPolicyFiles();
  put('.forgeloop/policy/rules.json', policy.rules, 'policy/rules.json');
  put('.forgeloop/policy/discovery.json', policy.discovery, 'policy/discovery.json');
  put('.forgeloop/policy/baseline.json', policy.baseline, 'policy/baseline.json');
  put('.forgeloop/policy/policy.lock', policy.lock, 'policy/policy.lock');

  const builders = [buildCatalogTask, buildCartTask, buildCheckoutTask, buildA11yTask, buildPerfTask, buildSecurityTask];
  let eventCount = 0;
  for (const build of builders) {
    const { taskId, ledger, artifacts } = build();
    const key = taskKeyFor(taskId);
    for (const [name, value] of Object.entries(artifacts)) {
      const artifactName = name === 'events.ndjson'
        ? 'event'
        : name.startsWith('gates/')
          ? 'gate.json'
          : name;
      put(`.forgeloop/task-state/${key}/${name}`, value, artifactName);
    }
    for (const event of ledger.events) assertSchemaValid('event', event);
    eventCount += ledger.events.length;
    put(`.forgeloop/task-state/${key}/events.ndjson`, ledger.serialize());
  }

  return { files, eventCount };
}
