# ForgeLoop Studio — Implementation Checklist

## Foundation

- [ ] Initialize Electron + Vite + React + TypeScript.
- [ ] Configure Node.js 20+.
- [ ] Configure secure Electron `BrowserWindow`.
- [ ] Disable `nodeIntegration`.
- [ ] Enable `contextIsolation`.
- [ ] Enable renderer sandboxing.
- [ ] Create typed preload bridge.
- [ ] Add folder picker.
- [ ] Add selected-project path boundary.
- [ ] Add base dark design tokens.
- [ ] Build responsive application shell.

## ForgeLoop adapter

- [ ] Detect `.forgeloop/`.
- [x] Negotiate ForgeLoop 1.6 capabilities through the bundled Integration API (`@cassiomc1/forgeloop/integration`).
- [x] Read `protocol/info` via the canonical resource (`compatibility.schemaVersion`, no top-level `schemaVersion`).
- [x] Validate protocol v1 / schema v1 compatibility and fail closed on capability drift.
- [x] Select compatibility mode (`INTEGRATION_V1`, `ARTIFACT_ONLY`, `INCOMPATIBLE`) — no inferred legacy mode.
- [ ] Create protocol adapter registry.
- [ ] Read project configuration.
- [ ] Index task directories.
- [ ] Parse `task.json`.
- [ ] Parse `contract.json`.
- [ ] Parse `routing-result.json`.
- [ ] Parse `preflight.json`.
- [ ] Parse `work-state.json`.
- [ ] Parse gates.
- [ ] Parse continuity.
- [x] Parse execution receipt.
- [x] Parse execution provenance (`executions/exec-*.json`, bounded, schema-validated, lazy per task).
- [x] Read `recovery.json` raw artifact with symlink rejection and trusted `task-recovery.schema.json` validation.
- [x] Project canonical ownership (`claimState`, `mutationAllowed`, `ownershipValid`, historical vs effective claims) from `task/ownership`.
- [x] Canonical `project/tasks` drives task existence in `INTEGRATION_V1`; extra/corrupt filesystem namespaces surface as diagnostics only.
- [x] Policy status via the Integration API in `INTEGRATION_V1`; no external CLI in the canonical snapshot.
- [x] Snapshot and GET_TASK share one canonical task read service (single semantic projection).
- [x] Execution provenance reader validates realpath/symlink on the directory itself and every file.
- [x] Classify operational state (`ACTIVE`, `RECOVERY_RESUME_REQUIRED`, `COMPLETED_RELEASED`, `BLOCKED`, `OWNERSHIP_INCONSISTENT`, `READ_ONLY_UNKNOWN`).
- [x] Display ownership/recovery panels and ownership badges; recovered tasks are never shown as active.
- [x] Present recovery/resume next actions as copy-only text; no mutable command is ever executable.
- [ ] Parse policy snapshot.
- [ ] Parse policy state.
- [ ] Parse event ledger.
- [ ] Map raw artifacts to Studio domain models.

## Overview

- [ ] Show project name.
- [ ] Show branch and HEAD.
- [ ] Show ForgeLoop protocol version.
- [ ] Show watcher live status.
- [ ] Show global project health.
- [ ] Show active task count.
- [ ] Show blocked task count.
- [ ] Show verification coverage.
- [ ] Show current task.
- [ ] Show recent events.
- [ ] Show next safe action.

## Tasks

- [ ] Build compact task list.
- [ ] Add task search.
- [ ] Add active filter.
- [ ] Add blocked filter.
- [ ] Add complete filter.
- [ ] Add phase filter.
- [ ] Show objective preview.
- [ ] Show phase.
- [ ] Show verification cycle.
- [ ] Show blockers/failures.
- [ ] Show write claims when available.
- [ ] Add task switch command palette.

## Lifecycle Flow

- [ ] Add React Flow.
- [ ] Define canonical lifecycle graph.
- [ ] Map ForgeLoop phases to nodes.
- [ ] Distinguish completed/current/pending states.
- [ ] Render diagnosis/correction loop.
- [ ] Render blocked state.
- [ ] Highlight current phase.
- [ ] Add node inspector.
- [ ] Associate ledger events with nodes.
- [ ] Support verification-cycle context.
- [ ] Add accessible non-graph lifecycle representation.

