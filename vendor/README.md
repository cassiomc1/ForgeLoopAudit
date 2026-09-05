# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.10.1-b6802b8.tgz` is the packed ForgeLoop runtime used by
ForgeLoopAudit through the public `@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `b6802b8b5d0cb7e8edbf811350d9a94f4cb1942d`
- Package version: `1.10.1`
- SHA-256: `55939e0f435dd164e8e35a43c5e8b4eb0a09fd48c3fd84541cb72df2bd5e3a86`

The archive is pinned to the immutable ForgeLoop v1.10.1 release commit so
packaged ForgeLoopAudit builds do not depend on a sibling ForgeLoop checkout, a
floating branch, or network package resolution at runtime.

Verify the complete package, lockfile, archive and schema lineage with:

```bash
npm run verify:forgeloop-lineage
npm run protocol:schemas:verify
```

To regenerate, check out the pinned ForgeLoop commit, run `npm pack`, replace
the archive, update the SHA-256 above and regenerate `schemas/provenance.json`.
Run both verification commands again before committing. The vendored archive
must remain controlled, local and immutable from ForgeLoopAudit's point of view.
