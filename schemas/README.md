# ForgeLoop protocol schemas

This directory vendors the ForgeLoop protocol-v1 JSON Schemas used by Studio's Ajv trust boundary. The files are shipped with the Electron application so packaged builds do not silently fall back to handwritten shape checks.

The schema filenames and protocol version are bound by `src/main/core/protocol/artifact-registry.ts`. Refresh these files only from the matching ForgeLoop protocol-v1 schema set and rerun the artifact validation fixtures.
