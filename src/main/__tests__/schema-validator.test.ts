import { describe, expect, it } from 'vitest';
import { SchemaValidator } from '@main/core/protocol/validator';

describe('SchemaValidator', () => {
  it('validates vendored protocol-v1 config schema', () => {
    const validator = new SchemaValidator('schemas');
    expect(validator.hasSchema('config.schema.json')).toBe(true);
    const valid = validator.validate('config.schema.json', { schemaVersion: 1, protocolVersion: 1, complianceMode: 'strict' });
    expect(valid.valid).toBe(true);
    expect(validator.validate('config.schema.json', { schemaVersion: 2, protocolVersion: 1, complianceMode: 'strict' }).valid).toBe(false);
  });
});
