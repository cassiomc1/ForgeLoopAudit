# Quality gates

The current release baseline is Studio `0.1.0-rc.7` with vendored ForgeLoop
`1.10.0` at `3bf721bac6a09c6291bfcbc507a66a2833ebddf4` (protocol v1, schema v1,
Integration API v1). `npm run verify:full` is the local fail-fast contract. Its current sequence is
the authoritative list of shared gates:

1. ForgeLoop vendor lineage and version lineage;
2. dependency policy and high/critical production audit;
3. schema provenance, deterministic demo drift/verification and documentation
   conformance;
4. TypeScript, ESLint, unit tests, release-contract tests, V8 coverage and
   critical coverage;
5. measured performance budget;
6. production build; and
7. package-content verification.

The local contract does not claim native packaging, accessibility, CodeQL or
public-release verification. Pull-request CI adds Electron smoke, the E2E
suite, unpacked packaged smoke and Electron-fuse read-back on Ubuntu, macOS and
Windows. GitHub's repository-default CodeQL setup remains the single CodeQL
authority; this repository does not add an overlapping advanced workflow.

The V8 unit gate deliberately scopes out Electron/process/filesystem adapter
modules whose executable coverage is collected by packaged smoke and Playwright
E2E gates. Security and protocol pure functions remain in the unit denominator;
this is a test-boundary decision, not a suppression of runtime verification.
The exclusions are explicit in `vitest.config.ts`, and the critical gate keeps
95% lines/functions and 90% branches for the pure security, IPC and protocol
boundary.

The packaged smoke logs its executable, elapsed launch time, PID, exit metadata,
title, preload bridge and cleanup failures. A launch or first-window timeout
fails the gate and forces cleanup. On Linux CI only, Chromium receives
`--no-sandbox` because hosted runners do not provide the setuid sandbox
ownership required by Electron; this runner accommodation does not weaken
packaged runtime hardening or fuse assertions.
