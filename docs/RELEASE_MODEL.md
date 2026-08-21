# Release model

ForgeLoop Studio releases are read-only unsigned previews until signing credentials are intentionally introduced. Public assets are produced per operating system, checksummed after staging, and accompanied by SBOM and release evidence tied to the lockfile, source commit, protocol schema provenance, platform, architecture, and signing policy.

## RC3 release invariant

`docs/releases/release-matrix.json` is the source of truth for the public asset matrix. A release is not complete unless every expected artifact exists exactly once, every artifact appears in exactly one platform checksum manifest, and every artifact has one evidence JSON whose filename, SHA-256, platform, architecture, version, commit, and unsigned-preview policy match the downloaded bytes. `SBOM-cyclonedx.json` is mandatory.

The release workflow is intentionally split into platform jobs and a publish job. Each native platform job runs `verify:full` and independently reads back the packaged Electron fuses after the native build. `workflow_dispatch` is a rehearsal path; the tag-triggered path is the only publication path. Public verification resolves the tag commit independently and requires every evidence file to reference that commit. RC3 must reach green native CI and a successful rehearsal before a release tag is created.
