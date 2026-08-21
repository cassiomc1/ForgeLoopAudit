# Quality gates

`npm run verify:full` is the local fail-fast gate. It verifies dependency policy, production audit, schema provenance, documentation, types, lint, tests, enforced coverage, critical coverage, measured performance, build, and package contents. Platform-native packaging, accessibility, and public-release verification run in the GitHub matrix. GitHub's repository default CodeQL setup remains the single CodeQL authority; an overlapping advanced workflow is intentionally not added.

The V8 unit gate deliberately scopes out Electron/process/filesystem adapter modules whose executable coverage is collected by the packaged smoke and Playwright E2E gates. Security and protocol pure functions remain in the unit denominator; this is a test-boundary decision, not a suppression of runtime verification. The adapter exclusions are explicit in `vitest.config.ts`; the critical gate must never silently become empty and retains 95% lines/functions and 90% branches for the pure security, IPC, and protocol boundary.

The packaged smoke logs its executable, elapsed launch time, PID, exit metadata, title, preload bridge, and cleanup failures. A launch or first-window timeout fails the gate and forces cleanup so a hung Electron process cannot hide the original diagnostic.
