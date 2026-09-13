# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.13.0-4fbc9f1.tgz` is the packed ForgeLoop `1.13.0` runtime used
by ForgeLoopAudit through the public `@cassiomc1/forgeloop/integration`
subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `4fbc9f1463c66f0250f46cb76bc4d0c389c8c83c`
- Package version: `1.13.0`
- SHA-256: `1bd0be0339596eaf2ced4e210002374c7c9009c462c4dd29beb254ba1b0c078d`

The archive is packed from the peeled immutable `v1.13.0` release commit. Its
package-boundary verifier confirms the canonical `flutter` guide and the
complete installable-guide file closure without making ForgeLoopAudit a guide
registry owner.
ForgeLoopAudit uses its Integration API v1 for canonical audit resources and
the explicit Repository Index/Search operations. Repository discovery results
remain engineering navigation data, never lifecycle evidence or authority.

Packaged ForgeLoopAudit builds do not depend on a sibling ForgeLoop checkout, a
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
