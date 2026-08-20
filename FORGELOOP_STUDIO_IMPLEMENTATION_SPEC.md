# ForgeLoop Studio — Complete Implementation Specification

**Repository:** `cassiomc1/ForgeLoopStudio`  
**Product:** ForgeLoop Studio  
**Status:** Implementation specification  
**Primary stack:** Electron + Node.js + React + TypeScript  
**Target ForgeLoop protocol:** v1  
**Default product mode:** Local, read-only observer  

---

## 1. Product Vision

ForgeLoop Studio is a desktop application that turns the state of a ForgeLoop-enabled project into a live visual engineering dashboard.

The application must let a user:

1. open ForgeLoop Studio;
2. choose a local project folder;
3. verify that the selected folder contains a valid ForgeLoop installation;
4. discover all ForgeLoop tasks in that project;
5. visualize the complete lifecycle of every task;
6. inspect the current phase, previous phases, pending phases, blockers, failures, checks, gates, evidence, routing, policy and continuity;
7. observe lifecycle changes in real time without refreshing the application;
8. understand the next safe ForgeLoop action;
9. inspect the append-only event ledger as a chronological engineering timeline;
10. switch between multiple active tasks without losing context.

ForgeLoop Studio must never become a second source of truth.

The canonical source of truth remains the ForgeLoop protocol state stored inside the target project.

ForgeLoop Studio is an observer and visualization layer.

```text
ForgeLoop Protocol
       │
       │ canonical state
       ▼
  .forgeloop/
       │
       │ read-only observation
       ▼
ForgeLoop Studio
```

---

## 2. Product Principles

### 2.1 Protocol-first

The UI must represent actual ForgeLoop protocol concepts and artifacts. It must not invent hidden lifecycle states, undocumented completion rules, synthetic evidence, or alternative transitions.

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

The application must not execute mutating lifecycle commands in the MVP.

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
│                       ForgeLoop Studio                        │
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
│  ForgeLoop Studio      project-name         protocol v1     ● Live │
├──────────────┬───────────────────────────────────────────────────────┤
│              │                                                       │
│ Overview     │                                                       │
│ Tasks        │                     CONTENT                           │
│ Flow         │                                                       │
│ Contract     │                                                       │
│ Evidence     │                                                       │
│ Events       │                                                       │
│ Continuity   │                                                       │
│ Policy       │                                                       │
│              │                                                       │
│ Settings     │                                                       │
├──────────────┴───────────────────────────────────────────────────────┤
│  project path                                         connection    │
└──────────────────────────────────────────────────────────────────────┘
```

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
                    ForgeLoop Studio

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

This is the signature ForgeLoop Studio screen.

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

ForgeLoop Studio must visually communicate that ForgeLoop is a loop, not only a linear pipeline.

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
Command: npm run test:integration
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

# 24. Sessions View

Display ForgeLoop activation sessions.

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

The Studio should expose ForgeLoop completion/health semantics with strong visual clarity.

Known terminal/health values may include:

```text
VALID
INCOMPLETE
STALE
INCONSISTENT
INVALID
```

Respect ForgeLoop precedence.

Do not invent a Studio-specific status that conflicts with ForgeLoop status.

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

ForgeLoop Studio must work well when many tasks exist concurrently.

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

ForgeLoop Studio should update automatically when protocol artifacts change.

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
interface ForgeLoopStudioAPI {
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
ForgeLoopStudio/
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
├── FORGELOOP_STUDIO_IMPLEMENTATION_SPEC.md
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
interface StudioError {
  code: StudioErrorCode;
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
This project uses a ForgeLoop protocol version that this Studio version does not understand.
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

Maintain an index when useful, but do not mutate the target `.forgeloop` directory for Studio-owned caches.

Studio caches belong in the application's own user data directory.

---

# 36. ForgeLoop Compatibility Strategy

## 36.1 Handshake

On every project open:

```bash
forgeloop protocol-info --path <project> --json
```

Use the result to determine compatibility.

## 36.2 Supported protocol registry

Create an explicit compatibility registry:

```ts
const supportedProtocols = {
  1: protocolV1Adapter,
};
```

Do not scatter protocol-version conditionals through UI components.

## 36.3 Adapter boundary

```text
ForgeLoop filesystem/CLI
          │
          ▼
ProtocolV1Adapter
          │
          ▼
Studio domain model
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
```

Do not expose arbitrary project file browsing in v1.

---

# 38. Settings

Keep settings minimal.

Recommended v1 settings:

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

Dark theme should be the default and flagship appearance.

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

# 40. MVP Scope

The first public release should include only the features needed to prove the product.

## Required

- Electron shell;
- secure preload bridge;
- folder picker;
- ForgeLoop project detection;
- protocol compatibility check;
- recent projects;
- task list;
- selected task state;
- live lifecycle flow;
- current phase;
- blockers;
- failures;
- selected guides;
- gates;
- checks;
- evidence matrix;
- event timeline;
- continuity view;
- policy health;
- project health;
- `forgeloop next` visualization;
- live file watcher;
- raw artifact inspector;
- polished dark UI;
- keyboard navigation;
- automated tests.

## Not required in MVP

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

Recommended GitHub Actions pipeline:

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

Release packaging can initially target macOS + Windows first if desired.

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

Code signing and notarization should be handled before claiming production-ready desktop distribution.

---

# 46. README Requirements

The repository README should eventually include:

1. hero image;
2. one-line value proposition;
3. animated screenshot/GIF;
4. feature summary;
5. supported ForgeLoop protocol version;
6. installation instructions;
7. local development commands;
8. security model;
9. read-only guarantee for current release;
10. architecture summary;
11. roadmap;
12. contribution instructions;
13. ForgeLoop repository link.

Recommended tagline:

> **A real-time visual interface for the ForgeLoop engineering protocol.**

Secondary copy:

> Open a ForgeLoop-enabled project and watch contracts, routing, lifecycle phases, evidence, checks, recovery, continuity and completion evolve in real time.

---

# 47. Branding Direction

Product name:

```text
ForgeLoop Studio
```

Short name:

```text
Studio
```

Brand hierarchy:

```text
ForgeLoop
Engineering Protocol

ForgeLoop Studio
Visual Interface
```

The Studio should feel like a companion product, not a fork or replacement.

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

# 49. Implementation Order

Recommended implementation sequence:

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
2. `protocol-info` bridge;
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

ForgeLoop Studio v1 is not:

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

Keep ForgeLoop Studio in a separate repository from ForgeLoop core.

Keep v1 read-only.

Treat `.forgeloop/` plus read-only ForgeLoop CLI responses as the source of truth.

Use a protocol-adapter boundary so future ForgeLoop protocol versions can be supported without rewriting the application.

Make the lifecycle flow, evidence coverage, event ledger, next safe action and cross-harness continuity the visual identity of the product.

The design target is a dark, minimal, premium developer tool that makes ForgeLoop understandable at a glance while preserving the protocol's deterministic and evidence-backed nature.
