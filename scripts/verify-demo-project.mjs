import { join } from 'node:path';
import { verifyDemoProject } from './demo/verifier.mjs';

const root = process.argv[2] || join(process.cwd(), 'demo');
const result = verifyDemoProject(root);
console.log(`Demo verification: ${result.stats.tasks} tasks, ${result.stats.events} events, phases [${result.stats.phases.join(', ')}], ${result.stats.checkedReferences} references checked`);
console.log(`Demo artifact coverage: ${result.stats.artifactCoverage.represented}/${result.stats.artifactCoverage.total}`);
if (!result.ok) {
  console.error('DEMO VERIFICATION FAILED:');
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Demo project is protocol-valid and internally consistent');