## Contract and routing

- [ ] Build human-readable contract inspector.
- [ ] Show objective.
- [ ] Show deliverables.
- [ ] Show constraints.
- [ ] Show risks.
- [ ] Show verification requirements.
- [ ] Show success criteria.
- [ ] Add raw JSON mode.
- [ ] Build routing visualizer.
- [ ] Show primary guide.
- [ ] Show selected guides.
- [ ] Show excluded guides.
- [ ] Show routing reasons.

## Gates

- [ ] Show required gates.
- [ ] Show satisfied gates.
- [ ] Show blocked/unverified gates.
- [ ] Show gate artifacts.
- [ ] Show decisions.
- [ ] Show unknowns.
- [ ] Show assumptions.
- [ ] Show gate evidence.

## Evidence

- [ ] Build evidence matrix.
- [ ] Map requirements to evidence.
- [ ] Support `OBSERVED`.
- [ ] Support `INFERRED`.
- [ ] Support `NOT_VERIFIED`.
- [ ] Support `BLOCKED`.
- [ ] Support `HYPOTHESIS`.
- [ ] Calculate visible coverage summary without overriding ForgeLoop semantics.
- [ ] Build check execution list.
- [ ] Build check inspector.

## Events

- [ ] Read NDJSON incrementally.
- [ ] Validate event records.
- [ ] Render chronological timeline.
- [ ] Show sequence number.
- [ ] Show timestamps.
- [ ] Show event name.
- [ ] Show event hash.
- [ ] Show previous hash.
- [ ] Show fingerprint.
- [ ] Show details.
- [ ] Add lifecycle filter.
- [ ] Add verification filter.
- [ ] Add diagnosis filter.
- [ ] Add policy filter.
- [ ] Add continuity filter.
- [ ] Virtualize large ledgers.

## Continuity

- [ ] Render continuity state.
- [ ] Show previous/current harness information when recorded.
- [ ] Show last completed work.
- [ ] Show next intended step.
- [ ] Show known blockers.
- [ ] Surface reconciliation requirement.

## Policy

- [ ] Show compliance mode.
- [ ] Show rule count.
- [ ] Show baseline status.
- [ ] Show policy lock status.
- [ ] Show drift.
- [ ] Show selected task policy snapshot.
- [ ] Surface ForgeLoop recovery action such as `RESTORE_POLICY`.

## Live updates

- [ ] Configure Chokidar for `.forgeloop/**/*.json`.
- [ ] Configure Chokidar for `.forgeloop/**/*.ndjson`.
- [ ] Do not recursively watch the entire project.
- [ ] Coalesce burst writes.
- [ ] Reload only affected domain data.
- [ ] Keep last valid snapshot during temporary parse failure.
- [ ] Add retry for atomic write timing.
- [ ] Send typed update event through preload bridge.
- [ ] Update renderer without full page refresh.

## Security

- [ ] Canonicalize selected project root.
- [ ] Enforce project path containment.
- [ ] Reject `..` traversal.
- [ ] Reject symlink escape.
- [ ] Restrict filesystem reads.
- [ ] Restrict raw artifact allowlist.
- [ ] Hardcode read-only ForgeLoop CLI allowlist.
- [ ] Use `spawn`/`execFile` with `shell: false`.
- [ ] Never expose generic command execution to renderer.
- [ ] Add CLI timeout.
- [ ] Add stdout limit.
- [ ] Add JSON size limit.
- [ ] Add JSON depth limit.
- [ ] Add NDJSON line limit.
- [ ] Block untrusted navigation.
- [ ] Sanitize/display hostile strings as text.

## UI polish

- [ ] Use the dark palette from `docs/UI_DESIGN_DIRECTION.md`.
- [ ] Use restrained typography.
- [ ] Use compact developer-tool density.
- [ ] Add consistent hover states.
- [ ] Add consistent focus states.
- [ ] Add selected states.
- [ ] Add subtle transitions.
- [ ] Respect reduced motion.
- [ ] Avoid decorative glow.
- [ ] Avoid unnecessary gradients.
- [ ] Add intentional loading states.
- [ ] Add intentional empty states.
- [ ] Add polished error states.
- [ ] Verify macOS layout.
- [ ] Verify Windows layout.
- [ ] Verify Linux layout.

