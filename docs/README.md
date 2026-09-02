# ForgeLoop Studio Documentation

This index separates current product guidance from historical records and
points each topic to its canonical owner. ForgeLoop Studio is a local-first,
read-only visual consumer; ForgeLoop remains the protocol authority.

The current release baseline is Studio `0.1.0-rc.7` with vendored ForgeLoop
`1.10.0` at immutable commit
`3bf721bac6a09c6291bfcbc507a66a2833ebddf4`, using protocol v1, schema v1 and
Integration API v1. The current capability additions are
`canonicalHandoffs v2` and `advisoryContextProviders v1`; their trust and
read-only display rules are owned by [Protocol compatibility](PROTOCOL_COMPATIBILITY.md).

## Start here

- [Root README](../README.md) — product overview, trust model, compatibility,
  demo and development commands.
- [ForgeLoop Studio implementation specification](../FORGELOOP_STUDIO_IMPLEMENTATION_SPEC.md)
  — architecture, security boundaries, UI model and current implementation
  contract.
- [ForgeShop demo guide](../demo/README.md) — generated fixture truth and
  intentional scenario states.
- [Screenshot guide](../screen/README.md) — source, mappings and freshness
  rules for the visual documentation.

## Current documentation owners

| Topic | Canonical document | Implementation or machine source |
|---|---|---|
| Product purpose and getting started | [Root README](../README.md) | `src/renderer/`, `package.json` |
| Architecture and security | [Implementation specification](../FORGELOOP_STUDIO_IMPLEMENTATION_SPEC.md) | `src/main/`, `src/preload/`, `src/renderer/` |
| ForgeLoop compatibility | [Protocol compatibility](PROTOCOL_COMPATIBILITY.md) | `src/main/core/protocol/`, `src/main/core/integration/` |
| Operational recovery and failures | [Troubleshooting](TROUBLESHOOTING.md) | `src/main/`, `src/renderer/` |
| Verification contract | [Quality gates](QUALITY_GATES.md) | `scripts/verify-full.mjs`, `.github/workflows/` |
| Publication contract | [Release model](RELEASE_MODEL.md) | `docs/releases/`, `.github/workflows/release.yml` |
| Visual/product principles | [UI design direction](UI_DESIGN_DIRECTION.md) | `src/renderer/`, `src/renderer/styles/` |
| Implementation status | [Implementation checklist](IMPLEMENTATION_CHECKLIST.md) | `src/`, `tests/`, `scripts/` |
| Dependency and audit policy | [Dependency policy](DEPENDENCY_POLICY.md) | `package.json`, `package-lock.json`, `scripts/dependency-policy.mjs` |
| Trusted schemas | [Schemas README](../schemas/README.md) | `schemas/provenance.json`, `src/main/core/protocol/artifact-registry.ts` |
| Vendored ForgeLoop lineage | [Vendor README](../vendor/README.md) | `package.json`, `package-lock.json`, vendored tarball |

## Verification and release

- [Quality gates](QUALITY_GATES.md) explains what local, CI, platform and
  release checks prove.
- [Release model](RELEASE_MODEL.md) explains unsigned previews, platform
  assets, checksums, SBOMs and evidence without conflating verification with
  publication.
- Machine contracts live under [`docs/releases/`](releases/) and remain
  authoritative for release asset shape and identity.

## Trust boundary

- [Protocol compatibility](PROTOCOL_COMPATIBILITY.md) defines the Integration
  API boundary, compatibility modes and independently degraded optional
  features.
- [Schemas README](../schemas/README.md) defines the trusted protocol-v1
  schema boundary and provenance verification.
- [Vendor README](../vendor/README.md) defines the pinned ForgeLoop archive
  and controlled regeneration procedure.

## Historical records

The dated verification records under [`docs/verification/`](verification/) and
the plans/specifications under [`docs/superpowers/`](superpowers/) describe
specific earlier repository states. They are historical records, not current
product requirements. Their version numbers, commit IDs and test results must
remain unchanged.
