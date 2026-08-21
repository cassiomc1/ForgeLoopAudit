import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PathBoundary } from '@main/security/path-boundary';
import { ProjectReader } from '@main/core/project/project-reader';
import { SchemaValidator } from '@main/core/protocol/validator';

const validRoot = 'tests/fixtures/protocol-valid';
const invalidRoot = 'tests/fixtures/protocol-invalid';

describe('ForgeLoop conformance fixtures', () => {
  it('loads every generated valid protocol fixture through Studio readers', () => {
    for (const name of readdirSync(validRoot)) {
      const fixtureRoot = join(validRoot, name);
      const metadata = JSON.parse(readFileSync(join(fixtureRoot, 'fixture.json'), 'utf8')) as {
        expectedPhase: string;
        expectedStudioHealth: string;
      };
      const reader = new ProjectReader(new PathBoundary(fixtureRoot), new SchemaValidator('schemas'));
      expect(reader.readConfig().protocolVersion).toBe(1);
      expect(reader.listTaskKeys()).toHaveLength(1);
      const taskKey = reader.listTaskKeys()[0];
      const artifacts = reader.readTaskSummaryArtifacts(taskKey);
      expect(reader.getArtifactErrors(taskKey), name).toEqual([]);
      expect(artifacts['work-state.json']).toBeDefined();
      expect(metadata.expectedPhase).toMatch(/^[A-Z_]+$/);
      expect(metadata.expectedStudioHealth).toBe('VALID');
    }
  });

  it('rejects every generated invalid protocol fixture with an actionable read error', () => {
    for (const name of readdirSync(invalidRoot)) {
      const fixtureRoot = join(invalidRoot, name);
      const reader = new ProjectReader(new PathBoundary(fixtureRoot), new SchemaValidator('schemas'));
      expect(() => reader.readConfig()).toThrow();
    }
  });
});
