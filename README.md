# ForgeLoop Studio

> **A real-time visual interface for the ForgeLoop engineering protocol.**

ForgeLoop Studio is a local-first desktop companion for ForgeLoop. Open a ForgeLoop-enabled project and visualize tasks, lifecycle phases, contracts, routing, gates, checks, evidence, recovery cycles, continuity, policy state and completion health in real time.

## Status

Design and implementation specification completed. Initial implementation is not started yet.

## Planned stack

- Electron
- Node.js 20+
- TypeScript
- React
- Vite
- Tailwind CSS
- React Flow
- Chokidar
- Ajv
- Vitest
- Playwright

## Product direction

ForgeLoop Studio is designed as a **read-only observer by default**. ForgeLoop remains the protocol authority and `.forgeloop/` remains the canonical source of truth.

The visual direction is a premium, modern, minimal dark developer interface focused on clarity rather than decorative effects.

## Implementation specification

See [`FORGELOOP_STUDIO_IMPLEMENTATION_SPEC.md`](./FORGELOOP_STUDIO_IMPLEMENTATION_SPEC.md) for the complete architecture, security model, UI system, data model, feature scope, testing strategy, implementation order and MVP definition of done.

## ForgeLoop

ForgeLoop Studio is a companion project for [ForgeLoop](https://github.com/cassiomc1/forgeloop).
