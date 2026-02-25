import { BrowserWindow } from 'electron';
import path from 'node:path';
import { DEFAULTS } from '../shared/constants';
import { startFileWatcher } from './file-watcher';
import { loadWindowState, saveWindowState } from './window-state';

export interface WindowContext {
  window: BrowserWindow;
  directory: string;
  title: string;
  watcher: ReturnType<typeof startFileWatcher> | null;
  sidebarWidth: number;
  zoomLevel: number;
  terminalPid: number | null;
  terminalBundleId: string | null;
}

export interface WindowArgs {
  directory: string;
  title: string;
  terminalPid?: number | null;
  terminalBundleId?: string | null;
}

export class WindowManager {
  private windows = new Map<number, WindowContext>();

  create(args: WindowArgs): BrowserWindow {
    const savedState = args.directory ? loadWindowState(args.directory) : null;

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

    const win = new BrowserWindow(windowOptions);

    if (args.title) {
      win.setTitle(args.title);
    }

    const watcher = args.directory ? startFileWatcher(args.directory, win) : null;

    const ctx: WindowContext = {
      window: win,
      directory: args.directory,
      title: args.title,
      watcher,
      sidebarWidth: savedState?.sidebarWidth ?? DEFAULTS.SIDEBAR_WIDTH,
      zoomLevel: savedState?.zoomLevel ?? 0,
      terminalPid: args.terminalPid ?? null,
      terminalBundleId: args.terminalBundleId ?? null,
    };

    const webContentsId = win.webContents.id;
    this.windows.set(webContentsId, ctx);

    win.on('close', () => {
      if (ctx.directory) {
        const bounds = win.getBounds();
        saveWindowState(ctx.directory, {
          ...bounds,
          sidebarWidth: ctx.sidebarWidth,
          zoomLevel: ctx.zoomLevel,
        });
      }
    });

    win.on('closed', () => {
      this.remove(webContentsId);
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      win.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      );
    }

    return win;
  }

  remove(webContentsId: number): void {
    const ctx = this.windows.get(webContentsId);
    if (!ctx) return;

    if (ctx.directory && !ctx.window.isDestroyed()) {
      const bounds = ctx.window.getBounds();
      saveWindowState(ctx.directory, {
        ...bounds,
        sidebarWidth: ctx.sidebarWidth,
        zoomLevel: ctx.zoomLevel,
      });
    }

    ctx.watcher?.close();
    this.windows.delete(webContentsId);
  }

  getByWebContentsId(id: number): WindowContext | undefined {
    return this.windows.get(id);
  }

  getAll(): WindowContext[] {
    return Array.from(this.windows.values());
  }
}
