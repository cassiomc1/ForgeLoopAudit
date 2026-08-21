import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const SCHEMA_DIR = join(process.cwd(), 'schemas');

export const SCHEMA_FILES = {
  'config.json': 'config.schema.json',
  'sources.json': 'source-registry.schema.json',
  'task.json': 'task-descriptor.schema.json',
  'contract.json': 'current-contract.schema.json',
  'routing-result.json': 'routing-result.schema.json',
  'preflight.json': 'preflight.schema.json',
  'work-state.json': 'work-state.schema.json',
  'continuity.json': 'continuity.schema.json',
  'execution-receipt.json': 'execution-receipt.schema.json',
  'session.json': 'activation.schema.json',
  'gate.json': 'gate.schema.json',
  'event': 'event.schema.json',
  'policy-snapshot.json': 'policy-snapshot.schema.json',
  'policy/rules.json': 'policy-rules.schema.json',
  'policy/discovery.json': 'policy-discovery.schema.json',
  'policy/baseline.json': 'policy-baseline.schema.json',
  'policy/policy.lock': 'policy-lock.schema.json',
};

let ajvInstance;
function getAjv() {
  if (!ajvInstance) {
    ajvInstance = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajvInstance);
    for (const file of new Set(Object.values(SCHEMA_FILES))) {
      ajvInstance.addSchema(JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8')), file);
    }
  }
  return ajvInstance;
}

export function taskKeyFor(taskId) {
  return createHash('sha256').update(taskId).digest('hex');
}

export function fingerprint(label) {
  return createHash('sha256').update(`forgehop:${label}`).digest('hex');
}

export function sha256FileBytes(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function assertSchemaValid(artifactName, value) {
  const schemaFile = SCHEMA_FILES[artifactName];
  if (!schemaFile) throw new Error(`No trusted schema registered for demo artifact "${artifactName}"`);
  const validate = getAjv().getSchema(schemaFile);
  if (!validate) throw new Error(`Trusted schema ${schemaFile} failed to compile`);
  if (!validate(value)) {
    const detail = (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`Demo artifact "${artifactName}" is not schema-valid: ${detail}`);
  }
}

export function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
