/**
 * Ambient type declarations for the public subpath of the bundled
 * @cassiomc1/forgeloop package (ForgeLoop 1.5.x). The package ships as plain
 * ESM JavaScript; the Studio consumes only this allowlisted surface so the
 * canonical semantic authority stays inside ForgeLoop.
 */
declare module '@cassiomc1/forgeloop/integration' {
  export interface ForgeLoopCommandClassification {
    command: string;
    riskClass: string;
    readOnly: boolean;
    mutatesProtocol: boolean;
    removesArtifacts: boolean;
    executesExternalProcess: boolean;
    affectsClaimAuthority: boolean;
    destructive: boolean;
    requiredCapability: string | null;
  }

  export interface ForgeLoopCapabilityEntry {
    name: string;
    scope: string;
  }

  export interface ForgeLoopCapabilities {
    packageVersion: string | null;
    protocolVersion: number;
    integrationApiVersion: number;
    executorParity: boolean;
    features: {
      taskClaimRecovery: {
        version: number;
        durableRecoveryState: boolean;
        explicitResume: boolean;
        validatedClaimProjection: boolean;
      };
    };
    commands: Array<Record<string, unknown>>;
    resources: ForgeLoopCapabilityEntry[];
  }

  export interface ForgeLoopIntegrationResource<T = unknown> {
    uri: string;
    taskId?: string | null;
    data: T;
  }

  export interface ForgeLoopExecutionOutcome<T = unknown> {
    ok: boolean;
    command: string;
    exitCode: number;
    result: T | null;
    error: { code: string; message: string } | null;
    metadata: Record<string, unknown> | null;
  }

  export const INTEGRATION_RISK_CLASSES: Readonly<{
    READ_ONLY: 'READ_ONLY';
    LOOP_MUTATION: 'LOOP_MUTATION';
    CLAIM_REACQUISITION: 'CLAIM_REACQUISITION';
    EXTERNAL_EXECUTION: 'EXTERNAL_EXECUTION';
    MAINTENANCE: 'MAINTENANCE';
    CLAIM_RELEASE_RECOVERY: 'CLAIM_RELEASE_RECOVERY';
    LEGACY_MIGRATION: 'LEGACY_MIGRATION';
    FORCE_DESTRUCTIVE: 'FORCE_DESTRUCTIVE';
  }>;

  export function getForgeLoopPackageVersion(): string;

  export function getForgeLoopCapabilities(options?: {
    packageVersion?: string | null;
  }): ForgeLoopCapabilities;

  export function classifyForgeLoopInvocation(
    command: string,
    input?: Record<string, unknown>,
  ): ForgeLoopCommandClassification;

  export function readForgeLoopIntegrationResource<T = Record<string, unknown>>(
    uri: string,
    options?: {
      projectPath?: string;
      packageRoot?: string;
      packageVersion?: string | null;
      taskId?: string | null;
    },
  ): Promise<ForgeLoopIntegrationResource<T>>;

  export function executeForgeLoopCommand<T = Record<string, unknown>>(options: {
    command: string;
    projectPath?: string;
    input?: Record<string, unknown>;
  }): Promise<ForgeLoopExecutionOutcome<T>>;

  export const FORGELOOP_INTEGRATION_API_VERSION: number;
}
