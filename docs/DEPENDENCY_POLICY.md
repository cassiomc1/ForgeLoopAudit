# Dependency policy

The current dependency baseline is ForgeLoopAudit `0.3.0-rc.1` with ForgeLoop
`1.11.1` from `674f12c006b3ace12278f109b7ae24f57012d09c` (protocol v1, schema
v1, Integration API v1). The ForgeLoop dependency is a pinned local tarball;
the lockfile and archive are part of the review surface.

Production high/critical vulnerabilities block release. Development findings
require an owner and an upstream remediation path. The lockfile is mandatory,
and install scripts are explicitly reviewed through `package.json.allowScripts`.

Use the repository policy and production-audit gates:

```bash
npm ci
npm run dependency:policy
npm run audit:prod
npm run verify:forgeloop-lineage
```

Development-only findings are triaged with `npm audit --json`, checking
reachability, advisory severity and the first fixed version. Dependency families
are upgraded one at a time; `npm audit fix --force` is not an accepted release
procedure. Browser/UI dependencies are kept local and reproducible; no runtime
network package resolution is required.
