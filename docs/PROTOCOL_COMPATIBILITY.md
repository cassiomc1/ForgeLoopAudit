# ForgeLoop Protocol Compatibility

ForgeLoop Studio supports protocol version 1 and schema version 1 from the pinned ForgeLoop source revision recorded in `schemas/provenance.json` (ForgeLoop **1.6.0**, commit `1eb8088716e279faa746b11e3077de1fef570b69`). The runtime artifact registry and `SUPPORTED_PROTOCOL.requiredSchemas` are contract-tested to remain identical.

## Compatibility matrix

| Project / Build | Integration API | Result |
|---|---|---|
| Pinned ForgeLoop build (`1.6.0 @ 1eb8088...`) | Integration API v1 valid (`INTEGRATION_V1`) | Full tested Studio capability set: canonical task discovery, ownership, recovery, observability, durable actions, approvals, capability policy and trajectory projections |
| Other protocol-v1 / Integration API v1 build | Required core capabilities present; optional capability absent | Core support is negotiated from required capabilities; optional panels (Diagnostics, Actions, Approvals, Policy, Trajectory) are enabled only when their individual capability contracts are advertised; affected feature unavailable |
| Any protocol-v1 build | Missing CORE required resources or capability drift | Rejected with `INCOMPATIBLE` (fails closed; missing core resources, unsupported recovery contract, or broken executor parity) |
| Protocol-v1 project | Integration API unavailable | Degraded mode (`ARTIFACT_ONLY`): visual reading + schema validation; canonical ownership and optional canonical projections are unavailable |
| ForgeLoop 1.3 / legacy protocol 1 | Integration API not applicable | `ARTIFACT_ONLY`: visual reading + schema validation; canonical ownership is never inferred from raw artifacts or the legacy CLI |
| Unknown protocol version | any | Rejected with an explicit incompatibility error (`INCOMPATIBLE`) |
| Incompatible schema version | any | Rejected with an explicit incompatibility error (`INCOMPATIBLE`) |
| Invalid ownership (e.g. `claimState=INCONSISTENT`) | API v1 | Project opens read-only with a prominent ownership inconsistency state |

### Capability degradation vs incompatibility

Studio explicitly distinguishes core compatibility from additive optional features:

- **Missing CORE required resources or contract drift &rarr; `INCOMPATIBLE`**: Core resources (`protocol/info`, `project/tasks`, `task/status`, `task/ownership`, `task/contract`, `task/continuity`), Integration API version mismatch, broken executor parity, or incomplete `taskClaimRecovery` fail closed to `INCOMPATIBLE`.
- **Missing OPTIONAL resources or feature contracts &rarr; Affected feature unavailable**: Optional resources (`task/actions`, `task/action`, `task/approvals`, `task/metrics`, `task/evaluations`, `project/capability-policy`) or observability command restrictions degrade individual panels/views gracefully without compromising core protocol compatibility.

## Authority boundary

Semantic facts come exclusively from the bundled `@cassiomc1/forgeloop/integration` subpath:

- `protocol/info` — protocol/schema compatibility (`compatibility.schemaVersion`; there is no top-level `schemaVersion`);
- `project/tasks` — canonical task discovery; in `INTEGRATION_V1` it drives semantic task existence: filesystem namespaces only locate artifacts and produce diagnostics (extra namespaces are never promoted into tasks, corrupt namespaces never become synthetic `RECEIVED` tasks, and an unavailable discovery fails closed instead of falling back to the filesystem);
- `task/status`, `task/ownership`, `task/contract`, `task/continuity` — canonical per-task facts.
- `history`, `trace`, `reflect`, `inspect` — canonical read-only observability projections; Studio does not recompute their semantics.
- `task/actions`, `task/action`, `task/approvals`, `task/metrics`, `task/evaluations`, `project/capability-policy` — canonical read-only action, approval, policy and trajectory projections.

Policy status and the canonical `next` action also run through this boundary; in `INTEGRATION_V1` the external ForgeLoop CLI is never spawned for policy, status or next. Mutating commands such as action authorization, approval resolution, reconciliation, execution and recovery remain unavailable to the Studio UI.

The Studio never reimplements ForgeLoop rules (claim release, recovery validation, locks, CAS, transactions, migration). Direct `.forgeloop/` artifact reading remains available for detail views, previews, validation and diagnostics only; it never determines current owner, effective claims, `mutationAllowed`, or recovery validity.

Capability negotiation selects one of three compatibility modes: `INTEGRATION_V1`, `ARTIFACT_ONLY`, or `INCOMPATIBLE`. Any capability drift (Integration API version, executor parity, `taskClaimRecovery` feature flags, missing resources) fails closed to `INCOMPATIBLE`. There is no selectable legacy mode: ForgeLoop 1.3 projects carry no explicit legacy marker in their artifacts, so the Studio never infers one — it degrades to `ARTIFACT_ONLY` instead of pretending to provide canonical semantics.

## Trusted schemas

Refresh the trusted schema set only from a controlled ForgeLoop checkout:

```bash
node scripts/generate-schema-provenance.mjs \
  --source ../ForgeLoop \
  --commit 1eb8088716e279faa746b11e3077de1fef570b69 \
  --package-version 1.6.0
npm run protocol:schemas:verify
```

The trusted set includes `task-recovery.schema.json`, `execution.schema.json`, `action.schema.json`, `approval.schema.json`, `capability-policy.schema.json` and `trajectory-evaluation.schema.json`. Project-controlled `.forgeloop/schemas` content is never a Studio trust authority. Signed distribution is not required for the current unsigned RC preview policy; checksums, provenance, and public post-publish verification are required instead.
