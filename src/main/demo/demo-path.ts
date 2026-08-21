import { existsSync } from 'fs';
import { join } from 'path';

export interface BundledDemoContext {
  isPackaged: boolean;
  appPath: string;
  resourcesPath?: string;
}

/**
 * Resolves the bundled ForgeShop demo project that ships with Studio.
 *
 * Development builds read the repository-local `demo/` directory; packaged
 * builds read the copy emitted by electron-builder's `extraResources` into the
 * application resources directory. The resolved path is returned only when it
 * contains a real `.forgeloop/config.json`, and it is then opened through the
 * same ProjectDetector/PathBoundary/SchemaValidator pipeline as any
 * user-selected project — the demo never bypasses security boundaries.
 */
export function resolveBundledDemoPath(context: BundledDemoContext): string | null {
  const candidates = [
    context.isPackaged && context.resourcesPath ? join(context.resourcesPath, 'demo') : undefined,
    join(context.appPath, 'demo'),
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find((candidate) => existsSync(join(candidate, '.forgeloop', 'config.json'))) ?? null;
}
