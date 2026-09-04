# ForgeLoopAudit — Complete Implementation Specification

**Repository:** `cassiomc1/ForgeLoopAudit`
**Product:** ForgeLoopAudit
**Status:** Current implementation and design reference
**Primary stack:** Electron + Node.js + React + TypeScript
**Target ForgeLoop protocol:** v1
**Default product mode:** Local, read-only observer

The current release line is `0.2.0-rc.2`, aligned to ForgeLoop `1.10.0` at
source commit `3bf721bac6a09c6291bfcbc507a66a2833ebddf4` with protocol v1,
schema v1 and Integration API v1. This document describes the implemented
observer boundary and identifies genuine future work explicitly.

---

## 1. Product Vision

ForgeLoopAudit is a desktop application that turns canonical ForgeLoop state
into a traceable engineering audit.

The application must let a user:

1. open ForgeLoopAudit;
2. choose a local project folder;
3. verify that the selected folder contains a valid ForgeLoop installation;
4. discover canonical ForgeLoop tasks in that project;
5. run ForgeLoop's canonical read-only task audit through one integration boundary;
6. separate integrity, completion readiness, quality and trust verdicts;
7. inspect findings with severity, source, evidence, artifacts and canonical remediation;
8. observe structural quality only from ForgeLoop's canonical resource;
9. compare immutable local audit snapshots and export provenance-rich reports;
10. drill into lifecycle, evidence, policy, continuity and diagnostics without gaining mutation authority.

ForgeLoopAudit must never become a second source of truth.

The canonical source of truth remains the ForgeLoop protocol state stored inside the target project.

ForgeLoopAudit is an auditor, correlator and explanation layer. It may derive
presentation findings only when the source projection is available, the rule is
versioned, and the evidence is visible.

```text
ForgeLoop project
       │
       │ Integration API + bounded trusted artifacts
       ▼
ForgeLoopAudit canonical adapters
       │
       │ narrow IPC
       ▼
read-only ForgeLoopAudit renderer
```

### 1.1 Audit decision model

The main-process audit domain is the only place that aggregates audit results.
`CanonicalAuditService` invokes the bundled ForgeLoop Integration API `audit`
command with its exact `{ taskId }` input contract and preserves domain exit
codes. `ProjectAuditService` batches task reads, normalizes canonical errors,
consumes the canonical `task/structural-quality` resource when negotiated, and
produces a deterministic `ProjectAuditSnapshot`.

The snapshot exposes four independent verdicts:

```text
Integrity              VALID | INCONSISTENT | INVALID | UNKNOWN
Completion readiness   VALID | INCOMPLETE | STALE | INVALID | MIXED | UNKNOWN
Engineering quality    PASS | FAIL | BLOCKED | NOT_OBSERVED | MIXED | UNKNOWN
Trust                  VALID | DEGRADED | INVALID | UNKNOWN
```

An optional ForgeLoopAudit score is a comparison aid only. It includes its
coverage percentage and methodology version, is suppressed below 60% coverage,
and never authorizes completion.

### 1.2 Result provenance

Every finding has a stable fingerprint and one of these sources:

```text
FORGELOOP_CANONICAL_AUDIT       [C] Canonical ForgeLoop result
FORGELOOP_CANONICAL_RESOURCE    [C] Canonical ForgeLoop resource
FORGELOOP_AUDIT_DERIVED         [D] ForgeLoopAudit derived analysis
LOCAL_APP_DIAGNOSTIC            [A] Application/runtime diagnostic
```

Unknown canonical error codes remain visible as `UNKNOWN`; unavailable
capabilities remain unavailable. Audit history is written under Electron's
application data directory, never into the audited project's `.forgeloop/`
directory by default. JSON, Markdown and SARIF exports contain ForgeLoop,
ForgeLoopAudit, integration, Git HEAD, timestamp, rules and fingerprint
provenance.

---

## 2. Product Principles

### 2.1 Protocol-first

The UI must represent actual ForgeLoop protocol concepts and artifacts. It must not invent hidden lifecycle states, undocumented completion rules, synthetic evidence, or alternative transitions.

### 2.1a ForgeLoop 1.10.0 Integration boundary

Semantic facts come exclusively from the bundled `@cassiomc1/forgeloop/integration` public subpath (ForgeLoop 1.10.0, Integration API v1, protocol v1, schema v1):

- `protocol/info` — compatibility via `compatibility.schemaVersion` (there is no top-level `schemaVersion`);
- `project/tasks` — canonical task discovery with filesystem parity diagnostics;
- `task/ownership` — canonical claim ownership (`claimState`, `mutationAllowed`, `ownershipValid`, `historicalWriteClaims`, `effectiveWriteClaims`, `reasonCodes`);
- `task/status`, `task/contract`, `task/continuity` — canonical per-task reads;
- read commands (`next`, `progress`, `audit`, `report`, `policy-status`, `validate-state`, `validate-receipt`) run through a ForgeLoopAudit allowlist guard that refuses any invocation whose classification is not strictly `READ_ONLY`, `mutatesProtocol === false` and `executesExternalProcess === false`.

Compatibility modes: `INTEGRATION_V1`, `ARTIFACT_ONLY`, `INCOMPATIBLE`. Capability drift fails closed. In `INTEGRATION_V1`, `project/tasks` drives semantic task existence, policy status and the canonical `next` action run through the Integration API, snapshot and GET_TASK share one canonical task read service, and the execution provenance reader enforces realpath/symlink boundaries on both the executions directory and each file. A legacy CLI mode is intentionally absent from the public mode set: no artifact-level signal reliably identifies older projects, so the ForgeLoopAudit never infers legacy semantics. Operational state is derived from canonical ownership (`ACTIVE`, `RECOVERY_RESUME_REQUIRED`, `COMPLETED_RELEASED`, `BLOCKED`, `OWNERSHIP_INCONSISTENT`, `READ_ONLY_UNKNOWN`) — phase alone never proves claim release. The legacy external CLI remains an isolated read-only compatibility adapter for older projects; the normal `INTEGRATION_V1` snapshot never spawns it.

### 2.1b ForgeLoop 1.10.0 boundary capabilities

ForgeLoop 1.10.0 advertises additive, independently negotiated boundary
capabilities. Existing workspace, responsibility, verification-scope,
attestation and handoff resources remain protocol-v1 compatible. The
`canonicalHandoffs v2` and `advisoryContextProviders v1` contracts are
additive capability metadata; they do not change protocol/schema/API v1:

