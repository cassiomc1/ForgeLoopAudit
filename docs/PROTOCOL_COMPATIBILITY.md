# ForgeLoop Protocol Compatibility

ForgeLoop Studio supports protocol v1, schema v1 and Integration API v1 from
the pinned ForgeLoop source revision recorded in `schemas/provenance.json`
(ForgeLoop **1.8.0**, commit
`a4360ac9b24b19c74171fdbac3163b892d896484`). The runtime artifact registry
and `SUPPORTED_PROTOCOL.requiredSchemas` are contract-tested to remain
identical. See the [trusted schema boundary](../schemas/README.md) and
[vendored runtime lineage](../vendor/README.md) for their verification
procedures.

## Compatibility matrix

| Project / Build | Integration API | Result |
|---|---|---|
| Pinned ForgeLoop build (`1.8.0 @ a4360ac...`) | Integration API v1 valid (`INTEGRATION_V1`) | Full tested Studio capability set: canonical task discovery, ownership, recovery, observability, durable actions, approvals, capability policy, trajectory projections, verification-execution provenance, adaptive execution-profile context, efficiency observability and the five 1.6.4 boundary features |
| Other protocol-v1 / Integration API v1 build | Required core capabilities present; optional capability absent | Core support remains `INTEGRATION_V1`; optional panels and verification-execution provenance are enabled only when their individual capability contracts are advertised; the affected feature is unavailable |
| Any protocol-v1 build | Missing CORE required resources or capability drift | Rejected with `INCOMPATIBLE` (fails closed; missing core resources, unsupported recovery contract, or broken executor parity) |
| Protocol-v1 project | Integration API unavailable | Degraded mode (`ARTIFACT_ONLY`): visual reading + schema validation; canonical ownership and optional canonical projections are unavailable |
| ForgeLoop 1.3 / legacy protocol 1 | Integration API not applicable | `ARTIFACT_ONLY`: visual reading + schema validation; canonical ownership is never inferred from raw artifacts or the legacy CLI |
| Unknown protocol version | any | Rejected with an explicit incompatibility error (`INCOMPATIBLE`) |
| Incompatible schema version | any | Rejected with an explicit incompatibility error (`INCOMPATIBLE`) |
| Invalid ownership (e.g. `claimState=INCONSISTENT`) | API v1 | Project opens read-only with a prominent ownership inconsistency state |

### Capability degradation vs incompatibility

Studio explicitly distinguishes core compatibility from additive optional features:

- **Missing CORE required resources or contract drift &rarr; `INCOMPATIBLE`**: Core resources (`protocol/info`, `project/tasks`, `task/status`, `task/ownership`, `task/contract`, `task/continuity`), Integration API version mismatch, broken executor parity, or incomplete `taskClaimRecovery` fail closed to `INCOMPATIBLE`.
- **Missing OPTIONAL resources or feature contracts &rarr; Affected feature unavailable**: Optional resources (`task/actions`, `task/action`, `task/approvals`, `task/metrics`, `task/evaluations`, `project/capability-policy`, `task/workspace-binding`, `task/handoffs`, `task/responsibility`, `task/verification-scope`, `task/attestation`) or observability command restrictions degrade individual panels/views gracefully without compromising core protocol compatibility.

ForgeLoop 1.6.4 adds persisted workspace binding, canonical handoffs, responsibility constraints, differential verification scope and code attestation resources. Studio reads these resources through selected-task, read-only adapter methods and keeps their failures independent. The additive features are not core compatibility gates: when one is missing or incomplete, the project remains `INTEGRATION_V1` and only that feature is unavailable. Studio also displays persisted verification-execution isolation provenance without creating or attesting isolation environments.

## Adaptive execution-profile context and efficiency observability

ForgeLoop 1.7.0 adds the canonical `task/context` projection for requested
profile, safety floor, resolved profile, escalation, bounded context policy and
context invariants. Studio reads this projection only when the host advertises
the complete capability contract. Older hosts receive an explicit balanced
compatibility projection; an advertised but unavailable or malformed resource
remains unavailable. Usage is host/provider-reported or `UNKNOWN`; Studio does
not estimate tokens, time or cost. Context inflation and benchmark regression
statuses are observational diagnostics and never change lifecycle authority.

## Canonical 1.6.4 resources

The optional resources are consumed from the ForgeLoop Integration API rather than reconstructed from local artifacts:

| Resource | Studio presentation | Non-goal |
|---|---|---|
| `task/workspace-binding` | Current binding status and bounded identity details | Studio never binds or rebinds a workspace |
| `task/handoffs` | Immutable handoff snapshots in a separate Continuity surface | A handoff is not evidence, authority or delegation |
| `task/responsibility` | Responsibility status, frozen inputs, changed paths and errors | Studio never sets responsibility |
| `task/verification-scope` | Persisted requested `AUTO`, `CHANGED`, `CLAIMED` or `FULL` mode and resolved `CHANGED`, `CLAIMED`, `FULL` or `UNRESOLVED` mode | Studio never computes scope and never presents `IMPACTED` |
| `task/attestation` | Lazy status, trust level, signature state, signer and errors | Studio never creates or signs attestations; external signing-provider verification is never automatic |

