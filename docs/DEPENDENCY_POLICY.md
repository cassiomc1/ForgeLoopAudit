# Dependency policy

Production high/critical vulnerabilities block release. Full audit output is retained as a CI artifact; development findings require an owner and an upstream remediation path. The lockfile is mandatory and install scripts are explicitly reviewed through `package.json.allowScripts`.

Development-only findings are triaged with `npm audit --json`, checking reachability, advisory severity, and the first fixed version. Dependency families are upgraded one at a time; `npm audit fix --force` is not an accepted release-readiness procedure.
