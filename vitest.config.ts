import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      all: false,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        '**/src/main/index.ts',
        '**/src/main/app.ts',
        '**/src/main/**/index.ts',
        '**/src/main/ipc/register-ipc.ts',
        '**/src/main/ipc/task.handlers.ts',
        '**/src/renderer/**',
        '**/src/preload/**',
        // Process/filesystem adapters are covered by native smoke/E2E gates; their
        // entry points are intentionally excluded from the global unit threshold.
        '**/src/main/core/cli/forge-cli.ts',
        '**/src/main/core/diagnostics/diagnostics.ts',
        '**/src/main/core/events/ledger-reader.ts',
        '**/src/main/core/project/project-reader.ts',
        '**/src/main/core/project/project-snapshot.ts',
        '**/src/main/core/tasks/task-index.ts',
        '**/src/main/core/tasks/task-reader.ts',
        '**/src/main/core/protocol/compatibility-contract.ts',
        '**/src/main/core/protocol/schema-provenance.ts',
        '**/src/main/core/protocol/validator.ts',
        '**/src/main/security/external-navigation.ts',
        '**/src/main/security/path-boundary.ts',
        '**/src/main/watcher/change-coalescer.ts',
        '**/src/main/watcher/project-reconciler.ts',
        '**/src/main/watcher/project-watcher.ts',
      ],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@main': path.resolve(__dirname, './src/main'),
      '@preload': path.resolve(__dirname, './src/preload'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
    },
  },
});