| Feature | Canonical resource | ForgeLoopAudit contract |
|---|---|---|
| Workspace binding | `task/workspace-binding` | Display `UNBOUND`, `MATCH`, `MISMATCH`, `INVALID` or `UNAVAILABLE`; never bind or rebind |
| Canonical handoffs | `task/handoffs` | Display immutable snapshots and canonical acceptance; never call `handoff-create`, `handoff-accept` or label a handoff/receipt as evidence, authority or delegation |
| Responsibility constraints | `task/responsibility` | Display `NOT_APPLICABLE`, `VALID` or `INVALID` with exact upstream errors; never call `responsibility-set` |
| Differential verification scope | `task/verification-scope` | Display requested `AUTO`, `CHANGED`, `CLAIMED` or `FULL` and resolved `CHANGED`, `CLAIMED`, `FULL` or `UNRESOLVED`; never compute scope or render `IMPACTED` as supported |
| Code attestation | `task/attestation` | Display canonical status and independent `PROCESSED`, `VERIFIED` or `ATTESTED` trust levels; never create or sign attestations |

The resources are read through narrow, selected-task APIs and optional failures
remain isolated. Handoff acceptance is normalized only from the canonical
`handoff.acceptance` projection and is displayed as an operational receipt;
acceptance transfers no claims, evidence or authority. ForgeLoopAudit never creates or
accepts handoffs. Advisory context providers are advertised through
`advisoryContextProviders v1` only when all trust fields are exact: provider
neutral, Integration API only, lazy, opt-in, not persisted by ForgeLoop,
non-authoritative, non-evidence and non-executable. ForgeLoopAudit does not invoke
recall, load memory or persist advisory context. Attestation is lazy and
panel-scoped. ForgeLoopAudit never creates or signs attestations. Attestation status is
loaded only for the selected task; ForgeLoopAudit may request ForgeLoop's canonical
local content verification when no external signing-provider execution is
required. External signing-provider verification is never triggered
automatically. ForgeLoopAudit never binds a workspace, creates a handoff, sets
responsibility or computes verification scope. Verification scope is distinct
from attestation coverage, and mutable Continuity remains separate from
immutable canonical handoffs.

### 2.1c ForgeLoop adaptive efficiency context

ForgeLoop 1.7.0 adds the canonical `task/context` projection. ForgeLoopAudit reads it
only when the complete advertised capability is present and displays the
requested profile, safety floor, resolved profile, escalation state, bounded
context policy and invariants without classifying the task locally. Older
compatible hosts receive an explicit balanced compatibility projection;
advertised-but-unavailable or malformed context remains unavailable.

Efficiency telemetry is host/provider-reported or `UNKNOWN` and is never
estimated from event counts, wall-clock time or provider-specific tokenizers.
Context inflation and benchmark regression statuses are observational,
non-blocking diagnostics. The panel preserves `NOT MEASURED` when trusted
usage or quality data is absent and never changes lifecycle authority or
completion state.

### 2.1d ForgeLoop 1.10.0 Structural Quality capability

ForgeLoop 1.10.0 advertises the provider-neutral `structuralQuality` feature
and the read-only `task/structural-quality` resource. ForgeLoopAudit consumes
that canonical projection when the negotiated capability is present and renders
mode, provider, baseline, current status, quality signal, delta, bottleneck,
verification cycle, completion requirement, reason codes, evidence kind and
artifact references. Structural Quality remains unavailable when the upstream
capability or resource is absent; ForgeLoopAudit never invokes a Sentrux or
other external provider, calculates a replacement score, or promotes unknown
data to pass. Observe-mode failures remain quality findings without changing
ForgeLoop completion authority; gate-mode failures retain the canonical blocking
meaning supplied by ForgeLoop.

### 2.2 Read-only by default

Version 1 must not mutate target project protocol state.

The application may execute read-only ForgeLoop commands such as:

```bash
forgeloop protocol-info --json
forgeloop task-list --json
forgeloop task-show --task <id> --json
forgeloop status --task <id> --json
forgeloop progress --task <id> --json
forgeloop continuity --task <id> --json
forgeloop next --task <id> --json
forgeloop audit --task <id> --json
forgeloop report --task <id> --json
forgeloop policy-status --json
```

The application must not execute mutating lifecycle commands. In
`INTEGRATION_V1`, canonical status, policy and next-action reads use the
Integration API; the allowlisted external CLI is isolated to older
artifact-only compatibility paths and remains read-only.

Examples prohibited in v1:

```bash
forgeloop advance
forgeloop complete
forgeloop clear-state
forgeloop route
forgeloop record-check
forgeloop run-check
forgeloop record-diagnosis
forgeloop baseline --record
```

### 2.3 Local-first

No account, cloud backend, remote telemetry or mandatory external API is required.

### 2.4 Explainable UI

Every major visual status must be traceable to one or more ForgeLoop artifacts or a read-only ForgeLoop CLI result.

### 2.5 Minimal visual noise

The interface must be dark, modern, highly polished and restrained.

Avoid:

- unnecessary gradients;
- glowing cyberpunk visuals;
- excessive borders;
- oversized icons;
- constant animations;
- saturated colors without semantic meaning.

Use color primarily for state and attention.

---

# 3. Recommended Technology Stack

## 3.1 Desktop shell

- Electron
- Electron Builder
- Node.js 20+
- TypeScript

## 3.2 Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Radix UI primitives where useful
- Lucide React icons
- `@xyflow/react` for lifecycle and task flow visualization

## 3.3 Local data and validation

- Chokidar for filesystem observation
- Ajv for JSON Schema validation
- Zod only for application-owned view-model validation if useful

ForgeLoop protocol artifacts themselves should be validated against ForgeLoop schemas rather than duplicated application schemas whenever practical.

## 3.4 Testing

- Vitest
- React Testing Library
- Playwright
- Electron integration tests

## 3.5 Optional later dependencies

Do not include these in the MVP unless justified by an implemented feature:

- Monaco Editor for advanced raw JSON inspection
- SQLite for historical snapshots
- chart libraries
- GitHub SDK
- telemetry SDKs
- auto-updater infrastructure

---

# 4. High-Level Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                       ForgeLoopAudit                        │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Electron Main                                                │
│  ├── Application lifecycle                                    │
│  ├── Native folder picker                                     │
│  ├── Project access boundary                                  │
│  ├── ForgeLoop process runner                                 │
│  ├── Filesystem watcher                                       │
│  └── IPC handlers                                             │
│                         │                                     │
│                         ▼                                     │
│  Core / Domain                                                 │
│  ├── Protocol detector                                        │
│  ├── Project reader                                           │
│  ├── Artifact parser                                          │
│  ├── Protocol validator                                       │
│  ├── Snapshot builder                                         │
│  ├── Event ledger reader                                      │
│  ├── Task indexer                                             │
│  ├── CLI bridge                                               │
│  └── Change coalescer                                         │
│                         │                                     │
│                         ▼                                     │
│  Preload                                                      │
│  └── Narrow typed IPC API                                     │
│                         │                                     │
│                         ▼                                     │
│  React Renderer                                               │
│  ├── Overview                                                 │
│  ├── Tasks                                                    │
│  ├── Flow                                                     │
│  ├── Contract                                                 │
│  ├── Evidence                                                 │
│  ├── Events                                                   │
│  ├── Continuity                                               │
│  ├── Policy                                                   │
│  └── Settings                                                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    selected project
                            │
                            ▼
                     .forgeloop/
