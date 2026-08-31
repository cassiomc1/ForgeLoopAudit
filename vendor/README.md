# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.8.0-a4360ac.tgz` is the packed ForgeLoop runtime used by
ForgeLoop Studio through the public `@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `a4360ac9b24b19c74171fdbac3163b892d896484`
- Package version: `1.8.0`
- SHA-256: `9b8347c581b4e410289cf6d2698e6743ae0acd531ed92cf61700438330440598`

The archive is pinned to the immutable ForgeLoop v1.8.0 release commit so
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
