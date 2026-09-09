# ForgeLoopAudit — Current implementation and design reference

This document describes the shipped web implementation. It is the current
implementation and design reference for ForgeLoopAudit `0.3.0-rc.1`, aligned to
ForgeLoop `1.11.1` at immutable commit
`674f12c006b3ace12278f109b7ae24f57012d09c` with protocol v1, schema v1 and
Integration API v1.

## Product boundary

ForgeLoopAudit is a local-first, read-only observer. ForgeLoop remains the
canonical protocol authority. The auditor may read canonical Integration API
resources and bounded `.forgeloop/` artifacts, derive clearly labelled findings,
store audit snapshots outside the project and export reports. It does not write
protocol state, create or accept handoffs, bind workspaces, set responsibility,
resolve verification scope, create or sign attestations, execute mutable
commands, or treat a local observation as canonical evidence.

The UI preserves three authority labels:

| Label | Meaning |
|---|---|
| Canonical ForgeLoop | A protocol fact or decision returned by the bundled Integration API |
| ForgeLoopAudit derived | A deterministic interpretation with visible evidence and a stable rule/fingerprint |
| Application observation | A local runtime condition, availability result or diagnostic; never protocol success |

`canonicalHandoffs v2` acceptance is displayed as an operational receipt only.
`advisoryContextProviders v1` is provider-neutral, lazy and non-authoritative;
ForgeLoopAudit does not load memory or invoke recall. Repository Index/Search is
discovery context only and never evidence or lifecycle authority.

## Runtime architecture

```text
CLI: node dist/server/cli.mjs
        │ loopback HTTP + one-time bootstrap token
        ▼
Local web server
  ├─ session/origin/host checks, CSP and static-file containment
  ├─ explicit /api/v1 routes with typed JSON envelopes
  ├─ managed report exports in application data
  └─ SSE project-update stream with sanitized paths
        │
        ▼
AuditRuntime
  ├─ project detection and PathBoundary
  ├─ trusted schema validation and bounded artifact readers
  ├─ ForgeLoop Integration API v1 adapter
  ├─ Chokidar watcher and snapshot refresh
  ├─ audit/history/report services
  └─ Repository Index/Search projection
        │
        ▼
React/Vite renderer
  ├─ typed HTTP client and EventSource subscription
  ├─ shadcn-style code-owned UI primitives
  └─ dark/light/system theme provider
```

There is no Electron host, preload bridge, renderer IPC channel or native folder
picker in the current product. The browser is an unprivileged same-origin
client. The local CLI/server owns the initial project path, recent-project
reopening and filesystem operations.

## Project lifecycle

`--demo` opens the generated ForgeShop fixture. `--project PATH` opens one
explicit project before the browser is shown. A browser session can reopen a
server-owned recent project or the demo; an arbitrary browser path is rejected.
The runtime closes the watcher before replacing a project and publishes
`project-opened`, `snapshot-refreshed`, `audit-invalidated`, `watcher-status` and
other typed updates over SSE.

Recent projects and audit history are stored below the application-data root,
never below the audited `.forgeloop/` directory. The root may be overridden for
isolated tests with `FORGELOOP_AUDIT_DATA_DIR`.

## HTTP and session contract

The server binds to `127.0.0.1` by default and rejects non-loopback hosts. The
bootstrap URL contains a random token and is exchanged once for an HttpOnly,
SameSite=Strict session cookie. API requests require that session and explicit
same-origin/loopback request headers. Responses use `{ ok, data }` on success and
`{ ok: false, error: { source, code, message, retryable } }` on failure. Internal
error details, stack traces and arbitrary filesystem paths are not returned to
the browser.

The route surface is explicit: project state/demo/recent/close, audit findings
and history, task projections, diagnostics, capability policy, Repository
Index/Search, report export and `/events`. There is no generic method dispatch,
file-read route or command-execution route.

## ForgeLoop integration and compatibility

The semantic boundary is the local
`@cassiomc1/forgeloop/integration` public subpath pinned in
[`schemas/provenance.json`](schemas/provenance.json). Required protocol/schema
resources fail closed. Optional resources degrade independently. The supported
modes are `INTEGRATION_V1`, `ARTIFACT_ONLY` and `INCOMPATIBLE`; no broken
integration is silently reclassified as a legacy mode.

ForgeLoopAudit reads canonical task status, ownership, contracts, continuity,
observability, durable action/approval projections, capability policy,
trajectory metrics/evaluations, workspace binding, canonical handoffs,
responsibility, verification scope, code attestation, execution-profile context
and Repository Index/Search only when their capability contracts are advertised.
The `advisoryContextProviders v1` contract is visible as host-provided/not
loaded metadata. The `canonicalHandoffs v2` contract is visible as immutable
operational context. Neither capability changes authority.

## UI implementation

The renderer is React 19 + Vite + TypeScript + Tailwind. It uses local,
code-owned shadcn-style primitives under
`src/renderer/components/ui/`: `Button`, `Card`, `Badge`, `Input`, `Separator`
and `ThemeToggle`. The implementation follows the composable, accessible
component style described by [shadcn/ui](https://ui.shadcn.com/) without making
the browser a privileged host.

Dark is the default theme. `ThemeProvider` supports `dark`, `light` and `system`,
persists only the visual preference in browser storage and updates the document
color scheme. Settings and the title bar expose the same provider. Focus rings,
semantic headings, visible state labels and reduced-motion handling remain
required; status is never communicated by color alone.

The primary navigation is Audit Summary, Findings, Tasks, Evidence, Quality,
Policy & Trust, Audit History, Reports, Repository Search, Diagnostics and
Settings. Repository Search is labelled **Discovery only**. Reports always use a
server-managed destination under application data; the browser cannot choose an
arbitrary host path.

## Reports and provenance

Audit history is deterministic and project-fingerprint scoped. JSON, Markdown
and SARIF exports include the audit fingerprint, ForgeLoop provenance, audit
rules version, timestamp, HEAD and `[C]`/`[D]`/`[A]` trust labels. The web route
generates a fresh collision-resistant filename under the application export
directory and validates it through the existing audit export path boundary.

## Verification contract

The normal development loop is:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:web-smoke
npm run screenshots:readme
npm run docs:check
```

The release contract is `npm run verify:full`. It verifies vendored lineage,
production dependency policy, schema provenance, demo integrity, current
documentation, typecheck/lint/unit/release-contract coverage, performance,
critical coverage, the production renderer/server build and npm package
contents. CI runs the same contract on Ubuntu, macOS and Windows and then runs
the Playwright Chromium web smoke suite.

The screenshot capture uses the same built loopback web server and Playwright
browser path as the smoke tests. The historical pre-migration record remains at
[`docs/migration/WEB_BASELINE.md`](docs/migration/WEB_BASELINE.md); the completed
web implementation evidence is summarized in
[`docs/migration/WEB_IMPLEMENTATION_REPORT.md`](docs/migration/WEB_IMPLEMENTATION_REPORT.md).
