# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.6.0-1eb8088.tgz` is the packed ForgeLoop runtime used by
ForgeLoop Studio through the public `@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/ForgeLoop`
- Pinned commit: `1eb8088716e279faa746b11e3077de1fef570b69`
- Package version: `1.6.0`
- SHA-256: `863e4008e18dfc108991878da3d6bb969ae2e2de3be8b4ca4a2937507fb805a0`

The package version and commit are both recorded because this commit contains
current-main Integration API capabilities beyond the published 1.6.0 label.
The archive is intentionally vendored so packaged Studio builds do not depend
on a sibling ForgeLoop checkout or a floating Git URL.

To regenerate, check out the pinned ForgeLoop commit, run `npm pack`, replace
the archive, update the SHA-256 above and regenerate `schemas/provenance.json`.
