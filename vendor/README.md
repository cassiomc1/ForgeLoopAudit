# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.6.4-24f50f9.tgz` is the packed ForgeLoop runtime used by
ForgeLoop Studio through the public `@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `24f50f9eefe5055cec053f075c748542b42e4ea2`
- Package version: `1.6.4`
- SHA-256: `a411d0dbd3a94b52206512eabefc50fb8fc09034b39c60fe4663d9b9fb08852b`

The archive is pinned to the immutable ForgeLoop v1.6.4 release commit so
packaged Studio builds do not depend on a sibling ForgeLoop checkout, a
floating branch, or network package resolution at runtime.

To regenerate, check out the pinned ForgeLoop commit, run `npm pack`, replace
the archive, update the SHA-256 above and regenerate `schemas/provenance.json`.
