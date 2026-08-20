import { BrowserWindow } from 'electron';
import { registerProjectIpc } from './project.handlers';
import { registerTaskIpc } from './task.handlers';

export function registerIpc(mainWindow: BrowserWindow): void {
  registerProjectIpc(mainWindow);
  registerTaskIpc();
}