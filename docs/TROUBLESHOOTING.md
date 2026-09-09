# Troubleshooting

## The browser does not open

Run the server explicitly and copy the printed bootstrap URL into a browser:

```bash
npm run build:web
FORGELOOP_AUDIT_NO_OPEN=1 node dist/server/cli.mjs --demo --no-open
```

The server binds to `127.0.0.1`. Check the terminal for the origin, bootstrap
URL and application-data root. A browser request to a different host or origin
is intentionally rejected.

## Bootstrap or session failure

Use the complete URL printed by the same server process. The token is exchanged
for an HttpOnly/SameSite=Strict session cookie; do not copy it into local
storage or change the host from the printed loopback origin. Restart the server
to obtain a fresh token. Playwright tests may set
`FORGELOOP_AUDIT_TEST_REUSABLE_BOOTSTRAP=1`; do not use that setting for a user
run.

## Blank page or missing assets

Build both renderer and server bundles and verify that `dist/renderer/index.html`
and `dist/server/cli.mjs` exist:

```bash
npm run build:web
npm run build
```

Inspect the browser console and the server terminal. The product no longer uses
Electron preload errors, native window chrome or a localhost development
renderer in its production path.

## Open a different project

The browser cannot select an arbitrary local directory. Start the local host
with an explicit CLI path:

```bash
node dist/server/cli.mjs --project /absolute/path/to/project
```

The web UI may reopen only a server-owned recent-project record. This boundary
prevents browser code from becoming a general filesystem picker or uploader.

## Invalid ForgeLoop artifact

Record the artifact name and schema validation error. Invalid or unverified data
must remain visibly distinct from a valid protocol state. Verify the trusted
lineage and schemas:

```bash
npm run verify:forgeloop-lineage
npm run protocol:schemas:verify
```

## Diagnostics show a compatibility mode

Settings and Diagnostics report the negotiated mode verbatim:
`INTEGRATION_V1`, `ARTIFACT_ONLY` or `INCOMPATIBLE`. Missing optional resources
remain `UNAVAILABLE`; a `COMMIT_UNKNOWN` or unknown value is not inferred away.
The bundled Integration API is the canonical semantic channel.

## Ownership or workspace binding is unavailable

Canonical ownership comes from the ForgeLoop Integration API resource
`task/ownership`. Workspace binding is a separate optional projection. A
missing, malformed or unavailable resource stays unavailable; ForgeLoopAudit
does not infer authority from raw artifacts or phase names.

## Repository Index/Search is unavailable

Open Repository Search and inspect Index health and diagnostics. The capability
is optional and may report `UNAVAILABLE`, `ENGINE_MISSING`, `ENGINE_INVALID`,
`SERVER_DOWN` or `SERVER_UNHEALTHY`. Search output is discovery-only and never
becomes canonical evidence.

## Report export failed

Reports are written below application data, outside the audited `.forgeloop`
directory. Check disk permissions and the resolved application-data root. The
browser cannot provide an arbitrary destination path. Set
`FORGELOOP_AUDIT_DATA_DIR` to an owned temporary directory when isolating a
local run.

## Web smoke or screenshot failure

Install the Playwright browser once and rerun the built contract:

```bash
npx playwright install chromium
npm run test:web-smoke
npm run screenshots:readme
npm run screenshots:check
```

The screenshot capture uses the same web server and browser session as the
smoke suite. A local green run still does not prove Windows/Ubuntu CI,
publication, deployment or signed distribution.
