# Dependency policy

The current dependency baseline is ForgeLoopAudit `0.3.0-rc.3` with ForgeLoop
`1.14.0` from `6daf42e69b41b32546dba8cc28ff18b4691f7b83` (protocol v1, schema
v1, Integration API v1). The ForgeLoop dependency is a pinned local tarball;
the lockfile and archive are part of the review surface.

ForgeLoop package metadata is `license: UNLICENSED` with
`publishConfig.access: restricted`. The vendored tarball is therefore a
controlled local runtime copy of ForgeLoop's public Integration API, not a
public dependency and not a redistribution of ForgeLoop under a public
license. ForgeLoopAudit must never resolve ForgeLoop from the public npm
registry, never describe it as MIT-licensed or freely redistributable, and
never copy ForgeLoop-owned license files into this repository.

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
