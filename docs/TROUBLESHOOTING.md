# Troubleshooting

## macOS application does not open

Inspect the downloaded artifact before changing quarantine attributes:

```bash
spctl --assess --type execute --verbose=4 "/Applications/ForgeLoopAudit.app"
codesign --verify --deep --strict --verbose=4 "/Applications/ForgeLoopAudit.app"
xcrun stapler validate "/Applications/ForgeLoopAudit.app"
"/Applications/ForgeLoopAudit.app/Contents/MacOS/ForgeLoopAudit"
```

Unsigned preview builds may be rejected by Gatekeeper. This is expected for
the current release policy; signing and notarization are deferred to a future
distribution milestone.

If macOS shows “Malware Blocked and Moved to Trash” for `Electron.app`, the local Electron runtime was quarantined or rejected before ForgeLoopAudit started. Reinstall the dependency from a trusted source and verify the signed/notarized release artifact; do not disable Gatekeeper as a project release strategy.

## ForgeLoop CLI not found

Check the binary available to the Finder-launched application and compare it with the terminal `PATH`. ForgeLoopAudit uses `shell: false`, a bounded timeout and an explicit `--version` probe; it does not execute arbitrary commands.

## Blank window

Run a production build and inspect the renderer console for failed asset URLs, preload errors and main-process logs. Production assets are built with relative URLs so the packaged app does not depend on localhost.

## Invalid ForgeLoop artifact

Record the artifact name and schema validation error. Invalid or unverified data must remain visibly distinct from a valid protocol state.

## Diagnostics show a compatibility mode

Settings → Diagnostics reports the negotiated `ForgeLoopCompatibilityMode` verbatim (`INTEGRATION_V1`, `ARTIFACT_ONLY` or `INCOMPATIBLE`). There is no CLI-enhanced mode: the bundled Integration API is the only canonical channel.

## Ownership shows "OWNERSHIP UNAVAILABLE"

Canonical ownership comes exclusively from the bundled ForgeLoop 1.10.0
Integration API (`task/ownership`). When the Integration API is unavailable,
ForgeLoopAudit degrades to `ARTIFACT_ONLY` mode: raw artifacts stay readable for
inspection but ownership facts are shown as unavailable instead of being
guessed from `task.json` or the legacy CLI.

## Diagnostics or Actions says "unavailable"

The Diagnostics and Actions panels are gated by the capabilities advertised by the bundled Integration API. An unavailable panel means its canonical resource or read-only command was not negotiated; ForgeLoopAudit does not reconstruct the missing projection from local artifacts. Update the bundled ForgeLoop pin only through the trusted provenance workflow, then rerun schema and compatibility verification.

## An action is marked `COMMIT_UNKNOWN`

`COMMIT_UNKNOWN` is an intentionally unresolved durable-action state. ForgeLoopAudit surfaces the action, its provenance and any linked approval, but never retries, reconciles or authorizes it. Resolution must be performed by an authorized ForgeLoop harness through the canonical action workflow.

## Capability policy is shown but does not authorize anything

The project capability policy is context for ForgeLoop decisions. Displaying `ALLOW`, `DENY`, `REQUIRE_APPROVAL` or `REQUIRE_AUTHORITY` in ForgeLoopAudit does not grant host authority, approve an action or enable a mutable command.

## Usage metrics are unavailable

ForgeLoop reports usage as `null`/`UNKNOWN` when the runtime cannot attest tokens or cost. ForgeLoopAudit preserves that honest state; it does not estimate usage from event counts or wall-clock time.

## Execution profile or efficiency context is unavailable

The Overview panel reads the canonical task/context resource only when the
Integration API advertises adaptiveExecutionProfiles, executionProfileContext,
and task/context. It displays requested, floor, resolved, escalated, the
bounded context policy and policy invariants as read-only data. A host that
lacks the additive capability receives an explicit balanced compatibility
projection; an advertised but unavailable or malformed projection remains
unavailable.

Efficiency telemetry is provider-, host- or actor-reported only. Missing usage,
context-item counts, wall-clock values or compatible comparisons are shown as
NOT MEASURED, never as zero. Context inflation and regression checks are
diagnostic observations and do not alter ForgeLoop lifecycle truth.

## Task badge says "RECOVERED — RESUME REQUIRED"

The task has a valid durable recovery (`claimState=RELEASED_BY_RECOVERY`, `mutationAllowed=false`). Mutations are blocked until an authorized harness performs the canonical ForgeLoop `task-resume`. ForgeLoopAudit only displays this state and offers the command as copy-only text; it never executes it.

## Project fails to open with a compatibility error

ForgeLoopAudit negotiates capabilities through the Integration API and fails closed on unknown protocol/schema versions or capability drift. Check the project's `.forgeloop/config.json` versions against [docs/PROTOCOL_COMPATIBILITY.md](PROTOCOL_COMPATIBILITY.md) and refresh trusted schemas only via `scripts/generate-schema-provenance.mjs`.

## Execution provenance list is empty or shows withheld entries