```

---

# 5. Security Architecture

Electron security must be treated as a release blocker.

## 5.1 BrowserWindow requirements

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  preload: preloadPath,
}
```

## 5.2 Renderer restrictions

The renderer must not receive:

- direct Node.js access;
- `fs`;
- unrestricted `child_process`;
- Electron main-process APIs;
- arbitrary filesystem paths;
- arbitrary command execution.

## 5.3 Project directory boundary

After project selection, the main process must establish one canonical project root.

Every filesystem access must be checked against that root.

The application should normally read only:

```text
<project>/.forgeloop/
<project>/.git/HEAD
<project>/.git/refs/...
```

Additional project metadata should only be read if needed and bounded.

## 5.4 Path normalization

Every path must:

1. be resolved to an absolute path;
2. be normalized;
3. be checked for traversal;
4. remain inside the selected project;
5. reject disallowed symlink escapes.

## 5.5 CLI execution boundary

The CLI bridge must execute only a hardcoded allowlist of read-only ForgeLoop commands.

Never accept an arbitrary executable, command or command arguments directly from renderer input.

Use `spawn` / `execFile`, not shell string concatenation.

Preferred pattern:

```ts
spawn(executable, args, {
  cwd: projectRoot,
  shell: false,
})
```

## 5.6 Resource limits

Add limits for:

- JSON file size;
- JSON nesting depth;
- NDJSON line size;
- total event count loaded in one UI batch;
- CLI stdout size;
- CLI timeout;
- watcher burst frequency.

---

# 6. Project Detection Flow

When the user chooses a folder:

```text
Select directory
      │
      ▼
Resolve canonical path
      │
      ▼
Check .forgeloop/
      │
  missing? ── yes ──> Show "Not a ForgeLoop project"
      │
      no
      ▼
Run protocol-info --json
      │
      ▼
Validate compatibility
      │
 unsupported? ──> Show compatibility error
      │
      ▼
Build project snapshot
      │
      ▼
Start watcher
      │
      ▼
Open dashboard
```

## 6.1 Detection result

```ts
interface ProjectDetectionResult {
  projectRoot: string;
  forgeLoopRoot: string;
  protocolVersion: number;
  schemaVersion: number;
  forgeLoopVersion?: string;
  compatible: boolean;
  warnings: string[];
}
```

---

# 7. Internal Domain Model

The renderer must consume application-owned view models rather than raw filesystem data everywhere.

## 7.1 ProjectSnapshot

```ts
interface ProjectSnapshot {
  project: ProjectSummary;
  protocol: ProtocolSummary;
  health: ProjectHealth;
  tasks: TaskSummary[];
  activeTaskId?: string;
  sessions: SessionSummary[];
  policy?: PolicySummary;
  updatedAt: string;
}
```

## 7.2 ProjectSummary

```ts
interface ProjectSummary {
  name: string;
  rootPath: string;
  branch?: string;
  head?: string;
}
```

## 7.3 ProtocolSummary

```ts
interface ProtocolSummary {
  protocolVersion: number;
  schemaVersion: number;
  packageVersion?: string;
  compatible: boolean;
}
```

## 7.4 TaskSummary

```ts
interface TaskSummary {
  taskId: string;
  taskKey: string;
  objective?: string;
  phase: ForgeLoopPhase;
  previousPhase?: ForgeLoopPhase;
  selectedGuides: string[];
  completedSteps: string[];
  pendingSteps: string[];
  blockers: BlockerSummary[];
  failures: FailureSummary[];
  checks: CheckSummary[];
  gates: GateSummary[];
  evidenceCoverage: EvidenceCoverageSummary;
  verificationCycle?: number;
  publicationStatus?: string;
  lastUpdated?: string;
  nextAction?: NextActionSummary;
  continuity?: ContinuitySummary;
}
```

## 7.5 ForgeLoop phases

Support the canonical lifecycle values:

```text
RECEIVED
DISCOVERING
CONTRACT_READY
ROUTED
DESIGNING
PLANNED
EXECUTING
VERIFYING
DIAGNOSING
CORRECTING
REVIEWING
COMPLETE
BLOCKED
```

Do not silently render unknown phases as valid.

An unknown value should produce a protocol compatibility warning.

---

# 8. Main Application Layout

The primary desktop layout should be:

```text
┌──────────────────────────────────────────────────────────────────────┐
│  ForgeLoopAudit      project-name         protocol v1     ● Live │
├──────────────┬───────────────────────────────────────────────────────┤
│              │                                                       │
│ Audit Summary│                                                       │
│ Findings     │                     CONTENT                           │
│ Tasks        │                                                       │
│ Evidence    │                                                       │
│ Quality     │                                                       │
│ Policy & Trust│                                                     │
│ Audit History│                                                      │
│ Reports     │                                                       │
│ Diagnostics │                                                       │
│              │                                                       │
│ Settings     │                                                       │
├──────────────┴───────────────────────────────────────────────────────┤
│  project path                                         connection    │
└──────────────────────────────────────────────────────────────────────┘
```

The implemented navigation order is Audit Summary, Findings, Tasks, Evidence,
Quality, Policy & Trust, Audit History, Reports, Diagnostics and Settings.
Lifecycle, Contract, Events, Executions, Continuity and Actions remain detailed
read-only drill-down surfaces. The older protocol-object pages are not the
primary workflow; audit questions, findings and provenance are.

## 8.1 Sidebar

Collapsed width:

```text
64 px
```

Expanded width:

```text
220–240 px
```

The app should remember the visual preference locally.

## 8.2 Top bar

Must show:

- project name;
- Git branch;
- short HEAD hash;
- protocol version;
- global health;
- live watcher status.

Do not make the top bar visually dominant.

---

# 9. Design System

## 9.1 Visual direction

The target visual quality should feel comparable to modern developer products such as:

- Linear;
- Raycast;
- Vercel dashboard;
- GitHub Desktop;
- modern observability tools.

Do not clone their exact UI.

## 9.2 Color system

Recommended dark palette:

