import { resolve, normalize, relative, isAbsolute, sep } from 'path';
import { realpathSync, existsSync } from 'fs';
import { ForgeLoopStudioError } from '@shared/errors';

export class PathBoundary {
  private readonly projectRoot: string;
  private readonly realProjectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = normalize(resolve(projectRoot));
    if (!existsSync(this.projectRoot)) {
      throw ForgeLoopStudioError.projectNotForgeLoop(projectRoot);
    }
    this.realProjectRoot = realpathSync(this.projectRoot);
  }

  getProjectRoot(): string {
    return this.projectRoot;
  }

  getRealProjectRoot(): string {
    return this.realProjectRoot;
  }

  validatePath(requestedPath: string): string {
    const absoluteRequested = isAbsolute(requestedPath)
      ? requestedPath
      : resolve(this.projectRoot, requestedPath);

    const normalizedRequested = normalize(absoluteRequested);

    if (!existsSync(normalizedRequested)) {
      throw ForgeLoopStudioError.unknown(`Path does not exist: ${normalizedRequested}`);
    }

    const realRequested = realpathSync(normalizedRequested);
    const relativePath = relative(this.realProjectRoot, realRequested);

    if (relativePath.startsWith('..') || relativePath.includes(`${sep}..${sep}`) || relativePath === '..') {
      throw ForgeLoopStudioError.pathBoundaryViolation(requestedPath, this.projectRoot);
    }

    if (realRequested === this.realProjectRoot) {
      return realRequested;
    }

    const allowedPrefixes = [
      '.forgeloop/',
      '.forgeloop' + sep,
      '.git/HEAD',
      '.git/refs/',
    ];

    const isAllowed = allowedPrefixes.some((prefix) => relativePath.startsWith(prefix));

    if (!isAllowed) {
      throw ForgeLoopStudioError.pathBoundaryViolation(requestedPath, this.projectRoot);
    }

    return realRequested;
  }

  validateForgeLoopPath(relativePath: string): string {
    const fullPath = resolve(this.projectRoot, FORGELOOP_DIR_NAME, relativePath);
    return this.validatePath(fullPath);
  }

  isWithinProject(path: string): boolean {
    try {
      this.validatePath(path);
      return true;
    } catch {
      return false;
    }
  }
}

export const FORGELOOP_DIR_NAME = '.forgeloop';

export function createPathBoundary(projectRoot: string): PathBoundary {
  return new PathBoundary(projectRoot);
}

export function normalizePath(path: string): string {
  return normalize(resolve(path));
}

export function isPathWithinBoundary(path: string, boundary: string): boolean {
  try {
    if (!existsSync(path) || !existsSync(boundary)) {
      return false;
    }
    const realPath = realpathSync(normalize(resolve(path)));
    const realBoundary = realpathSync(normalize(resolve(boundary)));
    const relativePath = relative(realBoundary, realPath);
    return !relativePath.startsWith('..') && !relativePath.includes(`${sep}..${sep}`);
  } catch {
    return false;
  }
}