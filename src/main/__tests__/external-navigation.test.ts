import { describe, expect, it } from 'vitest';
import { classifyExternalUrl } from '@main/security/external-navigation';

describe('external navigation policy', () => {
  it('allows only approved HTTPS hosts', () => {
    expect(classifyExternalUrl('https://github.com/cassiomc1/ForgeLoop').allowed).toBe(true);
  });
  it('rejects dangerous protocols and unknown hosts', () => {
    expect(classifyExternalUrl('javascript:alert(1)').allowed).toBe(false);
    expect(classifyExternalUrl('file:///etc/passwd').allowed).toBe(false);
    expect(classifyExternalUrl('https://example.com').reason).toBe('HOST_DENIED');
  });
});
