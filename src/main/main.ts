import { app, BrowserWindow, ipcMain, protocol, net } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULTS, IPC_CHANNELS } from '../shared/constants';
import type { IpcResult } from '../shared/types';
import { parseCliArgs } from './cli-args';
import type { AppConfig } from './cli-args';
import { registerIpcHandlers } from './ipc-handlers';
import { startFileWatcher } from './file-watcher';
import { loadWindowState, saveWindowState } from './window-state';

// Must be called before app.ready — registers custom protocol for serving local images
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
    },
  },
]);

let appConfig: AppConfig;
let fileWatcher: ReturnType<typeof startFileWatcher> | null = null;
let savedSidebarWidth: number = DEFAULTS.SIDEBAR_WIDTH;
let savedZoomLevel: number = 0;

const initDirectory = (dir: string): void => {
  fileWatcher?.close();
  fileWatcher = startFileWatcher(dir);
};

const createWindow = (): BrowserWindow => {
  const savedState = appConfig.directory ? loadWindowState(appConfig.directory) : null;

  if (savedState) {
    savedSidebarWidth = savedState.sidebarWidth;
    savedZoomLevel = savedState.zoomLevel;
  }

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: savedState?.width ?? DEFAULTS.WINDOW_WIDTH,
    height: savedState?.height ?? DEFAULTS.WINDOW_HEIGHT,
    minWidth: DEFAULTS.MIN_WINDOW_WIDTH,
    minHeight: DEFAULTS.MIN_WINDOW_HEIGHT,
    vibrancy: 'sidebar',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };

  if (savedState) {
    windowOptions.x = savedState.x;
    windowOptions.y = savedState.y;
  } else {
    windowOptions.center = true;
  }

  const mainWindow = new BrowserWindow(windowOptions);

  if (appConfig.title) {
    mainWindow.setTitle(appConfig.title);
  }

  mainWindow.on('close', () => {
    if (appConfig.directory) {
      const bounds = mainWindow.getBounds();
      saveWindowState(appConfig.directory, {
        ...bounds,
        sidebarWidth: savedSidebarWidth,
        zoomLevel: savedZoomLevel,
      });
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  return mainWindow;
};

app.on('ready', () => {
  appConfig = parseCliArgs();

  protocol.handle('local-file', async (request) => {
    try {
      const url = new URL(request.url);
      const filePath = decodeURIComponent(url.pathname);
      return await net.fetch(`file://${filePath}`);
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  registerIpcHandlers(appConfig, {
    getSidebarWidth: () => savedSidebarWidth,
    setSidebarWidth: (w: number) => { savedSidebarWidth = w; },
    getZoomLevel: () => savedZoomLevel,
    setZoomLevel: (level: number) => { savedZoomLevel = level; },
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_DIRECTORY, (_, dirPath: string): IpcResult<AppConfig> => {
    try {
      const resolved = path.resolve(dirPath);

      if (!fs.existsSync(resolved)) {
        return { data: null, error: 'Directory not found' };
      }

      if (!fs.statSync(resolved).isDirectory()) {
        return { data: null, error: 'Not a directory' };
      }

      appConfig.directory = resolved;
      appConfig.title = path.basename(resolved);

      initDirectory(resolved);

      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.setTitle(appConfig.title);
        }
      }

      return { data: { ...appConfig } };
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  });

  createWindow();

  if (appConfig.directory) {
    initDirectory(appConfig.directory);
  }
});

app.on('before-quit', () => {
  fileWatcher?.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
