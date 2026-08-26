# ForgeLoop protocol schemas

This directory vendors the ForgeLoop protocol-v1 JSON Schemas used by Studio's Ajv trust boundary. The files are shipped with the Electron application so packaged builds do not silently fall back to handwritten shape checks.

The schema filenames and protocol version are bound by `src/main/core/protocol/artifact-registry.ts`. Refresh these files only from the matching ForgeLoop protocol-v1 schema set and rerun the artifact validation fixtures.

`provenance.json` currently pins ForgeLoop `1.6.0` at commit `1eb8088716e279faa746b11e3077de1fef570b69` and records the protocol version, upstream path and SHA-256 for every trusted schema. Verify it with `npm run protocol:schemas:verify`; regenerate it only from a controlled ForgeLoop checkout using `scripts/generate-schema-provenance.mjs`.
