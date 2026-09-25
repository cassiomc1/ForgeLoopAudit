# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.14.0-6daf42e.tgz` is the packed ForgeLoop `1.14.0` runtime used
by ForgeLoopAudit through the public `@cassiomc1/forgeloop/integration`
subpath.

- Source repository: `cassiomc1/forgeloop`
- Pinned commit: `6daf42e69b41b32546dba8cc28ff18b4691f7b83`
- Package version: `1.14.0`
- SHA-256: `ebfedc8d0e9d51a0ba4fbe846299523d6847c36debfdf0a16b13bb6e83ab6160`

The archive is packed from the pinned immutable ForgeLoop `main` commit above
(the `1.14.0` package version plus post-release repository fixes). Its
package-boundary verifier confirms the canonical `flutter` guide and the
complete installable-guide file closure without making ForgeLoopAudit a guide
registry owner.

ForgeLoop package metadata declares `license: UNLICENSED` and
`publishConfig.access: restricted`. The vendored tarball exists solely so
ForgeLoopAudit can run a local, offline copy of the public Integration API; it
is not a redistribution of ForgeLoop under any public license, and
ForgeLoopAudit must never claim ForgeLoop is publicly licensed or published.

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
