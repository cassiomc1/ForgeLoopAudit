import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ForgeLoopStudioError } from '@shared/errors';
import { parseJsonSafely } from '@main/security/resource-limits';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class SchemaValidator {
  private readonly ajv: Ajv;
  private readonly schemaCache: Map<string, object> = new Map();

  constructor(private readonly schemasDir: string) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  private loadSchema(schemaName: string): object {
    if (this.schemaCache.has(schemaName)) {
      return this.schemaCache.get(schemaName)!;
    }

    const schemaPath = join(this.schemasDir, schemaName);
    try {
      const content = readFileSync(schemaPath, 'utf8');
      const schema = parseJsonSafely<object>(content);
      this.schemaCache.set(schemaName, schema);
      return schema;
    } catch (error) {
      throw ForgeLoopStudioError.artifactUnreadable(schemaName, `Failed to load schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validate(schemaName: string, data: unknown): ValidationResult {
    try {
      const schema = this.loadSchema(schemaName);
      const validate = this.ajv.compile(schema);
      const valid = validate(data);

      if (!valid) {
        return {
          valid: false,
          errors: validate.errors?.map((e) => `${e.instancePath} ${e.message}`),
        };
      }

      return { valid: true };
    } catch (error) {
      if (error instanceof ForgeLoopStudioError) {
        throw error;
      }
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  validateOrThrow<T = unknown>(schemaName: string, data: unknown): T {
    const result = this.validate(schemaName, data);
    if (!result.valid) {
      throw ForgeLoopStudioError.artifactInvalid(schemaName, result.errors?.join('; ') || 'Unknown validation error');
    }
    return data as T;
  }
}

export function createValidator(schemasDir: string): SchemaValidator {
  return new SchemaValidator(schemasDir);
}