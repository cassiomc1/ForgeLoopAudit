# Release model

ForgeLoopAudit `0.2.0-rc.3` currently produces unsigned preview artifacts.
This release is aligned to ForgeLoop `1.10.1` at immutable commit
`b6802b8b5d0cb7e8edbf811350d9a94f4cb1942d`, with protocol v1, schema v1 and
Integration API v1. The release contract is defined by stable invariants rather than by a particular release
candidate number, and [`docs/releases/release-matrix.json`](releases/release-matrix.json)
remains the machine-readable authority for the public asset matrix.

## Public release contract

A public release must satisfy all of the following:

- platform-specific assets are produced for the matrix entry and staged
  without unexpected files;
- each staged asset is covered exactly once by the matching platform checksum
  manifest;
- release evidence binds the asset filename, SHA-256, platform, architecture,
  ForgeLoopAudit version, source commit, ForgeLoop lineage and unsigned-preview policy;
- the lockfile SBOM is generated and normalized as `SBOM-cyclonedx.json`;
- Electron fuses are applied and read back from the packaged application;
- the source commit resolved from the release tag is the commit named by the
  release evidence; and
- only the tag-triggered workflow publishes a GitHub Release.

Linux, macOS and Windows assets are unsigned previews for the current release
line. Signing and notarization are intentionally outside this release
contract. Users should expect operating-system security warnings and should
verify the published checksums and evidence before using an artifact.

## Verification boundaries

These stages are intentionally separate:

| Stage | What it proves | What it does not prove |
|---|---|---|
| Local verification | The shared `verify:full` contract passes in the current checkout | That a public release exists or that every native runner passed |
| Pull-request CI | The shared contract and native smoke/package checks pass on the configured matrix | Publication or tag identity |
| Packaged verification | The unpacked/native package launches, opens the demo, and has the expected fuses | Signing, notarization or public availability |
| Rehearsal (`workflow_dispatch`) | Platform staging, assembly, checksums, SBOM and evidence can be produced | GitHub Release publication |
| Tag workflow | The tag-bound asset bundle is published after the same verification and assembly gates | Signing/notarization unless a future contract adds them |

The platform jobs run `npm run verify:full`, build the unsigned platform
package, exercise packaged smoke and demo-open checks, verify Electron fuses,
validate the release matrix and upload staged assets. The `assemble` job merges
those assets, removes staging-only metadata, generates the lockfile SBOM and
verifies the flat bundle. The `publish` job runs only for a Git tag and
publishes the assembled files.

Do not infer publication, signing, notarization or production availability from
a local build, a green pull request, or a successful workflow rehearsal.

See [Quality gates](QUALITY_GATES.md) for the verification contract and the
[release evidence schema](releases/release-evidence.schema.json) for the
machine-validated evidence shape.
