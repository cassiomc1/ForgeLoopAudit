import { app, BrowserWindow, session, shell } from 'electron';
import { join } from 'path';
import { registerIpc, updateProjectIpcWindow } from './ipc/register-ipc';
import { IPC_CHANNELS } from '@shared/ipc';

let mainWindow: BrowserWindow | null = null;
let ipcRegistered = false;
const isDevelopment = (process.env.NODE_ENV === 'development' || !app.isPackaged) && process.env.FORGELOOP_STUDIO_SMOKE !== '1';

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: join(__dirname, '../preload/index.cjs'),
      devTools: isDevelopment,
    },
    show: false,
    backgroundColor: '#09090B',
  });

  window.on('ready-to-show', () => {
    window.show();
    if (isDevelopment) {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  });

  window.on('closed', () => {
    mainWindow = null;
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openAllowedExternalUrl(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault();
      openAllowedExternalUrl(url);
    }
  });

  if (isDevelopment) {
    window.loadURL('http://localhost:5173');
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  mainWindow = createWindow();
  if (!ipcRegistered) {
    registerIpc(mainWindow);
    ipcRegistered = true;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      updateProjectIpcWindow(mainWindow);
    }
  });
});

function openAllowedExternalUrl(raw: string): void {
  try {
    if (new URL(raw).protocol === 'https:') void shell.openExternal(raw);
  } catch { /* reject malformed URLs */ }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.ERROR, {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      recoverable: false,
      details: error.message,
    });
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.ERROR, {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      recoverable: true,
      details: reason instanceof Error ? reason.message : String(reason),
    });
  }
});
