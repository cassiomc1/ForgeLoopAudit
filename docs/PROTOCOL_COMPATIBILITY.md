# ForgeLoop Protocol Compatibility

ForgeLoop Studio supports protocol version 1 and schema version 1 from the pinned ForgeLoop source revision recorded in `schemas/provenance.json`. The runtime artifact registry and `SUPPORTED_PROTOCOL.requiredSchemas` are contract-tested to remain identical.

Studio validates trusted vendored schemas before optional CLI enrichment. Artifact-only mode remains available when the ForgeLoop CLI is unavailable. CLI results enrich observations; they do not replace canonical artifact facts. Unsupported protocol or schema versions return explicit incompatibility instead of being normalized into a misleading UI state.

Refresh the trusted schema set only from a controlled ForgeLoop checkout:

```bash
node scripts/generate-schema-provenance.mjs \
  --source ../ForgeLoop \
  --commit 19355e701e191d830c56d64e535835e925843bae \
  --package-version 1.3.0
npm run protocol:schemas:verify
```

Project-controlled `.forgeloop/schemas` content is never a Studio trust authority. Signed distribution is not required for the current unsigned RC3 preview policy; checksums, provenance, and public post-publish verification are required instead.
