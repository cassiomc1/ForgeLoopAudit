# ForgeLoop Protocol Compatibility

ForgeLoop Studio supports protocol version 1 and schema version 1 from the pinned ForgeLoop source revision recorded in `schemas/provenance.json` (ForgeLoop **1.5.0**, commit `6a6843041ccbdf85794c01f4adfb3a2e07fa74ff`). The runtime artifact registry and `SUPPORTED_PROTOCOL.requiredSchemas` are contract-tested to remain identical.

## Compatibility matrix

| Project | Integration API | Result |
|---|---|---|
| ForgeLoop 1.5 / protocol 1 | Integration API v1 valid (`INTEGRATION_V1`) | Full read-only support: canonical task discovery, canonical ownership, recovery semantics |
| ForgeLoop 1.5 / protocol 1 | Integration unavailable | Degraded mode (`ARTIFACT_ONLY`): visual reading + schema validation; canonical ownership is unavailable and shown as `OWNERSHIP UNAVAILABLE` |
| ForgeLoop 1.3 / protocol 1 | Legacy CLI supported | Legacy read-only mode; ownership is never inferred from raw artifacts or the legacy CLI |
| Unknown protocol | any | Rejected with an explicit incompatibility error |
| Incompatible schema | any | Rejected with an explicit incompatibility error |
| Invalid ownership (e.g. `claimState=INCONSISTENT`) | API v1 | Project opens read-only with a prominent ownership inconsistency state |

## Authority boundary

Semantic facts come exclusively from the bundled `@cassiomc1/forgeloop/integration` subpath:

- `protocol/info` — protocol/schema compatibility (`compatibility.schemaVersion`; there is no top-level `schemaVersion`);
- `project/tasks` — canonical task discovery;
- `task/status`, `task/ownership`, `task/contract`, `task/continuity` — canonical per-task facts.

The Studio never reimplements ForgeLoop rules (claim release, recovery validation, locks, CAS, transactions, migration). Direct `.forgeloop/` artifact reading remains available for detail views, previews, validation and diagnostics only; it never determines current owner, effective claims, `mutationAllowed`, or recovery validity.

Capability negotiation selects one of four compatibility modes: `INTEGRATION_V1`, `LEGACY_CLI_READ_ONLY`, `ARTIFACT_ONLY`, or `INCOMPATIBLE`. Any capability drift (Integration API version, executor parity, `taskClaimRecovery` feature flags, missing resources) fails closed to `INCOMPATIBLE`.

## Trusted schemas

Refresh the trusted schema set only from a controlled ForgeLoop checkout:

```bash
node scripts/generate-schema-provenance.mjs \
  --source ../ForgeLoop \
  --commit 6a6843041ccbdf85794c01f4adfb3a2e07fa74ff \
  --package-version 1.5.0
npm run protocol:schemas:verify
```

The trusted set includes `task-recovery.schema.json` and `execution.schema.json` for durable recovery and execution provenance artifacts. Project-controlled `.forgeloop/schemas` content is never a Studio trust authority. Signed distribution is not required for the current unsigned RC preview policy; checksums, provenance, and public post-publish verification are required instead.
