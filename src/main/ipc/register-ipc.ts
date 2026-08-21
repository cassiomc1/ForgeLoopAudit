import { BrowserWindow } from 'electron';
import { registerProjectIpc, updateProjectIpcWindow } from './project.handlers';
import { registerTaskIpc } from './task.handlers';
import { registerWindowIpc } from './window.handlers';

export function registerIpc(mainWindow: BrowserWindow): void {
  registerProjectIpc(mainWindow);
  registerTaskIpc();
  registerWindowIpc(() => mainWindow);
}

export { updateProjectIpcWindow };
