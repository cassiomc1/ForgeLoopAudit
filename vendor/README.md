# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.10.0-3bf721b.tgz` is the packed ForgeLoop runtime used by
ForgeLoopAudit through the public `@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `3bf721bac6a09c6291bfcbc507a66a2833ebddf4`
- Package version: `1.10.0`
- SHA-256: `d0973751dc5f193349fb7bb0e7cfd2bd9b394415b9620c725964562d558ef901`

The archive is pinned to the immutable ForgeLoop v1.10.0 release commit so
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
