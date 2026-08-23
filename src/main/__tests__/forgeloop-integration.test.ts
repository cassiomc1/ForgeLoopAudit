import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createForgeLoopIntegration } from '@main/core/integration/forgeloop-integration';
import { ForgeLoopStudioError } from '@shared/errors';

describe('core/integration/forgeloop-integration', () => {
  let adapter: ReturnType<typeof createForgeLoopIntegration>;
  let scratchDir: string;

  beforeEach(() => {
    adapter = createForgeLoopIntegration();
    scratchDir = mkdtempSync(join(tmpdir(), 'forgeloop-integration-test-'));
  });

  afterEach(() => {
    rmSync(scratchDir, { recursive: true, force: true });
  });

  describe('package identity', () => {
    it('exposes the bundled ForgeLoop package version', () => {
      expect(adapter.getPackageVersion()).toBe('1.5.0');
    });
  });

  describe('capabilities', () => {
    it('reports Integration API v1 with protocol v1', () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities.integrationApiVersion).toBe(1);
      expect(capabilities.protocolVersion).toBe(1);
      expect(capabilities.executorParity).toBe(true);
    });

    it('declares durable recovery features required by the Studio', () => {
      const recovery = adapter.getCapabilities().features.taskClaimRecovery;
      expect(recovery.version).toBe(1);
      expect(recovery.durableRecoveryState).toBe(true);
      expect(recovery.explicitResume).toBe(true);
      expect(recovery.validatedClaimProjection).toBe(true);
    });

    it('exposes every canonical resource the Studio consumes', () => {
      const resources = adapter.getCapabilities().resources;
      for (const required of [
        'protocol/info',
        'project/tasks',
        'task/status',
        'task/ownership',
        'task/contract',
        'task/continuity',
      ]) {
        expect(resources).toContain(required);
      }
    });
  });

  describe('readProtocolInfo', () => {
    it('reads compatibility.schemaVersion from the canonical resource', async () => {
      const protocolInfo = await adapter.readProtocolInfo(scratchDir);
      expect(protocolInfo.compatibility).toBeDefined();
      expect((protocolInfo.compatibility as Record<string, unknown>).schemaVersion).toBe(1);
    });

    it('never exposes a top-level schemaVersion field', async () => {
      const protocolInfo = await adapter.readProtocolInfo(scratchDir);
      expect(protocolInfo.schemaVersion).toBeUndefined();
    });
  });

  describe('read-only invocation guard', () => {
    async function expectRefusal(promise: Promise<unknown>): Promise<void> {
      const outcome = await promise.then(
        () => null,
        (error: unknown) => error,
      );
      expect(outcome).toBeInstanceOf(ForgeLoopStudioError);
      expect((outcome as ForgeLoopStudioError).details).toMatch(/refuses non-read-only ForgeLoop invocation/);
    }

    it('rejects claim reacquisition via task-resume', async () => {
      await expectRefusal(adapter.executeReadOnly(scratchDir, 'task-resume'));
    });

    it('rejects claim release recovery via task-recover', async () => {
      await expectRefusal(adapter.executeReadOnly(scratchDir, 'task-recover'));
    });

    it('rejects external execution via run-check', async () => {
      await expectRefusal(adapter.executeReadOnly(scratchDir, 'run-check'));
    });

    it('rejects loop mutation via advance', async () => {
      await expectRefusal(adapter.executeReadOnly(scratchDir, 'advance'));
    });

    it('rejects maintenance via init even with benign input', async () => {
      await expectRefusal(adapter.executeReadOnly(scratchDir, 'init', {}));
    });

    it('rejects unknown commands instead of forwarding them', async () => {
      await expect(adapter.executeReadOnly(scratchDir, 'totally-made-up-command')).rejects.toThrow(
        ForgeLoopStudioError,
      );
    });

    it('accepts the read-only next command and preserves canonical result shape', async () => {
      const result = await adapter.executeReadOnly<Record<string, unknown>>(scratchDir, 'next');
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.protocolVersion).toBe(1);
      expect(typeof result.ok).toBe('boolean');
    });

    it('accepts other allowlisted read-only commands', async () => {
      const result = await adapter.executeReadOnly<Record<string, unknown>>(scratchDir, 'validate-state');
      expect(result.metadata).toBeDefined();
    });

    it('preserves canonical ForgeLoop error codes on unsupported programmatic commands', async () => {
      const result = await adapter.executeReadOnly<Record<string, unknown>>(scratchDir, 'protocol-info');
      expect(result.ok).toBe(true);
    });
  });

  describe('resource readers', () => {
    it('lists tasks through the canonical projection', async () => {
      const list = await adapter.listTasks(scratchDir);
      expect(list.count).toBe(0);
      expect(list.tasks).toEqual([]);
    });

    it('fails closed to INCONSISTENT ownership for unknown tasks', async () => {
      const ownership = await adapter.readTaskOwnership(scratchDir, 'missing-task');
      expect(ownership.claimState).toBe('INCONSISTENT');
      expect(ownership.ownershipValid).toBe(false);
      expect(ownership.mutationAllowed).toBe(false);
      expect(ownership.reasonCodes).toContain('E_TASK_NOT_FOUND');
      await expect(adapter.readTaskStatus(scratchDir, 'missing-task')).rejects.toThrow();
    });
  });
});
