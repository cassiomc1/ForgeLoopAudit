import { describe, expect, it } from 'vitest';
import { assertTrustedSender } from '@main/security/sender-policy';

describe('IPC sender policy', () => {
  it('accepts only the owned renderer origin', () => {
    expect(() => assertTrustedSender('http://localhost:5173/index.html', false)).not.toThrow();
    expect(() => assertTrustedSender('file:///app/dist/index.html', true, 'file:///app/dist/index.html')).not.toThrow();
  });
  it('rejects foreign and malformed origins', () => {
    expect(() => assertTrustedSender('https://evil.example', false)).toThrow();
    expect(() => assertTrustedSender('file:///tmp/evil.html', true, 'file:///app/index.html')).toThrow();
  });
});
