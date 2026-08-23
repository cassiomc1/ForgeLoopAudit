# Vendored ForgeLoop runtime dependency

`cassiomc1-forgeloop-1.5.0.tgz` is the packed form of the pinned ForgeLoop
1.5.0 baseline that Studio consumes through the public
`@cassiomc1/forgeloop/integration` subpath.

- Source repository: `cassiomc1/ForgeLoop`
- Pinned commit: `6a6843041ccbdf85794c01f4adfb3a2e07fa74ff`
- Package version: `1.5.0`
- SHA-256: `cb4cb4685de8c278dd536064498f9c56fd5eac1aca4e0f0f6c88d5aad5d6b5b3`

Vendoring keeps the Studio self-contained (CI has no sibling ForgeLoop
checkout). When ForgeLoop 1.5.0 is published to npm, replace the
`file:vendor/...` spec in `package.json` with the exact version pin
(`"1.5.0"`) and delete this directory.

To regenerate: check out the pinned commit, run `npm pack`, replace the
tarball, update the SHA-256 above and `schemas/provenance.json` if the
baseline moved.