```text
App background       #09090B
Primary surface      #0D0D10
Secondary surface    #121216
Elevated surface     #17171C
Hover surface        #1C1C22
Border subtle        #24242A
Border strong        #303038

Text primary         #F5F5F6
Text secondary       #A1A1AA
Text muted           #71717A

Forge accent         #FF7A18
Forge accent hover   #FF8A32

Success              #22C55E
Warning              #F59E0B
Danger               #EF4444
Info                  #60A5FA
```

Semantic status colors must be consistent across the entire product.

## 9.3 Typography

Primary font:

```text
Inter
```

Technical / monospace:

```text
JetBrains Mono
```

Fallbacks must be system-safe.

## 9.4 Radius

Prefer:

```text
8px
10px
12px
```

Avoid excessive pill-shaped surfaces.

## 9.5 Shadows

Use very subtle shadows only where necessary to separate overlays, inspectors and command palettes.

Do not use glow effects.

## 9.6 Motion

Motion should communicate state, not decoration.

Examples:

- subtle phase transition pulse;
- node state interpolation;
- inspector slide/fade;
- list insertion animation;
- live event appearance.

Respect `prefers-reduced-motion`.

---

# 10. Landing / Project Selection Screen

The first screen should be intentionally simple.

```text
                    ForgeLoopAudit

       Visualize your engineering loop in real time.

              ┌────────────────────┐
              │   Open Project     │
              └────────────────────┘

             Recent projects

       ecommerce-platform        ~/Code/...
       auth-service              ~/Code/...
```

## 10.1 Recent projects

Store only local UI convenience metadata:

```ts
interface RecentProject {
  path: string;
  name: string;
  lastOpenedAt: string;
}
```

Do not store ForgeLoop protocol state copies in v1.

---

# 11. Overview Screen

The overview is the application's executive engineering summary.

Recommended composition:

```text
PROJECT HEALTH
VALID

Active tasks       3
Blocked tasks      0
Verification       87%
Current sessions   1

ACTIVE TASK
implement-auth
EXECUTING

[ lifecycle preview ]

NEXT SAFE ACTION
Continue implementation and advance to VERIFYING

RECENT EVENTS
...
```

The overview must prioritize:

1. current health;
2. current active work;
3. next action;
4. blockers;
5. recent evidence/events.

---

# 12. Task List

Represent tasks as compact rows rather than oversized cards.

Example:

```text
● implement-auth        EXECUTING     72%     2 blockers
● checkout-refactor     VERIFYING     88%     clear
○ dashboard-redesign    PLANNED       33%     clear
✓ docs-fix              COMPLETE      100%    valid
```

Each task row should expose:

- task ID;
- objective summary;
- phase;
- progress indicator;
- verification cycle;
- blockers/failures;
- last update;
- write claims if available.

## 12.1 Filters

Support:

- all;
- active;
- blocked;
- complete;
- phase;
- search by task ID/objective.

---

# 13. Lifecycle Flow View

This is the signature ForgeLoopAudit screen.

Use React Flow for the interactive visualization.

## 13.1 Canonical flow

```text
REQUEST
   │
DISCOVERY
   │
CONTRACT
   │
ROUTING
   │
DESIGN
   │
PLAN
   │
EXECUTE ─────────────────┐
   │                     │
VERIFY                   │
   │                     │
 failure                 │
   ▼                     │
DIAGNOSE                 │
   │                     │
CORRECT ─────────────────┘
   │
REVIEW
   │
COMPLETE
```

## 13.2 Node visual states

Completed:

```text
✓ CONTRACT
```

Current:

```text
● EXECUTING
```

Pending:

```text
○ VERIFYING
```

Blocked:

```text
× BLOCKED
```

Failure path:

```text
! DIAGNOSING
```

## 13.3 Current node

The current lifecycle node should receive the strongest semantic emphasis.

Do not animate all nodes.

## 13.4 Interaction

Clicking a node opens a right-side inspector containing:

- mapped protocol phase;
- first timestamp observed;
- most recent timestamp;
- associated ledger events;
- checks;
- blockers;
- artifacts;
- relevant evidence;
- raw source links.

---

# 14. Verification Cycle Visualization

ForgeLoopAudit must visually communicate that ForgeLoop is a loop, not only a linear pipeline.

Example:

```text
Cycle 1
EXECUTE → VERIFY → FAIL → DIAGNOSE → CORRECT

Cycle 2
EXECUTE → VERIFY → PASS → REVIEW
```

Display cycle chips:

```text
01 FAILED
02 PASSED
```

If historical events allow reconstruction, selecting a cycle filters the flow, evidence and event timeline to that cycle.

---

# 15. Next Safe Action Panel

The UI should surface the result of:

```bash
forgeloop next --task <id> --json
```

Examples:

```text
NEXT SAFE ACTION
Continue implementation.
Expected next phase: VERIFYING
```

```text
ACTION REQUIRED
RESTORE_POLICY
Policy drift was detected after preflight.
```

```text
BLOCKED
Missing required DESIGN gate.
```

The UI must distinguish:

- normal progress;
- recovery action;
- blocker;
- protocol inconsistency.

---

# 16. Contract Inspector

Default to a human-readable representation.

```text
OBJECTIVE
Implement OAuth authentication.

DELIVERABLES
✓ Login endpoint
✓ OAuth callback
✓ Session persistence

CONSTRAINTS
• Preserve existing API contract
• No new database dependency

RISKS
Authentication
Untrusted input

SUCCESS CRITERIA
✓ Login works
✓ Logout works
○ Regression suite
```

Provide a secondary raw JSON view.

Do not expose raw JSON as the default experience.

---

# 17. Routing Visualizer

Represent the relationship between task signals and selected engineering guides.

```text
TASK SIGNALS
backend
authentication
untrusted-input

        ↓

GUIDE ROUTER

        ↓

clean          selected
test           selected
security       selected
performance    selected
design         excluded
premium        excluded
```

For each guide show:

- selected/excluded;
- reason;
- relevant task signal;
- primary guide if present.

---

# 18. Gates View

Display mandatory gates and gate status.

```text
DESIGN
Satisfied

SECURITY REVIEW
Satisfied

ARCHITECTURE
Unverified
```

Each gate inspector may show:

- status;
- requiredBy;
- artifacts;
- decisions;
- unknowns;
- approved assumptions;
- evidence.

---

# 19. Evidence Matrix

This screen should answer:

> Why can or cannot this task be considered complete?

Example:

```text
Requirement                  Evidence               Status
Login succeeds               npm test               OBSERVED
Secrets are absent           security check         OBSERVED
Responsive UI                visual validation      OBSERVED
Production deployed          —                      NOT VERIFIED
```

## 19.1 Evidence summary