## Accessibility

- [ ] Meet WCAG AA contrast.
- [ ] Support full keyboard navigation.
- [ ] Add visible focus indicators.
- [ ] Add semantic headings.
- [ ] Add accessible labels to icon buttons.
- [ ] Ensure status is not color-only.
- [ ] Add text alternative for lifecycle graph.
- [ ] Test reduced-motion behavior.

## Testing

- [ ] Configure Vitest.
- [ ] Configure React Testing Library.
- [ ] Configure Playwright Electron tests.
- [ ] Add path-boundary tests.
- [ ] Add protocol-detection tests.
- [ ] Add artifact-validation tests.
- [ ] Add snapshot-builder tests.
- [ ] Add event-parser tests.
- [ ] Add evidence-mapping tests.
- [ ] Add lifecycle-mapping tests.
- [ ] Add CLI-allowlist tests.
- [ ] Add one-active-task fixture.
- [ ] Add complete-task fixture.
- [ ] Add blocked-task fixture.
- [ ] Add stale-task fixture.
- [ ] Add inconsistent-state fixture.
- [ ] Add invalid-artifact fixture.
- [ ] Add multi-task fixture.
- [ ] Add verification-cycle fixture.
- [ ] Add continuity fixture.
- [ ] Add policy-drift fixture.
- [ ] Add large-ledger fixture.
- [ ] Add live-update E2E test.
- [ ] Add symlink escape security test.
- [ ] Add arbitrary IPC rejection test.
- [ ] Add arbitrary command rejection test.

## CI and packaging

- [ ] Add typecheck job.
- [ ] Add lint job.
- [ ] Add test job.
- [ ] Add build job.
- [ ] Add Electron smoke test.
- [ ] Add macOS packaging.
- [ ] Add Windows packaging.
- [ ] Add Linux AppImage packaging.
- [ ] Document signing/notarization requirements.

## MVP release gate

- [ ] Project opens successfully.
- [ ] ForgeLoop v1 compatibility is validated.
- [ ] Multi-task state renders accurately.
- [ ] Lifecycle graph matches canonical state.
- [ ] Next safe action matches ForgeLoop output.
- [ ] Evidence does not overstate inferred results.
- [ ] Event ledger is usable at scale.
- [ ] Continuity is visible.
- [ ] Policy state is visible.
- [ ] Live update works without refresh.
- [ ] Renderer cannot access Node APIs.
- [ ] Arbitrary command execution is impossible.
- [ ] Accessibility checks pass.
- [ ] Typecheck, lint, tests and build all pass.
- [ ] Packaged application launches successfully.

## ForgeLoop 1.6.4 alignment gates

- [x] Pin the vendored ForgeLoop runtime to `1.6.4` at commit `24f50f9eefe5055cec053f075c748542b42e4ea2`.
- [x] Verify package, lockfile, tarball, schema provenance and current compatibility documentation share one ForgeLoop lineage.
- [x] Include trusted schemas for workspace binding, canonical handoffs, responsibility, verification scope and code attestation, including safe local `$ref` dependencies.
- [x] Negotiate the five new feature families independently without changing the protocol-v1 compatibility gate.
- [x] Read the five canonical resources through narrow selected-task adapter/IPC methods.
- [x] Keep workspace binding, handoffs, responsibility, verification scope and attestation read-only in Studio.
- [x] Keep immutable canonical handoffs separate from mutable Continuity.
- [x] Keep verification scope separate from attestation coverage; do not present `IMPACTED` as a supported mode.
- [x] Load attestation lazily and coalesce attestation watcher bursts into targeted updates.
- [x] Add bounded raw-artifact support without trusting the external Sigstore bundle by existence alone.
- [x] Regenerate and verify the deterministic demo with representative optional features and an optional-feature-free task.
- [x] Add unit, integration, schema, reader, watcher and release-contract coverage for the new boundary behavior.
- [ ] Complete platform-specific GitHub Actions release gates and packaged Electron verification on every target runner.
