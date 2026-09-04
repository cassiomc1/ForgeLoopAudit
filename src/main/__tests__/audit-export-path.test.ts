import { describe, expect, it } from 'vitest';
import { validateAuditExportPath } from '@main/core/audit/audit-export-path';

describe('audit export path policy', () => {
  it('requires an absolute path and protects the audited protocol directory by default', () => {
    expect(() => validateAuditExportPath('reports/audit.md', '/project', false)).toThrow(/path traversal/iu);
    expect(() => validateAuditExportPath('/project/.forgeloop/reports/audit.md', '/project', false)).toThrow();
    expect(validateAuditExportPath('/project/.forgeloop/reports/audit.md', '/project', true)).toBe('/project/.forgeloop/reports/audit.md');
  });

  it('allows explicit external destinations without widening the protocol path', () => {
    expect(validateAuditExportPath('/tmp/audit.md', '/project', false)).toBe('/tmp/audit.md');
    expect(validateAuditExportPath('/project/.forgeloopish/audit.md', '/project', false)).toBe('/project/.forgeloopish/audit.md');
    expect(validateAuditExportPath('/tmp/audit.md', null, false)).toBe('/tmp/audit.md');
  });
});