```text
Evidence coverage   87%

Observed            13
Inferred             2
Blocked              1
Not verified         2
Hypothesis           1
```

## 19.2 Semantic states

Support ForgeLoop evidence semantics including:

```text
OBSERVED
INFERRED
NOT_VERIFIED
BLOCKED
HYPOTHESIS
```

Never display `INFERRED` as equivalent to `OBSERVED`.

---

# 20. Execution and Check Inspector

List verification/check executions compactly.

```text
✓ unit-tests       4.2s
✓ lint             1.1s
× integration      8.8s
✓ security         2.9s
```

Expanded details:

```text
Check: integration
Status: failed
Command: npm test
Exit code: 1
Started: ...
Finished: ...
Requirement: integration-tests
```

Command content is display-only.

Never provide a UI control that executes arbitrary recorded commands in v1.

---

# 21. Event Ledger Timeline

The event ledger must feel like a Git history for the engineering process.

Example:

```text
#42  VERIFICATION_STARTED      12:32:17
 │
#41  EXECUTION_COMPLETED       12:31:44
 │
#40  EXECUTION_STARTED         12:14:08
 │
#39  PREFLIGHT_READY           12:13:52
 │
#38  ROUTE_VALIDATED           12:13:48
 │
#37  CONTRACT_VALIDATED        12:13:46
```

## 21.1 Event detail inspector

Show:

- sequence;
- event name;
- timestamp;
- fingerprint;
- previous hash;
- hash;
- details;
- verification cycle if inferable.

## 21.2 Pagination

Do not render thousands of ledger events at once.

Use:

- incremental loading;
- virtualization;
- event filters.

Filters:

- lifecycle;
- verification;
- diagnosis;
- policy;
- continuity;
- completion;
- errors.

---

# 22. Historical Replay

This is not required for MVP but the architecture should make it possible.

Future behavior:

```text
[◀] [Play] [▶]

Event #37 ───────────── Event #42
```

Selecting a historical ledger position reconstructs the best-known protocol state at that point without changing actual project files.

Do not implement this until the base event model is stable.

---

# 23. Cross-Harness Continuity

Display continuity as first-class state.

Example:

```text
PREVIOUS HARNESS
Claude Code
Session 17

        ↓ handoff

CURRENT HARNESS
Codex
Session 18
```

Inspector:

```text
Phase
EXECUTING

Last completed
OAuth callback

Next intended step
Add refresh token tests

Known blockers
None
```

If continuity reconciliation is required, display a visible warning.

---

# 24. Sessions within Continuity and Diagnostics

The current renderer presents recorded ForgeLoop activation sessions in the
Continuity surface alongside canonical continuity and handoff context. There
is no separate Sessions navigation item. If ForgeLoop does not expose enough
information to identify a session as current, ForgeLoopAudit labels it conservatively
instead of inferring false state.

Example:

```text
ACTIVE SESSION
session-a71f
Created 12:04

PREVIOUS
session-981a
Created 09:44
```

If ForgeLoop does not expose enough information to reliably identify a session as current, label the view conservatively rather than inferring false state.

---

# 25. Policy View

Display:

- compliance mode;
- active rule set;
- policy lock health;
- baseline status;
- drift;
- policy snapshot for selected task.

Example:

```text
POLICY
Strict

Policy lock       VALID
Baseline          VALID
Rules             18
Drift              0
```

If recovery is required:

```text
POLICY DRIFT
RESTORE_POLICY required
```

---

# 26. Project Health

The ForgeLoopAudit should expose ForgeLoop completion/health semantics with strong visual clarity.

Known terminal/health values may include:

```text
VALID
INCOMPLETE
STALE
INCONSISTENT
INVALID
```

Respect ForgeLoop precedence.

Do not invent a ForgeLoopAudit-specific status that conflicts with ForgeLoop status.

A global health summary may show:

```text
PROJECT HEALTH
VALID

Protocol       ✓
State          ✓
Evidence       ✓
Policy         ✓
Continuity     ✓
```

---

# 27. Multi-Task Experience

ForgeLoopAudit must work well when many tasks exist concurrently.

## 27.1 Task selector

Global keyboard shortcut:

```text
Cmd/Ctrl + K
```

Command menu:

```text
Switch task
Open project
Go to events
Go to evidence
Go to flow
```

Do not add write operations to the command menu in v1.

## 27.2 Write claims

If write claims are available, visualize them.

Example:

```text
implement-auth
src/auth
src/session

dashboard-redesign
src/dashboard
```

## 27.3 Claim conflict warning

```text
CLAIM CONFLICT

auth-refactor
↕
session-fix

src/auth/session.ts
```

---

# 28. Live Update System

ForgeLoopAudit should update automatically when protocol artifacts change.

Watch:

```text
.forgeloop/**/*.json
.forgeloop/**/*.ndjson
```

Do not watch the entire project recursively unless needed.

## 28.1 Change flow

```text
ForgeLoop writes artifact
        │
        ▼
Chokidar receives event
        │
        ▼
Debounce / coalesce
        │
        ▼
Determine affected task/domain
        │
        ▼
Reload minimum required artifacts
        │
        ▼
Validate
        │
        ▼
Build immutable snapshot
        │
        ▼
Send typed IPC event
        │
        ▼
React updates affected views
```

## 28.2 Debounce

Recommended initial debounce:

```text
50–150 ms
```

Multiple atomic ForgeLoop writes may occur close together. The UI should avoid rendering intermediate inconsistent states when a short coalescing window is sufficient.

## 28.3 Broken intermediate state

If an artifact is temporarily unreadable during write:

1. keep last valid snapshot;
2. retry briefly;
3. do not crash;
4. display a transient synchronization indicator only if necessary.

---

# 29. IPC Contract

Expose a narrow preload API.

Example:

```ts
interface ForgeLoopAuditAPI {
  selectProject(): Promise<ProjectDetectionResult | null>;
  openRecentProject(path: string): Promise<ProjectDetectionResult>;
  closeProject(): Promise<void>;

  getProjectSnapshot(): Promise<ProjectSnapshot>;
  getTask(taskId: string): Promise<TaskSnapshot>;
  getTaskEvents(taskId: string, cursor?: string): Promise<EventPage>;
  getRawArtifact(taskId: string, artifact: AllowedArtifact): Promise<string>;

  subscribeProjectUpdates(
    listener: (update: ProjectUpdate) => void
  ): () => void;
}
```

Do not expose generic APIs such as:

```ts
readFile(path)
runCommand(command)
exec(args)
openPath(path)
```

---

# 30. Recommended Folder Structure

