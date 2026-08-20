import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { ForgeLoopStudioError } from '@shared/errors';
import { parseJsonSafely } from '@main/security/resource-limits';
import { PathBoundary } from '@main/security/path-boundary';
import { FORGELOOP_DIR_NAME, CONFIG_FILE, SOURCES_FILE, TASK_STATE_DIR, SESSIONS_DIR, POLICY_DIR } from '@shared/constants';
import type { ProjectDetectionResult } from '@shared/domain';
import { checkProtocolCompatibility } from '@main/core/protocol/compatibility';

export interface ForgeLoopConfig {
  schemaVersion: number;
  protocolVersion: number;
  projectName?: string;
}

export interface ForgeLoopSources {
  schemaVersion: number;
  protocolVersion: number;
  sources: Record<string, { kind: string; summary: string; status: string }>;
}

export class ProjectDetector {
  detect(projectRoot: string): ProjectDetectionResult {
    const forgeLoopRoot = join(projectRoot, FORGELOOP_DIR_NAME);

    if (!existsSync(forgeLoopRoot) || !statSync(forgeLoopRoot).isDirectory()) {
      throw ForgeLoopStudioError.projectNotForgeLoop(projectRoot);
    }

    const configPath = join(forgeLoopRoot, CONFIG_FILE);
    if (!existsSync(configPath)) {
      throw ForgeLoopStudioError.artifactUnreadable(CONFIG_FILE, 'Config file not found');
    }

    let config: ForgeLoopConfig;
    try {
      const content = readFileSync(configPath, 'utf8');
      config = parseJsonSafely<ForgeLoopConfig>(content);
    } catch (error) {
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
    };
  }
}

export class ProjectReader {
  private readonly forgeLoopRoot: string;

  constructor(
    private readonly pathBoundary: PathBoundary
  ) {
    this.forgeLoopRoot = pathBoundary.validateForgeLoopPath('');
  }

  readConfig(): ForgeLoopConfig {
    const configPath = join(this.forgeLoopRoot, CONFIG_FILE);
    const validatedPath = this.pathBoundary.validatePath(configPath);
    const content = readFileSync(validatedPath, 'utf8');
    return parseJsonSafely<ForgeLoopConfig>(content);
  }

  readSources(): ForgeLoopSources {
    const sourcesPath = join(this.forgeLoopRoot, SOURCES_FILE);
    const validatedPath = this.pathBoundary.validatePath(sourcesPath);
    const content = readFileSync(validatedPath, 'utf8');
    return parseJsonSafely<ForgeLoopSources>(content);
  }

  listTaskKeys(): string[] {
    const taskStateDir = join(this.forgeLoopRoot, TASK_STATE_DIR);
    if (!existsSync(taskStateDir)) {
      return [];
    }

    const entries = readdirSync(taskStateDir);
    return entries.filter((entry) => {
      const fullPath = join(taskStateDir, entry);
      return statSync(fullPath).isDirectory();
    });
  }

  readTaskArtifacts(taskKey: string): Record<string, unknown> {
    const taskDir = join(this.forgeLoopRoot, TASK_STATE_DIR, taskKey);
    const validatedPath = this.pathBoundary.validatePath(taskDir);

    if (!existsSync(validatedPath)) {
      throw ForgeLoopStudioError.artifactUnreadable(`task-state/${taskKey}`, 'Task directory not found');
    }

    const artifacts: Record<string, unknown> = {};
    const entries = readdirSync(validatedPath);

    for (const entry of entries) {
      const filePath = join(validatedPath, entry);
      if (statSync(filePath).isFile() && (entry.endsWith('.json') || entry.endsWith('.ndjson'))) {
        try {
          const content = readFileSync(filePath, 'utf8');
          if (entry.endsWith('.json')) {
            artifacts[entry] = parseJsonSafely(content);
          } else {
            artifacts[entry] = content;
          }
        } catch (error) {
          artifacts[entry] = { _parseError: error instanceof Error ? error.message : String(error) };
        }
      }
    }

    return artifacts;
  }

  listSessions(): string[] {
    const sessionsDir = join(this.forgeLoopRoot, SESSIONS_DIR);
    if (!existsSync(sessionsDir)) {
      return [];
    }

    return readdirSync(sessionsDir)
      .filter((entry) => entry.endsWith('.json'))
      .map((entry) => entry.replace('.json', ''));
  }

  readSession(sessionId: string): Record<string, unknown> {
    const sessionPath = join(this.forgeLoopRoot, SESSIONS_DIR, `${sessionId}.json`);
    const validatedPath = this.pathBoundary.validatePath(sessionPath);
    const content = readFileSync(validatedPath, 'utf8');
    return parseJsonSafely(content);
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

    const validatedPath = this.pathBoundary.validatePath(snapshotPath);
    const content = readFileSync(validatedPath, 'utf8');
    return parseJsonSafely(content);
  }

  readGlobalPolicy(): Record<string, unknown> {
    const policyRoot = this.pathBoundary.resolveForgeLoopPathLexically(POLICY_DIR);
    const result: Record<string, unknown> = {};
    if (!existsSync(policyRoot)) return result;
    for (const name of ['rules.json', 'discovery.json', 'baseline.json', 'policy.lock']) {
      const candidate = join(policyRoot, name);
      if (!existsSync(candidate)) continue;
      try { result[name] = parseJsonSafely(readFileSync(this.pathBoundary.validatePath(candidate), 'utf8')); } catch { result[name] = { _invalid: true }; }
    }
    return result;
  }
}

export function createProjectDetector(_pathBoundary: PathBoundary): ProjectDetector {
  return new ProjectDetector();
}

export function createProjectReader(pathBoundary: PathBoundary): ProjectReader {
  return new ProjectReader(pathBoundary);
}
