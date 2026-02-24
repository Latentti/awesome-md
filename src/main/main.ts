import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'node:path';
import { DEFAULTS } from '../shared/constants';
import { parseCliArgs } from './cli-args';
import type { AppConfig } from './cli-args';
import { registerIpcHandlers } from './ipc-handlers';
import { startFileWatcher } from './file-watcher';

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

const createWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: DEFAULTS.WINDOW_WIDTH,
    height: DEFAULTS.WINDOW_HEIGHT,
    minWidth: DEFAULTS.MIN_WINDOW_WIDTH,
    minHeight: DEFAULTS.MIN_WINDOW_HEIGHT,
    vibrancy: 'sidebar',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setTitle(appConfig.title);

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

  registerIpcHandlers(appConfig);

  createWindow();
  fileWatcher = startFileWatcher(appConfig.directory);
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