```text
ForgeLoopAudit/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
│
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── ui-system.md
│   └── protocol-compatibility.md
│
├── src/
│   ├── main/
│   │   ├── app.ts
│   │   ├── create-window.ts
│   │   ├── ipc/
│   │   │   ├── register-ipc.ts
│   │   │   ├── project.handlers.ts
│   │   │   └── task.handlers.ts
│   │   └── security/
│   │       └── navigation-policy.ts
│   │
│   ├── preload/
│   │   ├── index.ts
│   │   └── api.ts
│   │
│   ├── core/
│   │   ├── project/
│   │   │   ├── detector.ts
│   │   │   ├── project-reader.ts
│   │   │   └── project-snapshot.ts
│   │   ├── protocol/
│   │   │   ├── compatibility.ts
│   │   │   ├── validator.ts
│   │   │   └── artifact-registry.ts
│   │   ├── tasks/
│   │   │   ├── task-index.ts
│   │   │   ├── task-reader.ts
│   │   │   └── task-snapshot.ts
│   │   ├── events/
│   │   │   ├── ledger-reader.ts
│   │   │   └── event-index.ts
│   │   ├── cli/
│   │   │   ├── forge-cli.ts
│   │   │   └── allowed-commands.ts
│   │   ├── watcher/
│   │   │   ├── project-watcher.ts
│   │   │   └── change-coalescer.ts
│   │   └── security/
│   │       ├── path-boundary.ts
│   │       └── resource-limits.ts
│   │
│   ├── renderer/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── routes/
│   │   ├── pages/
│   │   │   ├── ProjectPicker.tsx
│   │   │   ├── Overview.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── Flow.tsx
│   │   │   ├── Contract.tsx
│   │   │   ├── Evidence.tsx
│   │   │   ├── Events.tsx
│   │   │   ├── Continuity.tsx
│   │   │   ├── Policy.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── app-shell/
│   │   │   ├── flow/
│   │   │   ├── tasks/
│   │   │   ├── evidence/
│   │   │   ├── events/
│   │   │   ├── inspectors/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── styles/
│   │
│   └── shared/
│       ├── domain.ts
│       ├── ipc.ts
│       ├── constants.ts
│       └── errors.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── e2e/
│
├── FORGELOOP_AUDIT_IMPLEMENTATION_SPEC.md
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.yml
```

---

# 31. State Management

Prefer lightweight application state.

Recommended:

- React Query/TanStack Query for async snapshot queries if needed;
- Zustand for small UI state if necessary;
- React local state for component-local behavior.

Do not introduce Redux unless complexity proves it necessary.

Canonical ForgeLoop project state must never live primarily in a client-side store.

Stores should cache or represent snapshots only.

---

# 32. Error Model

Create application-level error categories:

```text
PROJECT_NOT_FORGELOOP
PROTOCOL_UNSUPPORTED
ARTIFACT_INVALID
ARTIFACT_UNREADABLE
CLI_NOT_FOUND
CLI_FAILED
PATH_BOUNDARY_VIOLATION
LEDGER_INVALID
WATCHER_FAILED
PROJECT_REMOVED
PERMISSION_DENIED
UNKNOWN_ERROR
```

Every error should have:

```ts
interface AuditAppError {
  code: AuditAppErrorCode;
  message: string;
  recoverable: boolean;
  details?: string;
}
```

User-facing errors should be clear and non-technical by default.

A details section may expose technical context.

---

# 33. Empty States

Design empty states intentionally.

Examples:

## No task

```text
No ForgeLoop tasks yet.
Create a task using the ForgeLoop CLI and it will appear here automatically.
```

## No events

```text
No lifecycle events have been recorded for this task.
```

## No evidence

```text
Verification evidence has not been recorded yet.
```

## Unsupported protocol

```text
This project uses a ForgeLoop protocol version that this ForgeLoopAudit version does not understand.
```

---

# 34. Accessibility

Requirements:

- keyboard navigation for all interactive elements;
- visible focus states;
- WCAG AA contrast minimum;
- no meaning communicated only by color;
- reduced motion support;
- semantic headings;
- accessible names for icons;
- tooltips must not be the sole source of essential information;
- React Flow nodes must have meaningful labels in an accessible alternative representation.

---

# 35. Performance Requirements

Targets for a typical project:

```text
Cold start                     < 2.5 s
Project detection              < 1.0 s
Task switch perceived latency  < 150 ms
Watcher UI propagation         < 300 ms
Initial 1k event load          < 500 ms
```

These are engineering targets, not protocol requirements.

## 35.1 Large ledger handling

Use streaming/line iteration rather than reading massive NDJSON files into memory when the ledger grows.

Maintain an index when useful, but do not mutate the target `.forgeloop` directory for ForgeLoopAudit-owned caches.

ForgeLoopAudit caches belong in the application's own user data directory.

---

# 36. ForgeLoop Compatibility Strategy

## 36.1 Handshake

On every project open, the main process loads ForgeLoop's bundled Integration
API and reads the canonical `protocol/info` resource. The compatibility block
provides `protocolVersion` and `schemaVersion`; ForgeLoopAudit does not read a
nonexistent top-level schema field. It then negotiates the advertised
Integration API version, executor parity, durable recovery contract and
required core resources. Unknown protocol/schema versions or core capability
drift fail closed to `INCOMPATIBLE`; an unavailable Integration API degrades to
`ARTIFACT_ONLY` without guessing ownership.

## 36.2 Supported protocol registry

The current v1 compatibility registry is implemented at
`src/main/core/protocol/protocol-capabilities.ts` and is kept separate from
renderer components:

```ts
const supportedProtocols = {
  1: protocolV1Adapter,
};
```

Do not scatter protocol-version conditionals through UI components.

## 36.3 Adapter boundary

```text
ForgeLoop project
          │
          ▼
Integration API + trusted artifact readers
          │
          ▼
ForgeLoopAudit domain model
          │
          ▼
React UI
```

A future protocol v2 should require a new adapter without rewriting the interface.

---

# 37. Raw Artifact Access

A technical inspector may expose raw artifacts.

Allowlisted examples:

```text
contract.json
routing-result.json
preflight.json
work-state.json
continuity.json
execution-receipt.json
policy-snapshot.json
events.ndjson
recovery.json
execution.json
workspace-binding.json
responsibility.json
verification-scope.json
handoff.json
code-manifest.json
attestation-statement.json
```

These are bounded, allowlisted detail views. Canonical semantic facts come
from the Integration API, collection paths are validated against the selected
project boundary, and oversized or symlinked content is withheld. Do not
expose arbitrary project file browsing in v1.

---

# 38. Settings

The current Settings surface keeps UI preferences local to the renderer and
exposes privacy-safe diagnostics plus read-only runtime/protocol metadata.
Current controls include:

```text
Appearance
  Theme: Dark
  UI density: Comfortable / Compact
  Reduce motion: System / On / Off

Behavior
  Reopen last project
  Show technical hashes
  Event time format

Developer
  Show raw protocol artifacts
```

The protocol section also displays ForgeLoop package, protocol/schema versions,
compatibility mode and independently negotiated boundary capabilities,
including adaptive execution-profile context and efficiency observability.
Protocol state and project policy remain read-only. Dark theme is the default
and flagship appearance.

A light theme is not required for the MVP.

---

# 39. Keyboard Shortcuts

Recommended:

```text
Cmd/Ctrl + O       Open project
Cmd/Ctrl + K       Command palette / switch task
Cmd/Ctrl + 1       Overview
Cmd/Ctrl + 2       Tasks
Cmd/Ctrl + 3       Flow
Cmd/Ctrl + 4       Evidence
Cmd/Ctrl + 5       Events
Cmd/Ctrl + ,       Settings
Esc                Close inspector/dialog
```

---

# 40. Current release surface

The current release line implements the read-only observer contract across the
following surfaces:

- secure Electron shell, typed preload bridge, project discovery and recent
  project handling;
- protocol/schema validation, Integration API capability negotiation and the
  `INTEGRATION_V1`, `ARTIFACT_ONLY` and `INCOMPATIBLE` modes;
- multi-task Overview and Tasks views with lifecycle Flow, Contract, Evidence,
  Events, Executions, Continuity, Diagnostics, Actions, Policy and Settings;
- canonical ownership, durable recovery, observability, gates, checks,
  evidence, policy, next-action, execution provenance and bounded raw-artifact
  detail;
- adaptive execution-profile context with explicit balanced compatibility,
  host/provider-reported usage, context-inflation diagnostics and
  `NOT MEASURED` handling for unavailable efficiency evidence;
- independently degraded Workspace Binding, Canonical Handoffs,
  Responsibility Constraints, Differential Verification Scope and Code
  Attestation presentations;
- selective live updates, path/symlink/resource limits, read-only command
  allowlisting, keyboard/focus support, reduced motion and automated tests;
  and
- unsigned preview packaging with shared verification, native smoke and
  release-evidence contracts.

The 1.10.0 boundary capabilities remain read-only. ForgeLoopAudit does not create
tasks, mutate lifecycle state, bind workspaces, create or accept handoffs, set
responsibility, compute verification scope, create/sign attestations or invoke
external signing-provider verification automatically. Handoff acceptance is
an operational receipt only, and advisory context is host-provided, lazy,
opt-in, non-persisted, non-authoritative and non-executable; ForgeLoopAudit does not
load or recall it.

## Future / non-current

- write/operator mode;
- task creation;
- lifecycle mutation;
- AI summaries;
- GitHub integration;
- remote project access;
- cloud synchronization;
- team dashboard;
- telemetry;
- historical replay;
- plugins;
- arbitrary terminal execution.

---

# 41. Phase 2 Candidates

After MVP stability:

- historical lifecycle replay;
- side-by-side task comparison;
- project engineering analytics;
- verification-cycle trends;
- protocol drift history;
- richer write-claim visualization;
- optional Git integration;
- optional GitHub status context;
- exportable HTML/PDF engineering report;
- operator mode with explicit confirmation and strict CLI allowlist.

---

# 42. Operator Mode — Future Design Boundary

If write capabilities are ever added, they must be visibly separated from observer mode.

Example:

```text
Observer Mode
Read only
```

Future:

```text
Operator Mode
Protocol mutations enabled
```

Every mutating command must:

1. be explicit;
2. show exact target task;
3. show exact ForgeLoop action;
4. require an intentional user gesture;
5. use a strict command allowlist;
6. return ForgeLoop's real result;
7. update the UI only after observing canonical state changes.

The UI must never fabricate successful completion after issuing a command.

---

# 43. Testing Strategy

The current repository implements unit, integration-style fixture, renderer,
Electron smoke, Playwright and packaged verification coverage. The detailed
test files and the executable [`npm run verify:full`](docs/QUALITY_GATES.md)
contract are the current verification authority; the examples below describe
the coverage intent rather than an unchecked future backlog.

## 43.1 Unit tests

Test:

- path boundary validation;
- protocol detection;
- artifact parsing;
- task snapshot construction;
- event parsing;
- evidence mapping;
- lifecycle-node mapping;
- status precedence rendering;
- CLI allowlist;
- error normalization.

## 43.2 Integration tests

Create realistic `.forgeloop` fixtures for:

- empty project;
- one active task;
- complete task;
- blocked task;
- stale task;
- inconsistent state;
- invalid artifact;
- multiple concurrent tasks;
- verification failure cycle;
- continuity handoff;
- policy drift;
- large event ledger.

## 43.3 E2E tests

Playwright + Electron should verify:

1. launch app;
2. choose fixture project;
3. detect ForgeLoop;
4. render overview;
5. switch task;
6. open flow;
7. inspect node;
8. open evidence;
9. open events;
10. simulate artifact update;
11. verify UI refreshes;
12. close/reopen project.

## 43.4 Security tests

Required test cases:

- path traversal rejection;
- symlink escape rejection;
- arbitrary IPC channel unavailable;
- renderer cannot use Node;
- arbitrary command cannot be executed;
- malformed oversized JSON rejected;
- malformed ledger line handled safely;
- hostile strings rendered as text;
- navigation to untrusted URL blocked.

---

# 44. CI

The current GitHub Actions CI runs the shared verification contract and native
Electron checks on Ubuntu, macOS and Windows:

```text
install
  ↓
typecheck
  ↓
lint
  ↓
unit tests
  ↓
integration tests
  ↓
build renderer
  ↓
build Electron
  ↓
E2E smoke
```

Run on:

- Ubuntu;
- macOS;
- Windows where practical.

The release workflow additionally stages native unsigned assets for all three
platforms, verifies the release matrix and assembles checksummed, SBOM-backed
release evidence before the tag-only publish job.

---

# 45. Release Artifacts

Target packaging:

```text
macOS
  .dmg
  .zip

Windows
  .exe / NSIS

Linux
  AppImage
```

The current platform artifacts are unsigned previews. Code signing and
notarization are future distribution work and are not implied by local, CI or
packaged verification. See [`docs/RELEASE_MODEL.md`](docs/RELEASE_MODEL.md)
for the public release contract.

---

# 46. README Requirements

The current repository README includes:

1. a screenshot gallery sourced from the generated ForgeShop fixture;
2. the read-only engineering-auditor value proposition;
3. audit model, canonical/derived provenance and trust-model summary;
4. supported ForgeLoop protocol version;
5. installation instructions;
6. local development commands;
7. security model;
8. read-only guarantee for current release;
9. architecture summary;
10. roadmap;
11. contribution instructions; and
12. report formats, history policy and ForgeLoop repository link.

The following product copy is canonical:

> **ForgeLoopAudit is a read-only engineering auditor for ForgeLoop projects.**

Secondary copy:

> ForgeLoopAudit consumes ForgeLoop's canonical audit and Integration API state, correlates evidence, ownership, recovery, policy, trust, structural quality and execution signals, and turns them into traceable findings, comparisons and exportable reports without becoming protocol authority.

---

# 47. Branding Direction

Product name:

```text
ForgeLoopAudit
```

Short name:

```text
ForgeLoopAudit
```

Brand hierarchy:

```text
ForgeLoop
Engineering Protocol

ForgeLoopAudit
Read-only Engineering Auditor
```

The ForgeLoopAudit should feel like a companion product, not a fork or replacement.

Suggested visual symbol:

- circular loop;
- one broken/open segment suggesting progression;
- small directional indicator;
- geometric, not illustrative;
- works at 16×16 and 512×512.

---

# 48. UI Quality Bar

Before calling the UI finished, verify all of the following:

- alignment is consistent;
- spacing follows a scale;
- typography hierarchy is restrained;
- no component appears visually generic or unfinished;
- loading states are polished;
- empty states are intentional;
- errors are readable;
- no raw JSON is forced on ordinary users;
- semantic states use consistent visual language;
- current phase is immediately obvious;
- blockers are impossible to miss;
- the interface remains calm when everything is healthy;
- hover/focus/selected states are distinct;
- resizing works from laptop to large desktop monitors;
- no horizontal overflow in normal pages;
- keyboard navigation is complete;
- reduced motion works.

---

# 49. Implementation history and maintenance order

The phased sequence below is retained as implementation history and a
maintenance orientation map. The current source, tests and `verify:full`
contract are authoritative; this section is not an unchecked future backlog.

## Phase A — Foundation

1. initialize Electron + Vite + React + TypeScript;
2. secure BrowserWindow;
3. implement preload bridge;
4. implement folder picker;
5. implement selected-project boundary;
6. implement basic dark design system;
7. create app shell.

## Phase B — ForgeLoop core adapter

1. protocol detector;
2. `protocol-info` bridge via the ForgeLoop Integration API;
3. task index;
4. artifact registry;
5. JSON validation;
6. work-state adapter;
7. contract adapter;
8. routing adapter;
9. gates adapter;
10. continuity adapter;
11. evidence adapter;
12. policy adapter;
13. event ledger reader.

## Phase C — Core UI

1. project picker;
2. overview;
3. task list;
4. task inspector;
5. project health;
6. next safe action;
7. contract inspector;
8. routing view.

## Phase D — Signature visualization

1. lifecycle graph;
2. phase states;
3. failure loop;
4. verification cycles;
5. node inspector;
6. responsive graph behavior.

## Phase E — Evidence and history

1. evidence matrix;
2. checks;
3. event ledger;
4. event filters;
5. continuity view;
6. policy view.

## Phase F — Live mode

1. Chokidar watcher;
2. coalescer;
3. selective reload;
4. snapshot diffing;
5. renderer subscription;
6. reconnect/recovery behavior.

## Phase G — Hardening

1. security tests;
2. large ledger tests;
3. malformed artifact tests;
4. cross-platform tests;
5. accessibility review;
6. performance profiling;
7. packaging.

---

# 50. Definition of Done — MVP

The MVP is complete only when all criteria below are satisfied.

## Project loading

- user can select a local project folder;
- non-ForgeLoop projects are rejected cleanly;
- protocol compatibility is checked;
- recent project reopen works.

## Protocol visualization

- all active tasks are visible;
- current phase is accurate;
- lifecycle graph reflects ForgeLoop state;
- selected guides are visible;
- contract is inspectable;
- gates are visible;
- checks are visible;
- blockers and failures are visible;
- evidence coverage is visible;
- event history is visible;
- continuity is visible;
- policy state is visible;
- next safe action is visible;
- project health is visible.

## Live mode

- changes to ForgeLoop state appear automatically;
- no manual refresh is required;
- temporary write states do not crash the app;
- switching tasks remains responsive.

## Security

- renderer has no Node access;
- project path boundary is enforced;
- symlink escape is blocked;
- arbitrary command execution is impossible;
- CLI bridge is read-only and allowlisted;
- malformed artifacts cannot crash the app.

## Design

- dark theme is production quality;
- keyboard navigation works;
- focus states are visible;
- reduced motion works;
- important information is not color-only;
- UI remains visually coherent on macOS, Windows and Linux.

## Quality

- tests pass;
- build passes;
- lint passes;
- typecheck passes;
- packaged application launches;
- at least one realistic ForgeLoop fixture validates the full end-to-end experience.

---

# 51. Non-Goals

ForgeLoopAudit v1 is not:

- an AI coding agent;
- an LLM runtime;
- an autonomous orchestrator;
- a graph execution engine;
- a replacement for ForgeLoop;
- a terminal emulator;
- a generic project file browser;
- a CI platform;
- a cloud project management service.

Its role is deliberately focused:

> visualize and explain the real state of a ForgeLoop engineering process.

## Documentation governance

`README.md`, this specification and the documents indexed by
[`docs/README.md`](docs/README.md) describe the current implementation and
must trace machine facts to code, schemas, provenance, package scripts or
workflows. Dated records under `docs/verification/` and
`docs/superpowers/` preserve the repository state from the time they were
written. They are historical records, not current product requirements, and
must not be rewritten to adopt later versions, commits or test results.

---

# 52. Final Architecture Decision

Use:

```text
Electron
Node.js 20+
TypeScript
React
Vite
Tailwind CSS
React Flow
Chokidar
Ajv
Vitest
Playwright
```

Keep ForgeLoopAudit in a separate repository from ForgeLoop core.

Keep v1 read-only.

Treat ForgeLoop's Integration API and canonical project state as the semantic
source of truth. Bounded `.forgeloop/` artifacts and the isolated read-only CLI
adapter for older compatibility paths provide detail or degraded observation;
they never replace the Integration API's authority in `INTEGRATION_V1`.

Use a protocol-adapter boundary so future ForgeLoop protocol versions can be supported without rewriting the application.

Make the lifecycle flow, evidence coverage, event ledger, next safe action and cross-harness continuity the visual identity of the product.

The design target is a dark, minimal, premium developer tool that makes ForgeLoop understandable at a glance while preserving the protocol's deterministic and evidence-backed nature.
