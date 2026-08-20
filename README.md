# ForgeLoop Studio

> **A real-time visual interface for the ForgeLoop engineering protocol.**

ForgeLoop Studio is a local-first desktop companion for ForgeLoop. Open a ForgeLoop-enabled project and visualize tasks, lifecycle phases, contracts, routing, gates, checks, evidence, recovery cycles, continuity, policy state and completion health in real time.

## Status

Beta candidate — the read-only Studio runtime, protocol integration and multi-platform CI are implemented. Packaged release validation and platform trust checks remain release-gated.

## Stack

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

## Development

```bash
npm ci
npm run dev
```

Use `npm run verify` for typecheck, tests and a deterministic production build. See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for packaged macOS diagnostics and CLI/runtime limitations.

Use `npm run test:electron-smoke` for source/built Electron smoke and `npm run test:packaged-smoke` to build and launch the electron-builder unpacked application. When ForgeLoop CLI is unavailable, Studio remains readable in explicit artifact-only compatibility mode.
