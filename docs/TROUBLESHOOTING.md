# Troubleshooting

## macOS application does not open

Inspect the downloaded artifact before changing quarantine attributes:

```bash
spctl --assess --type execute --verbose=4 "/Applications/ForgeLoop Studio.app"
codesign --verify --deep --strict --verbose=4 "/Applications/ForgeLoop Studio.app"
xcrun stapler validate "/Applications/ForgeLoop Studio.app"
"/Applications/ForgeLoop Studio.app/Contents/MacOS/ForgeLoop Studio"
```

Unsigned RC2 preview builds may be rejected by Gatekeeper. This is expected for the current release policy; signing and notarization are deferred to a future distribution milestone.

If macOS shows “Malware Blocked and Moved to Trash” for `Electron.app`, the local Electron runtime was quarantined or rejected before ForgeLoop Studio started. Reinstall the dependency from a trusted source and verify the signed/notarized release artifact; do not disable Gatekeeper as a project release strategy.

## ForgeLoop CLI not found

Check the binary available to the Finder-launched application and compare it with the terminal `PATH`. Studio uses `shell: false`, a bounded timeout and an explicit `--version` probe; it does not execute arbitrary commands.

## Blank window

Run a production build and inspect the renderer console for failed asset URLs, preload errors and main-process logs. Production assets are built with relative URLs so the packaged app does not depend on localhost.

## Invalid ForgeLoop artifact

Record the artifact name and schema validation error. Invalid or unverified data must remain visibly distinct from a valid protocol state.

## Ownership shows "OWNERSHIP UNAVAILABLE"

Canonical ownership comes exclusively from the bundled ForgeLoop 1.5 Integration API (`task/ownership`). When the Integration API is unavailable, Studio degrades to `ARTIFACT_ONLY` mode: raw artifacts stay readable for inspection but ownership facts are shown as unavailable instead of being guessed from `task.json` or the legacy CLI.

## Task badge says "RECOVERED — RESUME REQUIRED"

The task has a valid durable recovery (`claimState=RELEASED_BY_RECOVERY`, `mutationAllowed=false`). Mutations are blocked until an authorized harness performs the canonical ForgeLoop `task-resume`. Studio only displays this state and offers the command as copy-only text; it never executes it.

## Project fails to open with a compatibility error

Studio negotiates capabilities through the Integration API and fails closed on unknown protocol/schema versions or capability drift. Check the project's `.forgeloop/config.json` versions against [docs/PROTOCOL_COMPATIBILITY.md](PROTOCOL_COMPATIBILITY.md) and refresh trusted schemas only via `scripts/generate-schema-provenance.mjs`.

## Execution provenance list is empty or shows withheld entries

Executions load lazily per task from `.forgeloop/task-state/<key>/executions/exec-*.json`. Entries that fail the trusted `execution.schema.json`, exceed size limits, or use symlinks are withheld and counted — this is intentional fail-closed behavior, not data loss in Studio.
