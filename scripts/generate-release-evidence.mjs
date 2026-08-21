import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
const [platform, artifact, outputDir = '.'] = process.argv.slice(2);
if (!platform || !artifact) throw new Error('Usage: node scripts/generate-release-evidence.mjs <platform> <artifact>');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const digest = createHash('sha256').update(readFileSync(artifact)).digest('hex');
const evidence = { studioVersion: pkg.version, gitCommit: process.env.GITHUB_SHA || 'local', forgeLoopCompatibility: { protocolVersion: 1, schemaProvenanceCommit: '19355e701e191d830c56d64e535835e925843bae' }, platform, architecture: process.arch, artifact: basename(artifact), sha256: digest, signing: 'unsigned-preview', workflowRunId: process.env.GITHUB_RUN_ID || 'local' };
writeFileSync(`${outputDir}/RELEASE-EVIDENCE-${platform}.json`, `${JSON.stringify(evidence, null, 2)}\n`);
