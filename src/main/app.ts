import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { registerIpc } from './ipc/register-ipc';
import { IPC_CHANNELS } from '@shared/ipc';

let mainWindow: BrowserWindow | null = null;
const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
      preload: join(__dirname, '../preload/index.js'),
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
    shell.openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
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
  mainWindow = createWindow();
  registerIpc(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      registerIpc(mainWindow);
    }
  });
});

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