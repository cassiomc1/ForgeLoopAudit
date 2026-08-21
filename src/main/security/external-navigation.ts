export type ExternalUrlDecision = {
  allowed: boolean;
  normalized?: string;
  reason?: 'MALFORMED' | 'PROTOCOL_DENIED' | 'HOST_DENIED';
};

const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com', 'forgeloop.dev']);

export function classifyExternalUrl(raw: string): ExternalUrlDecision {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return { allowed: false, reason: 'PROTOCOL_DENIED' };
    if (ALLOWED_HOSTS.size > 0 && !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
      return { allowed: false, reason: 'HOST_DENIED' };
    }
    return { allowed: true, normalized: url.toString() };
  } catch {
    return { allowed: false, reason: 'MALFORMED' };
  }
}

export function openExternalIfAllowed(raw: string, openExternal: (url: string) => void): boolean {
  const decision = classifyExternalUrl(raw);
  if (!decision.allowed || !decision.normalized) return false;
  openExternal(decision.normalized);
  return true;
}