All five features degrade independently. A valid workspace or handoff resource remains visible if responsibility is invalid, verification scope is absent, or attestation is disabled.

## Verification Scope vs Attestation Coverage

Verification scope records what ForgeLoop planned or resolved for a check. Resolved `UNRESOLVED` remains distinct from an unknown Studio value. Attestation records the state of a code attestation and its completion-ledger binding. Scope is not coverage proof, and Studio never promotes `AUTO`, `CHANGED`, `CLAIMED` or `FULL` into `PROCESSED`, `VERIFIED` or `ATTESTED`. Studio never creates or signs attestations and may request canonical local content verification only when no external signing-provider execution is required. External signing-provider verification is never triggered automatically. An optional external Sigstore bundle is displayed only as bounded external data; its presence alone never produces `ATTESTED`.

## Continuity vs Canonical Handoff

Continuity is the mutable resume context for a task. A canonical handoff is an immutable ForgeLoop snapshot with its own identity and integrity semantics. Studio presents both, but never merges them into one timeline or labels a handoff as review/completion evidence.

## Authority boundary

Semantic facts come exclusively from the bundled `@cassiomc1/forgeloop/integration` subpath:

- `protocol/info` — protocol/schema compatibility (`compatibility.schemaVersion`; there is no top-level `schemaVersion`);
- `project/tasks` — canonical task discovery; in `INTEGRATION_V1` it drives semantic task existence: filesystem namespaces only locate artifacts and produce diagnostics (extra namespaces are never promoted into tasks, corrupt namespaces never become synthetic `RECEIVED` tasks, and an unavailable discovery fails closed instead of falling back to the filesystem);
- `task/status`, `task/ownership`, `task/contract`, `task/continuity` — canonical per-task facts.
- `task/context` — optional ForgeLoop 1.7.0 execution-profile context; Studio consumes the bounded canonical projection and never classifies work locally or infers provider usage.
- `task/workspace-binding`, `task/handoffs`, `task/responsibility`, `task/verification-scope`, `task/attestation` — optional ForgeLoop 1.6.4 boundary resources; Studio consumes their canonical status without reimplementing workspace identity, handoff validation, responsibility validation, scope resolution or attestation verification.
- `executions/exec-*.json` — bounded read-only execution detail artifacts; Studio validates and displays persisted verification provenance, including recorded isolation metadata when available, without deriving sandbox semantics.
- `history`, `trace`, `reflect`, `inspect` — canonical read-only observability projections; Studio does not recompute their semantics.
- `task/actions`, `task/action`, `task/approvals`, `task/metrics`, `task/evaluations`, `project/capability-policy` — canonical read-only action, approval, policy and trajectory projections.

Policy status and the canonical `next` action also run through this boundary; in `INTEGRATION_V1` the external ForgeLoop CLI is never spawned for policy, status or next. Mutating commands such as action authorization, approval resolution, reconciliation, execution and recovery remain unavailable to the Studio UI.

The Studio never reimplements ForgeLoop rules (claim release, recovery validation, locks, CAS, transactions, migration). Direct `.forgeloop/` artifact reading remains available for detail views, previews, validation and diagnostics only; it never determines current owner, effective claims, `mutationAllowed`, or recovery validity.

Capability negotiation selects one of three compatibility modes: `INTEGRATION_V1`, `ARTIFACT_ONLY`, or `INCOMPATIBLE`. Any capability drift (Integration API version, executor parity, `taskClaimRecovery` feature flags, missing resources) fails closed to `INCOMPATIBLE`. There is no selectable legacy mode: ForgeLoop 1.3 projects carry no explicit legacy marker in their artifacts, so the Studio never infers one — it degrades to `ARTIFACT_ONLY` instead of pretending to provide canonical semantics.

## Trusted schemas

Refresh the trusted schema set only from a controlled ForgeLoop checkout:

```bash
node scripts/generate-schema-provenance.mjs \
  --source ../forgeloop \
  --commit a4360ac9b24b19c74171fdbac3163b892d896484 \
  --package-version 1.8.0
npm run protocol:schemas:verify
```

The trusted set includes `task-recovery.schema.json`, `execution.schema.json`, `action.schema.json`, `approval.schema.json`, `capability-policy.schema.json`, `trajectory-evaluation.schema.json`, `workspace-binding.schema.json`, `handoff-envelope.schema.json`, `responsibility.schema.json`, `verification-scope.schema.json`, `code-manifest.schema.json`, `code-attestation.schema.json`, `in-toto-statement.schema.json` and `attestation-verification-result.schema.json`, together with their safe local `$ref` dependencies. Project-controlled `.forgeloop/schemas` content is never a Studio trust authority. The external Sigstore bundle is intentionally not assigned a ForgeLoop schema. Signed distribution is not required for the current unsigned preview policy; checksums, provenance, and public post-publish verification are required instead.

Release publication and verification are documented separately in the
[release model](RELEASE_MODEL.md); a compatible local project is not evidence
that a public release has been published.
