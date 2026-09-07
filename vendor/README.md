# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.10.2-d286e19.tgz` is the packed ForgeLoop runtime used by
ForgeLoopAudit through the public `@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `d286e1983177a0dfb1f0ceef6c2f6e30c406303a`
- Package version: `1.10.2`
- SHA-256: `0cee3747d2dfa9f938d2efe9380a840681123ff92407d0e567f8395bd6f9f8b4`

The archive is pinned to the immutable ForgeLoop v1.10.2 release commit so
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
