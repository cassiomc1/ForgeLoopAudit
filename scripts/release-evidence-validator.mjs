import Ajv2020 from 'ajv/dist/2020.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const EVIDENCE_SCHEMA_PATH = fileURLToPath(new URL('../docs/releases/release-evidence.schema.json', import.meta.url));

export function compileEvidenceValidator(schemaPath = EVIDENCE_SCHEMA_PATH) {
  return new Ajv2020({ allErrors: true }).compile(JSON.parse(readFileSync(schemaPath, 'utf8')));
}

export function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function resolveBuildCommit(repoRoot = REPO_ROOT) {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
}

export function parseEvidenceJson(evidenceName, text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${evidenceName}: evidence is not valid JSON`);
  }
}

export function validateReleaseEvidence({
  evidenceName,
  evidence,
  validate,
  artifactName,
  actualSha256,
  platform,
  architecture,
  expectedVersion,
  expectedSigning = 'unsigned-preview',
  expectedCommit,
  expectedWorkflowRunId,
}) {
  if (!validate(evidence)) {
    const detail = validate.errors.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ');
    throw new Error(`${evidenceName}: invalid release evidence schema: ${detail}`);
  }
  if (evidence.artifact !== artifactName) throw new Error(`${evidenceName}: evidence artifact ${evidence.artifact} does not match ${artifactName}`);
  if (evidence.sha256 !== actualSha256) throw new Error(`${evidenceName}: evidence sha256 does not match actual artifact bytes`);
  if (evidence.platform !== platform) throw new Error(`${evidenceName}: evidence platform ${evidence.platform} does not match ${platform}`);
  if (evidence.architecture !== architecture) throw new Error(`${evidenceName}: evidence architecture ${evidence.architecture} does not match ${architecture}`);
  if (evidence.studioVersion !== expectedVersion) throw new Error(`${evidenceName}: evidence studioVersion ${evidence.studioVersion} does not match expected ${expectedVersion}`);
  if (evidence.signing !== expectedSigning) throw new Error(`${evidenceName}: evidence signing ${evidence.signing} does not match policy ${expectedSigning}`);
  if (expectedCommit && evidence.gitCommit !== expectedCommit) throw new Error(`${evidenceName}: evidence gitCommit does not match build commit ${expectedCommit}`);
  if (expectedWorkflowRunId && evidence.workflowRunId !== expectedWorkflowRunId) throw new Error(`${evidenceName}: evidence workflowRunId ${evidence.workflowRunId} does not match run ${expectedWorkflowRunId}`);
}

export function assertCycloneDxSbom(sbom, { name, version }) {
  if (!sbom || typeof sbom !== 'object' || Array.isArray(sbom)) throw new Error('SBOM is not a JSON object');
  if (sbom.bomFormat !== 'CycloneDX') throw new Error(`SBOM bomFormat must be CycloneDX, found ${JSON.stringify(sbom.bomFormat ?? null)}`);
  if (typeof sbom.specVersion !== 'string' || sbom.specVersion.length === 0) throw new Error('SBOM is missing specVersion');
  if (!sbom.metadata || typeof sbom.metadata !== 'object') throw new Error('SBOM is missing metadata');
  const component = sbom.metadata.component;
  if (!component || typeof component !== 'object') throw new Error('SBOM metadata is missing the application component');
  if (component.name !== name) throw new Error(`SBOM component name ${JSON.stringify(component.name ?? null)} does not match ${JSON.stringify(name)}`);
  if (component.version !== version) throw new Error(`SBOM component version ${JSON.stringify(component.version ?? null)} does not match ${JSON.stringify(version)}`);
  if (!Array.isArray(sbom.components) || sbom.components.length === 0) throw new Error('SBOM has no components');
  for (const entry of sbom.components) {
    if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string' || entry.name.length === 0) throw new Error('SBOM contains a component without a name');
  }
}
