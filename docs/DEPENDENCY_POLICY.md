# Dependency policy

Production high/critical vulnerabilities block release. Full audit output is retained as a CI artifact; development findings require an owner and an upstream remediation path. The lockfile is mandatory and install scripts are explicitly reviewed through `package.json.allowScripts`.
