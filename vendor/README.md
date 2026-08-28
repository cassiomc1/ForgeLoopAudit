# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.6.1-f331100.tgz` is the packed ForgeLoop runtime used by
ForgeLoop Studio through the public `@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `f331100cff175a4ce990fa843b397fcf720b40f5`
- Package version: `1.6.1`
- SHA-256: `0411a7a0d45429ac40b498cd432c377184afd6530058d56469561e4c3cab1193`

The archive is pinned to the immutable ForgeLoop v1.6.1 release commit so
packaged Studio builds do not depend on a sibling ForgeLoop checkout, a
floating branch, or network package resolution at runtime.

To regenerate, check out the pinned ForgeLoop commit, run `npm pack`, replace
the archive, update the SHA-256 above and regenerate `schemas/provenance.json`.
