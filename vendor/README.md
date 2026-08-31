# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.7.0-1eaae5c.tgz` is the packed ForgeLoop runtime used by
ForgeLoop Studio through the public `@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `1eaae5cbb2046ef606d201161aa5abbbeddab153`
- Package version: `1.7.0`
- SHA-256: `d07e94bb5db345a604b1bbfa77e0150ad23eeff4bf9043da278fd6753e1a78f0`

The archive is pinned to the immutable ForgeLoop v1.7.0 release commit so
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
