import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getTrustedSchemaNames } from './schema-provenance.mjs';

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`Missing ${name}`);
  return args[index + 1];
}

const args = process.argv.slice(2);
const repoRoot = process.cwd();
const sourceRoot = resolve(readOption(args, '--source'));
const expectedCommit = readOption(args, '--commit');
const expectedPackageVersion = readOption(args, '--package-version');
const actualCommit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (actualCommit !== expectedCommit) throw new Error(`ForgeLoop source is ${actualCommit}, expected ${expectedCommit}`);
const sourcePackage = JSON.parse(readFileSync(join(sourceRoot, 'package.json'), 'utf8'));
if (sourcePackage.version !== expectedPackageVersion) {
  throw new Error(`ForgeLoop package is ${sourcePackage.version}, expected ${expectedPackageVersion}`);
}

const schemas = {};
mkdirSync(join(repoRoot, 'schemas'), { recursive: true });
for (const name of getTrustedSchemaNames(repoRoot)) {
  const sourcePath = join(sourceRoot, 'schemas', name);
  const destinationPath = join(repoRoot, 'schemas', name);
  const bytes = readFileSync(sourcePath);
  copyFileSync(sourcePath, destinationPath);
  schemas[name] = {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    upstreamPath: `schemas/${name}`,
  };
}

writeFileSync(join(repoRoot, 'schemas', 'provenance.json'), `${JSON.stringify({
  forgeLoopPackageVersion: expectedPackageVersion,
  forgeLoopGitCommit: expectedCommit,
  protocolVersion: 1,
  generatedAt: new Date().toISOString(),
  schemas,
}, null, 2)}\n`);
console.log(`Generated provenance for ${Object.keys(schemas).length} schemas from ${expectedCommit}`);
