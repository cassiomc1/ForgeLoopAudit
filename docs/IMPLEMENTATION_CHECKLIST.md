# ForgeLoop Studio — Current Implementation and Verification Matrix

This is a current-state matrix, not an unchecked product backlog. Statuses are
derived from the implementation, automated tests and workflow definitions in
this repository.

| Status | Meaning |
|---|---|
| `[x]` | Implemented and covered by the current verification contract |
| `[~]` | Partial, bounded or verified only in a specific environment |
| `[ ]` | Not implemented or not yet verified |
| `[-]` | Intentional non-goal for the current read-only release |

## Foundation and shell

- [x] Electron + Vite + React + TypeScript application shell.
- [x] Node.js 20+ package/tooling baseline.
- [x] Secure `BrowserWindow` with `nodeIntegration: false`,
  `contextIsolation: true` and renderer sandboxing.
- [x] Typed preload bridge and bounded project folder picker.
- [x] Canonical selected-project path boundary with traversal and symlink
  rejection.
- [x] Dark design tokens, responsive shell, semantic headings and loading,
  empty and error states.
- [x] Current navigation: Overview, Tasks, Flow, Contract, Evidence, Events,
  Executions, Continuity, Diagnostics, Actions, Policy and Settings.

Evidence: `src/main/app.ts`, `src/preload/`, `src/main/security/`,
`src/renderer/App.tsx`, `tests/e2e/accessibility.spec.ts` and Electron smoke
tests.

## ForgeLoop integration and trust boundary

- [x] Detect ForgeLoop projects, including safe nested-project discovery.
- [x] Load ForgeLoop `1.7.0` through the vendored Integration API v1.
- [x] Read `protocol/info` from `compatibility.schemaVersion`; no top-level
  schema version is inferred.
- [x] Fail closed on unsupported protocol/schema versions, missing core
  resources, Integration API drift, executor-parity drift or incomplete
  durable recovery capability.
- [x] Select only `INTEGRATION_V1`, `ARTIFACT_ONLY` or `INCOMPATIBLE`; no
  inferred legacy mode exists.
- [~] Maintain an explicit v1 compatibility contract; a separate v2 adapter
  registry is future work.
- [x] Use canonical `project/tasks`, task status, ownership, contract and
  continuity projections for semantic state.
- [x] Keep raw artifact readers bounded, schema-validated, path-contained and
  non-authoritative.
- [x] Project canonical ownership, recovery state and operational state without
  treating phase alone as proof of claim release.
- [x] Read observability, durable actions, approvals, capability policy,
  trajectory metrics/evaluations and execution provenance when advertised.
- [x] Read the canonical task/context projection when adaptive execution
  capabilities are advertised, display the resolved profile and bounded policy,
  and use explicit balanced compatibility behavior for older hosts.
- [x] Keep policy and next-action reads on the Integration API in
  `INTEGRATION_V1`; older artifact-only compatibility paths use only the
  allowlisted read-only CLI adapter.

Evidence: `src/main/core/integration/`,
`src/main/core/protocol/`, `src/main/core/project/`,
`src/main/core/tasks/`, `src/main/core/cli/` and their unit/integration tests.

## ForgeLoop 1.6.4 additive boundary features

- [x] Workspace Binding: display `UNBOUND`, `MATCH`, `MISMATCH`, `INVALID` or
  `UNAVAILABLE`; Studio never binds or rebinds.
- [x] Canonical Handoffs: display immutable snapshots separately from mutable
  Continuity; Studio never creates handoffs or treats them as evidence.
- [x] Responsibility Constraints: display `NOT_APPLICABLE`, `VALID` or
  `INVALID` with canonical errors; Studio never sets responsibility.
- [x] Differential Verification Scope: preserve requested `AUTO`, `CHANGED`,
  `CLAIMED` or `FULL` and resolved `CHANGED`, `CLAIMED`, `FULL` or
  `UNRESOLVED`; `IMPACTED` is unsupported.
- [x] Code Attestation: display canonical status and independent
  `PROCESSED`, `VERIFIED` or `ATTESTED` trust levels.
- [x] Apply attestation read policy: automatic canonical reads are disabled
  for `off`, required external providers, unknown providers or unavailable
  configuration; external signing-provider verification is never automatic.
- [x] Refresh these resources independently through targeted renderer epochs.
- [x] Verify trusted schema provenance and safe local `$ref` closure.

Evidence: `src/main/core/integration/canonical-task-boundaries.ts`,
`attestation-read-policy.ts`, `src/renderer/components/tasks/`,
`src/renderer/pages/Evidence.tsx`, `src/renderer/projection-refresh.ts`,
`schemas/provenance.json` and boundary-focused tests.

## Product surfaces

- [x] Overview: project identity, protocol/health status, task counts,
  coverage, sessions, next safe actions and selected-task boundaries.
- [x] Tasks: compact multi-task list, search, objective/phase/progress,
  active/blocked/complete filters, blockers and ownership/recovery badges.
- [x] Flow: React Flow lifecycle graph, current/completed/pending states,
  blocked and verification context, node inspection and optional boundary
  capability labels.
