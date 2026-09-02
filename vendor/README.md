# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.9.0-64dca84.tgz` is the packed ForgeLoop runtime used by
ForgeLoop Studio through the public `@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `64dca84357d11989d16b0698e1ff6409ff0f0ddf`
- Package version: `1.9.0`
- SHA-256: `dd6bec1bf889a8df70b8823b73bc5c2dc290fd482d6863c7d2f5d58b1a92e733`

The archive is pinned to the immutable ForgeLoop v1.9.0 release commit so
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
