# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.5.0.tgz` is the packed form of the pinned ForgeLoop
1.5.0 baseline that Studio consumes through the public
`@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/ForgeLoop`
- Pinned commit: `e938fa68f96b1daa19df97fd5f4c9a77ea928e0a`
- Package version: `1.5.0`
- SHA-256: `dce9e8ea3f4695267d572cb0676fb5c4433a91077e82d0f768042e88a23463e6`

Baseline e938fa68 is ForgeLoop main at 1.5.0 and includes the Windows
filesystem hardening (transient EPERM/EACCES retries in realpath/lstat) that
landed after 6a68430. Vendoring keeps the Studio self-contained (CI has no
sibling ForgeLoop checkout). When ForgeLoop 1.5.0 is published to npm, replace the
`file:vendor/...` spec in `package.json` with the exact version pin
(`"1.5.0"`) and delete this directory.

To regenerate: check out the pinned commit, run `npm pack`, replace the
tarball, update the SHA-256 above and `schemas/provenance.json` if the
baseline moved.
