# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.8.1-64a16c0.tgz` is the packed ForgeLoop runtime used by
ForgeLoop Studio through the public `@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `64a16c05e4838e75f7f38674dcf879e19285a83a`
- Package version: `1.8.1`
- SHA-256: `dba3e7356f3c342fc7ee3b955edb459c06c0693783d4f679f93649995a60d138`

The archive is pinned to the immutable ForgeLoop v1.8.1 release commit so
packaged Studio builds do not depend on a sibling ForgeLoop checkout, a
floating branch, or network package resolution at runtime.

Verify the complete package, lockfile, archive and schema lineage with:

```bash
npm run verify:forgeloop-lineage
npm run protocol:schemas:verify
```

To regenerate, check out the pinned ForgeLoop commit, run `npm pack`, replace
the archive, update the SHA-256 above and regenerate `schemas/provenance.json`.
Run both verification commands again before committing. The vendored archive
must remain controlled, local and immutable from Studio's point of view.
