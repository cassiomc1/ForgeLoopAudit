import { ForgeLoopStudioError } from '@shared/errors';

export function assertTrustedSender(senderUrl: string, isPackaged: boolean, expectedUrl?: string): void {
  const allowed = isPackaged
    ? senderUrl === expectedUrl && senderUrl.startsWith('file://')
    : senderUrl.startsWith('http://localhost:5173/');
  if (!allowed) throw ForgeLoopStudioError.unknown('Untrusted IPC sender');
}
