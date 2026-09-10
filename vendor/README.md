# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.12.0-ea36276.tgz` is the packed ForgeLoop `1.12.0` runtime used
by ForgeLoopAudit through the public `@cassiomc1/forgeloop/integration`
subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `ea362768dacfe885b1cc2729dd32ee661d60008f`
- Package version: `1.12.0`
- SHA-256: `b36b03bdbc79537af25e5d633962839c2e00cac3d9416cd014758852e31bcde1`

The archive is packed from the peeled immutable `v1.12.0` release commit. Its
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
