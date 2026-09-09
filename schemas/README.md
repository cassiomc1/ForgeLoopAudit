# ForgeLoop protocol schemas

This directory vendors the ForgeLoop protocol-v1 JSON Schemas used by ForgeLoopAudit's Ajv trust boundary. The files are shipped with the local web package so runtime checks do not silently fall back to handwritten shape checks.

The schema filenames and protocol version are bound by `src/main/core/protocol/artifact-registry.ts`. Refresh these files only from the matching ForgeLoop protocol-v1 schema set and rerun the artifact validation fixtures.

`provenance.json` currently pins ForgeLoop `1.11.1` at commit
`674f12c006b3ace12278f109b7ae24f57012d09c` and records protocol v1, the
upstream path and SHA-256 for every trusted schema. Trusted schemas include
workspace binding, canonical handoffs, responsibility, verification scope,
code manifests, in-toto statements, code-attestation predicates and
attestation verification results, canonical handoff acceptance and advisory
context capability metadata. Provenance generation recursively includes
safe local `$ref` dependencies, rejects remote or escaping references and
keeps the external Sigstore bundle outside the ForgeLoop schema boundary.

Verify the committed trust boundary with:

```bash
npm run protocol:schemas:verify
```

Regenerate it only from a controlled ForgeLoop checkout using
`scripts/generate-schema-provenance.mjs`; do not treat project-controlled
`.forgeloop/schemas` content as trusted schema authority. See
[protocol compatibility](../docs/PROTOCOL_COMPATIBILITY.md) for how these
schemas relate to the Integration API.