- [x] Contract and routing: objective, deliverables, constraints, risks,
  verification requirements, success criteria and guide routing details.
- [x] Gates and evidence: required/satisfied/blocked checks, evidence kinds,
  coverage summary, durable-action receipt context, verification scope and
  attestation cards.
- [x] Events: paginated/streamed event ledger, schema/chain validation,
  sequence/timestamp/hash details and bounded event inspection.
- [x] Executions: lazy bounded execution provenance with generic details and
  capability-gated verification-isolation presentation.
- [x] Continuity: canonical continuity, diagnostic context, sessions and
  immutable handoff snapshots with explicit non-evidence wording.
- [x] Diagnostics, Actions, Policy and Settings: canonical read-only
  projections, capability-aware unavailable states, policy context and
  privacy-safe diagnostics.
- [x] Execution Profile: requested/safety-floor/resolved/escalated values,
  bounded context policy and provider/host/actor usage with NOT MEASURED
  semantics for missing telemetry and comparisons.
- [~] Dedicated task-command palette, phase filter and large-ledger
  virtualization are not part of the current UI surface.

Evidence: `src/renderer/pages/`, `src/renderer/components/`, the demo fixture,
`tests/e2e/demo.spec.ts` and `tests/e2e/electron-smoke.spec.ts`.

## Live updates and security

- [x] Watch only bounded `.forgeloop` JSON/NDJSON paths.
- [x] Coalesce bursts, retry atomic writes and retain the last valid snapshot
  during transient parse failures.
- [x] Reload only affected task/domain projections; workspace binding,
  handoffs, responsibility, verification scope and attestation have separate
  refresh paths.
- [x] Enforce project containment, realpath/symlink checks, artifact allowlists,
  JSON/NDJSON size/depth limits and hostile-string text rendering.
- [x] Use a hardcoded read-only ForgeLoop CLI allowlist with `shell: false`,
  timeout and bounded stdout.
- [x] Reject arbitrary renderer IPC, generic file reads, arbitrary commands and
  untrusted navigation.

Evidence: `src/main/watcher/`, `src/main/security/`,
`src/main/core/cli/`, `src/preload/`, `src/main/ipc/` and security tests.

## UI and accessibility

- [x] Use dark-first semantic color, restrained typography, compact density,
  visible focus states and selected/hover states.
- [x] Respect reduced motion and avoid decorative animation/glow as a product
  requirement.
- [x] Use semantic headings, accessible button names and text labels for state;
  status is not color-only.
- [~] Automated accessibility and keyboard smoke coverage is present; full
  WCAG review and pixel-perfect native layout review remain environment-scoped
  quality work rather than protocol guarantees.

Evidence: `docs/UI_DESIGN_DIRECTION.md`, renderer styles,
`tests/e2e/accessibility.spec.ts` and `tests/e2e/visual.spec.ts`.

## Tests, CI and packaging

- [x] Vitest unit and integration-style fixture tests.
- [x] Playwright Electron tests for project opening, demo surfaces, preload
  isolation and deterministic shell behavior.
- [x] Schema, release-contract, demo-integrity, lineage, coverage and
  performance gates.
- [x] Shared `verify:full` gate and Ubuntu/macOS/Windows CI matrix.
- [x] Electron smoke, unpacked packaged smoke and Electron-fuse verification
  in CI.
- [x] macOS, Windows and Linux unsigned preview packaging paths plus release
  matrix, checksum, SBOM and evidence assembly workflows.
- [~] Native packaging proof is supplied by the corresponding CI runner; a
  local macOS checkout does not prove Windows or Linux packaging.
- [-] Code signing, notarization, operator mode, task mutation, remote/cloud
  access, AI summaries and automatic external signing-provider verification.

Evidence: `package.json`, `scripts/verify-full.mjs`, `tests/`,
`.github/workflows/ci.yml` and `.github/workflows/release.yml`.

## Intentional demo coverage

- [x] TASK-001: complete lifecycle with unsigned attestation artifacts and no
  `ATTESTED` claim.
- [x] TASK-002: verification cycle with rejected completion and persisted
  `AUTO` → `CHANGED` verification scope.
- [x] TASK-003: executing task with portable workspace-binding warning and
  intentional canonical `INVALID` responsibility result.
- [x] TASK-004: blocked/recovered task with mutable Continuity and canonical
  handoff context.
- [x] TASK-005: planned performance work and recorded baseline.
- [x] TASK-006: completed security-policy scenario.
- [x] Regenerate with `npm run demo:generate`; never hand-edit generated
  `.forgeloop/` artifacts; verify with `npm run demo:verify`.

## Verification commands

The current command surface is defined in `package.json`. The minimum
documentation and lineage checks are:

```bash
npm ci
npm run verify:forgeloop-lineage
npm run protocol:schemas:verify
npm run docs:check
npm run demo:generate
npm run demo:verify
npm run verify:full
```

`verify:full` proves the shared local contract. It does not by itself prove
native packaging on every platform, signing, notarization or publication; see
[`docs/QUALITY_GATES.md`](QUALITY_GATES.md) and
[`docs/RELEASE_MODEL.md`](RELEASE_MODEL.md).
