# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.11.1-674f12c.tgz` is the packed ForgeLoop `1.11.1` runtime used
by ForgeLoopAudit through the public `@cassiomc1/forgeloop/integration`
subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `674f12c006b3ace12278f109b7ae24f57012d09c`
- Package version: `1.11.1`
- SHA-256: `3457050fc517c3d1f672558fe774abd55ca89f58e77ea0f19573aa1e98a2b4c9`

The archive is packed from the peeled immutable `v1.11.1` release commit.
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