Executions load lazily per task from `.forgeloop/task-state/<key>/executions/exec-*.json`. Entries that fail the trusted `execution.schema.json`, exceed size limits, or use symlinks are withheld and counted — this is intentional fail-closed behavior, not data loss in ForgeLoopAudit.

## Task Boundaries shows an unavailable optional feature

The Task Boundaries surface reads ForgeLoop 1.10.0 resources independently. A missing or incomplete workspace binding, canonical handoff, responsibility, verification-scope, attestation, execution-profile context, or Structural Quality resource advertisement keeps only the affected view unavailable while the project remains in `INTEGRATION_V1`. A valid workspace or handoff can still be displayed when responsibility is invalid or attestation is disabled.

## Workspace binding mismatch or unavailable

`UNBOUND` means no binding was recorded; it is not a failure. `MATCH` means the current workspace matches the canonical binding. `MISMATCH` means it differs. `INVALID` means the persisted binding is invalid. `UNAVAILABLE` means ForgeLoop could not establish the current workspace identity. ForgeLoopAudit displays these statuses but never runs `workspace-bind` or edits the binding artifact.

## Canonical handoff is missing or invalid

ForgeLoopAudit reads only the fixed `handoffs/handoff-*.json` collection through the ForgeLoop Integration API or its bounded raw-detail reader. Errors such as `E_HANDOFF_INVALID`, `E_HANDOFF_TAMPERED` and `E_HANDOFF_NOT_FOUND` remain attached to the selected task. Handoffs are immutable snapshots and are not review evidence, completion evidence, authority or delegation. Do not edit them manually.

## Handoff acceptance is shown as an operational receipt

ForgeLoopAudit reads the canonical `handoff.acceptance` projection. `ACCEPTED` is
shown as **Accepted — operational receipt only** with no claims, evidence or
authority transferred. `OPEN`, `UNBOUND` and `INCONSISTENT` remain explicit;
ForgeLoopAudit has no Accept button and never calls `handoff-accept`.

## Advisory context providers are not loaded

The Settings capability row is informational. When ForgeLoop advertises the
complete `advisoryContextProviders v1` trust contract, ForgeLoopAudit shows that the
host provides the capability and that ForgeLoopAudit did not load it. ForgeLoopAudit does not
call recall, count memory, display retrieved results or persist provider
output. Incomplete or absent trust metadata is shown as **Not advertised**.

## Continuity reconciliation shows WARN

Continuity reconciliation is an operational read-only diagnostic. `WARN` means
that ForgeLoop reported findings requiring attention; it does not fail a task,
create evidence, authorize mutation or convert the finding into lifecycle
state. ForgeLoopAudit cannot rewrite, clear or mark a finding fixed.

## Responsibility is invalid

`NOT_APPLICABLE`, `VALID` and `INVALID` are canonical responsibility statuses. For `INVALID`, ForgeLoopAudit preserves upstream details such as `E_RESPONSIBILITY_INVALID`, `E_RESPONSIBILITY_SCOPE_VIOLATION`, `E_RESPONSIBILITY_FROZEN_INPUT_DRIFT` or `E_RESPONSIBILITY_REQUIRED_CHECK_MISSING`. ForgeLoopAudit never runs `responsibility-set`; correction belongs to the authorized ForgeLoop harness.

## Verification scope is absent, stale or unresolved

ForgeLoopAudit displays the persisted canonical scope only. Requested modes are `AUTO`, `CHANGED`, `CLAIMED` and `FULL`; resolved modes are `CHANGED`, `CLAIMED`, `FULL` and `UNRESOLVED`; `IMPACTED` is not a supported ForgeLoopAudit mode. Errors such as `E_VERIFICATION_SCOPE_INVALID`, `E_VERIFICATION_SCOPE_STALE` and `E_VERIFICATION_SCOPE_UNRESOLVED` are shown as canonical errors. Scope describes planned/resolved verification inputs and is not attestation coverage. ForgeLoopAudit never runs `verify-scope` or computes a replacement.

## Code attestation is disabled, missing or invalid

Attestation status is loaded lazily for the selected task. `DISABLED`, `MISSING`, `VALID` and `INVALID` are status values; `PROCESSED`, `VERIFIED` and `ATTESTED` are separate trust levels and are never inferred. Revision-provider errors such as `E_REVISION_PROVIDER_*` and `E_REVISION_CONTENT_UNAVAILABLE`, along with `E_ATTESTATION_*`, remain visible. A `statement.sigstore.json` bundle is external data: its presence alone does not prove a valid signature or produce `ATTESTED`. ForgeLoopAudit never creates or signs attestations. It may request ForgeLoop's canonical local content verification when no external signing-provider execution is required; external signing-provider verification is never triggered automatically. Run the canonical ForgeLoop verification command explicitly when external verification is required.

## Boundary status changed after a file update

The watcher coalesces code-manifest, statement and optional signature-bundle writes into one selected-task attestation update. Workspace binding, handoff, responsibility and verification-scope updates are targeted independently. A temporary write or schema error should remain visible as an unavailable/invalid feature state; do not manually edit protocol artifacts to make the panel green.
