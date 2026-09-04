import { ForgeLoopAuditError } from '@shared/errors';

export function assertTrustedSender(senderUrl: string, isPackaged: boolean, expectedUrl?: string): void {
  const allowed = isPackaged
    ? senderUrl === expectedUrl && senderUrl.startsWith('file://')
    : senderUrl.startsWith('http://localhost:5173/') || (senderUrl.startsWith('file://') && senderUrl === expectedUrl);
  if (!allowed) throw ForgeLoopAuditError.unknown('Untrusted IPC sender');
}
