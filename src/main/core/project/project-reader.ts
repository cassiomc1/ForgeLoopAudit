import { readFileSync, readdirSync, lstatSync, existsSync, openSync, readSync, closeSync, fstatSync } from 'fs';
import { join } from 'path';
import { ForgeLoopStudioError } from '@shared/errors';
import { parseJsonSafely } from '@main/security/resource-limits';
import { PathBoundary } from '@main/security/path-boundary';
import { CONFIG_FILE, SOURCES_FILE, TASK_STATE_DIR, SESSIONS_DIR, POLICY_DIR } from '@shared/constants';
import type { ProjectDetectionResult } from '@shared/domain';
import { checkProtocolCompatibility } from '@main/core/protocol/compatibility';
import { SchemaValidator } from '@main/core/protocol/validator';
import { ARTIFACT_SCHEMAS } from '@main/core/protocol/artifact-registry';

export interface ForgeLoopConfig {
  schemaVersion: number;
  protocolVersion: number;
  projectName?: string;
  complianceMode?: string;
}

export interface ForgeLoopSources {
  schemaVersion: number;
  protocolVersion: number;
  sources: Record<string, { kind: string; summary: string; status: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCanonicalArtifact(name: string, value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (name === 'task.json') return typeof value.taskId === 'string' && value.taskId.length > 0;
  if (name === 'work-state.json') return value.phase === undefined || typeof value.phase === 'string';
  if (name === 'policy.lock') return typeof value.digest === 'string' || typeof value.rulesDigest === 'string' || typeof value.baselineDigest === 'string';
  return true;
}

const SCHEMA_BY_FILE: Record<string, string> = {
  'config.json': ARTIFACT_SCHEMAS['config.json'],
  'sources.json': ARTIFACT_SCHEMAS['sources.json'],
  'task.json': ARTIFACT_SCHEMAS['task.json'],
  'contract.json': ARTIFACT_SCHEMAS['contract.json'],
  'routing-result.json': ARTIFACT_SCHEMAS['routing-result.json'],
  'preflight.json': ARTIFACT_SCHEMAS['preflight.json'],
  'work-state.json': ARTIFACT_SCHEMAS['work-state.json'],
  'continuity.json': ARTIFACT_SCHEMAS['continuity.json'],
  'recovery.json': ARTIFACT_SCHEMAS['recovery.json'],
  'execution-receipt.json': ARTIFACT_SCHEMAS['execution-receipt.json'],
  'session.json': ARTIFACT_SCHEMAS['session.json'],
  'policy-snapshot.json': ARTIFACT_SCHEMAS['policy-snapshot.json'],
  'rules.json': ARTIFACT_SCHEMAS['policy/rules.json'],
  'discovery.json': ARTIFACT_SCHEMAS['policy/discovery.json'],
  'baseline.json': ARTIFACT_SCHEMAS['policy/baseline.json'],
  'policy.lock': ARTIFACT_SCHEMAS['policy/policy.lock'],
};

const TASK_JSON_ARTIFACTS = new Set([
  'task.json',
  'contract.json',
  'routing-result.json',
  'preflight.json',
  'work-state.json',
  'continuity.json',
  'recovery.json',
  'execution-receipt.json',
  'policy-snapshot.json',
]);

export class ProjectDetector {
  constructor(
    private readonly pathBoundary: PathBoundary,
    private readonly validator: SchemaValidator
  ) {}

  detect(): ProjectDetectionResult {
    const projectRoot = this.pathBoundary.getProjectRoot();
    let forgeLoopRoot: string;
    let config: ForgeLoopConfig;
    try {
      forgeLoopRoot = this.pathBoundary.validateForgeLoopPath('');
      const configPath = this.pathBoundary.validateForgeLoopPath(CONFIG_FILE);
      const content = readFileSync(configPath, 'utf8');
      config = parseJsonSafely<ForgeLoopConfig>(content);
      const validation = this.validator.validate(ARTIFACT_SCHEMAS['config.json'], config);
      if (!validation.valid) {
        throw ForgeLoopStudioError.artifactInvalid(CONFIG_FILE, validation.errors?.join('; ') || 'Config schema validation failed');
      }
    } catch (error) {
      if (error instanceof ForgeLoopStudioError) throw error;
      throw ForgeLoopStudioError.artifactInvalid(CONFIG_FILE, `Failed to parse config: ${error instanceof Error ? error.message : String(error)}`);
    }

    const protocolResult = checkProtocolCompatibility({
      protocolVersion: config.protocolVersion,
      schemaVersion: config.schemaVersion,
      compatible: true,
    });

    const warnings: string[] = [];
    if (!protocolResult.compatible) {
      warnings.push(`Protocol version ${config.protocolVersion} may have limited support`);
    }

    return {
      projectRoot,
      forgeLoopRoot,
      protocolVersion: config.protocolVersion,
      schemaVersion: config.schemaVersion,
      compatible: protocolResult.compatible,
      warnings,
      projectKind: 'PROJECT',
    };
  }
}

export class ProjectReader {
  private readonly forgeLoopRoot: string;
  private readonly validator: SchemaValidator;
  private readonly artifactErrors = new Map<string, string[]>();
  private readonly lastValidArtifacts = new Map<string, Record<string, unknown>>();

  constructor(
    private readonly pathBoundary: PathBoundary,
    validator: SchemaValidator
  ) {
    this.forgeLoopRoot = pathBoundary.validateForgeLoopPath('');
    this.validator = validator;
  }

  getArtifactErrors(taskKey: string): string[] {
    return [...(this.artifactErrors.get(taskKey) || [])];
  }

  private validateArtifact(name: string, value: unknown): { value?: unknown; error?: string } {
    const schemaName = SCHEMA_BY_FILE[name];
    if (this.validator && schemaName && this.validator.hasSchema(schemaName)) {
      const result = this.validator.validate(schemaName, value);
      if (!result.valid) return { error: `${name}: ${result.errors?.join('; ') || 'schema validation failed'}` };
      return { value };
    }
    if (!isCanonicalArtifact(name, value)) return { error: `${name}: canonical artifact shape is invalid` };
    return { value };
  }

  readConfig(): ForgeLoopConfig {
    const configPath = join(this.forgeLoopRoot, CONFIG_FILE);
    const validatedPath = this.pathBoundary.validatePath(configPath);
    const content = readFileSync(validatedPath, 'utf8');
    const config = parseJsonSafely<ForgeLoopConfig>(content);
    const validated = this.validateArtifact('config.json', config);
    if (validated.error) throw ForgeLoopStudioError.artifactInvalid(CONFIG_FILE, validated.error);
    if (typeof config.protocolVersion !== 'number' || typeof config.schemaVersion !== 'number') {
      throw ForgeLoopStudioError.artifactInvalid(CONFIG_FILE, 'Config does not satisfy the canonical protocol shape');
    }
    return config;
  }

  readSources(): ForgeLoopSources {
    const sourcesPath = join(this.forgeLoopRoot, SOURCES_FILE);
    const validatedPath = this.pathBoundary.validatePath(sourcesPath);
    const content = readFileSync(validatedPath, 'utf8');
    const sources = parseJsonSafely<ForgeLoopSources>(content);
    const validated = this.validateArtifact('sources.json', sources);
    if (validated.error) throw ForgeLoopStudioError.artifactInvalid(SOURCES_FILE, validated.error);
    return validated.value as ForgeLoopSources;
  }

  listTaskKeys(): string[] {
    const taskStateDir = join(this.forgeLoopRoot, TASK_STATE_DIR);
    if (!existsSync(taskStateDir)) {
      return [];
    }

    const entries = readdirSync(taskStateDir);
    return entries.filter((entry) => {
      const fullPath = join(taskStateDir, entry);
      try {
        return lstatSync(fullPath).isDirectory() && this.pathBoundary.validatePath(fullPath) !== '';
      } catch {
        return false;
      }
    });
  }

  readTaskSummaryArtifacts(taskKey: string): Record<string, unknown> {
    return this.readTaskArtifactsForSummary(taskKey);
  }

  readTaskDescriptor(taskKey: string): Record<string, unknown> {
    const taskPath = join(this.forgeLoopRoot, TASK_STATE_DIR, taskKey, 'task.json');
    const stat = lstatSync(taskPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw ForgeLoopStudioError.artifactInvalid('task.json', 'Symbolic links and non-file descriptors are not allowed');
    const parsed = parseJsonSafely(readFileSync(this.pathBoundary.validatePath(taskPath), 'utf8'));
    const validated = this.validateArtifact('task.json', parsed);
    if (validated.error) throw ForgeLoopStudioError.artifactInvalid('task.json', validated.error);
    return validated.value as Record<string, unknown>;
  }

  private readTaskArtifactsForSummary(taskKey: string): Record<string, unknown> {
    const taskDir = join(this.forgeLoopRoot, TASK_STATE_DIR, taskKey);
    const validatedPath = this.pathBoundary.validatePath(taskDir);

    if (!existsSync(validatedPath)) {
      throw ForgeLoopStudioError.artifactUnreadable(`task-state/${taskKey}`, 'Task directory not found');
    }

    const artifacts: Record<string, unknown> = {};
    const errors: string[] = [];
    const entries = readdirSync(validatedPath);

    for (const entry of entries) {
      const filePath = join(validatedPath, entry);
      if (!entry.endsWith('.json')) continue;
      if (entry.endsWith('.json') && !TASK_JSON_ARTIFACTS.has(entry)) continue;
      try {
        const stat = lstatSync(filePath);
        if (!stat.isFile() || stat.isSymbolicLink()) {
          errors.push(`${entry}: symbolic links and non-file artifacts are not allowed`);
          continue;
        }
        const safePath = this.pathBoundary.validatePath(filePath);
        const content = readFileSync(safePath, 'utf8');
        if (entry.endsWith('.json')) {
          const parsed = parseJsonSafely(content);
          const validated = this.validateArtifact(entry, parsed);
          if (validated.error) errors.push(validated.error);
          else artifacts[entry] = validated.value;
        } else {
          artifacts[entry] = content;
        }
      } catch (error) {
        errors.push(`${entry}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (errors.length > 0) {
      const previous = this.lastValidArtifacts.get(taskKey);
      if (previous) {
        for (const [name, value] of Object.entries(previous)) {
          if (artifacts[name] === undefined) artifacts[name] = value;
        }
      }
      artifacts.artifactErrors = errors;
      this.artifactErrors.set(taskKey, errors);
    } else {
      this.lastValidArtifacts.set(taskKey, { ...artifacts });
      this.artifactErrors.delete(taskKey);
    }

    return artifacts;
  }

  listSessions(): string[] {
    const sessionsDir = join(this.forgeLoopRoot, SESSIONS_DIR);
    if (!existsSync(sessionsDir)) {
      return [];
    }

    return readdirSync(sessionsDir)
      .filter((entry) => {
        if (!entry.endsWith('.json')) return false;
        try {
          const candidate = join(sessionsDir, entry);
          return lstatSync(candidate).isFile() && !lstatSync(candidate).isSymbolicLink() && Boolean(this.pathBoundary.validatePath(candidate));
        } catch { return false; }
      })
      .map((entry) => entry.replace('.json', ''));
  }

  readSession(sessionId: string): Record<string, unknown> {
    const sessionPath = join(this.forgeLoopRoot, SESSIONS_DIR, `${sessionId}.json`);
    const validatedPath = this.pathBoundary.validatePath(sessionPath);
    const content = readFileSync(validatedPath, 'utf8');
    const parsed = parseJsonSafely(content);
    const validated = this.validateArtifact('session.json', parsed);
    if (validated.error) throw ForgeLoopStudioError.artifactInvalid('session.json', validated.error);
    return validated.value as Record<string, unknown>;
  }

  readEventPreview(taskKey: string, maxBytes = 64 * 1024): string {
    const eventPath = this.pathBoundary.resolveForgeLoopPathLexically(join(TASK_STATE_DIR, taskKey, 'events.ndjson'));
    if (!existsSync(eventPath)) return '';
    if (lstatSync(eventPath).isSymbolicLink()) throw ForgeLoopStudioError.artifactInvalid('events.ndjson', 'Symbolic links are not allowed');
    const validatedPath = this.pathBoundary.validatePath(eventPath);
    const fd = openSync(validatedPath, 'r');
    const size = fstatSync(fd).size;
    const bounded = Math.max(1024, maxBytes);
    const headBytes = Math.min(size, Math.floor(bounded / 2));
    const tailBytes = Math.min(size - headBytes, Math.floor(bounded / 2));
    const headBuffer = Buffer.alloc(headBytes);
    const tailBuffer = Buffer.alloc(tailBytes);
    try {
      readSync(fd, headBuffer, 0, headBuffer.length, 0);
      if (tailBytes > 0) readSync(fd, tailBuffer, 0, tailBuffer.length, size - tailBytes);
    } finally { closeSync(fd); }
    if (size <= bounded) return Buffer.concat([headBuffer, tailBuffer]).toString('utf8');
    const head = headBuffer.toString('utf8');
    const tail = tailBuffer.toString('utf8');
    return `${head}\n... [Truncated preview] ...\n${tail}`;
  }

  readPolicySnapshot(taskKey: string): Record<string, unknown> | null {
    const policyDir = this.pathBoundary.resolveForgeLoopPathLexically(join(TASK_STATE_DIR, taskKey));
    if (!existsSync(policyDir)) {
      return null;
    }

    const snapshotPath = join(policyDir, 'policy-snapshot.json');
    if (!existsSync(snapshotPath)) {
      return null;
    }

    if (lstatSync(snapshotPath).isSymbolicLink()) throw ForgeLoopStudioError.artifactInvalid('policy-snapshot.json', 'Symbolic links are not allowed');
    const validatedPath = this.pathBoundary.validatePath(snapshotPath);
    const parsed = parseJsonSafely(readFileSync(validatedPath, 'utf8'));
    const validated = this.validateArtifact('policy-snapshot.json', parsed);
    if (validated.error) throw ForgeLoopStudioError.artifactInvalid('policy-snapshot.json', validated.error);
    return validated.value as Record<string, unknown>;
  }

  readGlobalPolicy(): Record<string, unknown> {
    const policyRoot = this.pathBoundary.resolveForgeLoopPathLexically(POLICY_DIR);
    const result: Record<string, unknown> = {};
    if (!existsSync(policyRoot)) return result;
    for (const name of ['rules.json', 'discovery.json', 'baseline.json', 'policy.lock']) {
      const candidate = join(policyRoot, name);
      if (!existsSync(candidate)) continue;
      try {
        const stat = lstatSync(candidate);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('symbolic links and non-file artifacts are not allowed');
        const parsed = parseJsonSafely(readFileSync(this.pathBoundary.validatePath(candidate), 'utf8'));
        const validated = this.validateArtifact(name, parsed);
        result[name] = validated.error ? { _invalid: true, _schemaInvalid: true, _error: validated.error } : validated.value;
      } catch { result[name] = { _invalid: true }; }
    }
    return result;
  }
}

export function createProjectDetector(pathBoundary: PathBoundary, validator: SchemaValidator): ProjectDetector {
  return new ProjectDetector(pathBoundary, validator);
}

export function createProjectReader(pathBoundary: PathBoundary, validator: SchemaValidator): ProjectReader {
  return new ProjectReader(pathBoundary, validator);
}
