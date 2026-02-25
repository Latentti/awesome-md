import { ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { IPC_CHANNELS } from '../shared/constants';
import type { AppConfig, IpcResult, TerminalInfo, TreeNode } from '../shared/types';
import { scanDirectory } from './directory-scanner';
import { startFileWatcher } from './file-watcher';
import { activateTerminal, openNewTerminal, isProcessAlive, bundleIdToAppName } from './terminal-bridge';
import type { WindowManager } from './window-manager';
import { loadWindowState } from './window-state';

export const registerIpcHandlers = (windowManager: WindowManager): void => {
  ipcMain.handle(IPC_CHANNELS.GET_CONFIG, (event): AppConfig => {
    const ctx = windowManager.getByWebContentsId(event.sender.id);
    if (!ctx) throw new Error('Unknown window');
    return {
      directory: ctx.directory,
      title: ctx.title,
      terminalPid: ctx.terminalPid,
      terminalBundleId: ctx.terminalBundleId,
    };
  });

  ipcMain.handle(IPC_CHANNELS.READ_DIRECTORY, (event): IpcResult<TreeNode[]> => {
    const ctx = windowManager.getByWebContentsId(event.sender.id);
    if (!ctx) return { data: null, error: 'Unknown window' };
    try {
      const tree = scanDirectory(ctx.directory);
      return { data: tree };
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.READ_FILE, (event, filePath: string): IpcResult<string> => {
    const ctx = windowManager.getByWebContentsId(event.sender.id);
    if (!ctx) return { data: null, error: 'Unknown window' };
    try {
      const resolved = fs.realpathSync(path.resolve(filePath));
      const normalizedRoot = fs.realpathSync(path.resolve(ctx.directory));

      if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
        return { data: null, error: 'Access denied: path outside target directory' };
      }

      if (!resolved.toLowerCase().endsWith('.md')) {
        return { data: null, error: 'Access denied: only .md files are readable' };
      }

      const content = fs.readFileSync(resolved, 'utf-8');
      return { data: content };
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_SIDEBAR_WIDTH, (event): number => {
    const ctx = windowManager.getByWebContentsId(event.sender.id);
    if (!ctx) throw new Error('Unknown window');
    return ctx.sidebarWidth;
  });

  ipcMain.handle(IPC_CHANNELS.SET_SIDEBAR_WIDTH, (event, width: number) => {
    const ctx = windowManager.getByWebContentsId(event.sender.id);
    if (!ctx) return;
    ctx.sidebarWidth = width;
  });

  ipcMain.handle(IPC_CHANNELS.GET_ZOOM_LEVEL, (event): number => {
    const ctx = windowManager.getByWebContentsId(event.sender.id);
    if (!ctx) throw new Error('Unknown window');
    return ctx.zoomLevel;
  });

  ipcMain.handle(IPC_CHANNELS.SET_ZOOM_LEVEL, (event, level: number) => {
    const ctx = windowManager.getByWebContentsId(event.sender.id);
    if (!ctx) return;
    ctx.zoomLevel = level;
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_DIRECTORY, (event, dirPath: string): IpcResult<AppConfig> => {
    const ctx = windowManager.getByWebContentsId(event.sender.id);
    if (!ctx) return { data: null, error: 'Unknown window' };
    try {
      const resolved = path.resolve(dirPath);

      if (!fs.existsSync(resolved)) {
        return { data: null, error: 'Directory not found' };
      }

      if (!fs.statSync(resolved).isDirectory()) {
        return { data: null, error: 'Not a directory' };
      }

      ctx.directory = resolved;
      ctx.title = path.basename(resolved);

      const savedState = loadWindowState(resolved);
      if (savedState) {
        ctx.sidebarWidth = savedState.sidebarWidth;
        ctx.zoomLevel = savedState.zoomLevel;
      }

      ctx.watcher?.close();
      ctx.watcher = startFileWatcher(resolved, ctx.window);

      if (!ctx.window.isDestroyed()) {
        ctx.window.setTitle(ctx.title);
      }

      return {
        data: {
          directory: ctx.directory,
          title: ctx.title,
          terminalPid: ctx.terminalPid,
          terminalBundleId: ctx.terminalBundleId,
        },
      };
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TERMINAL_ACTIVATE, async (event): Promise<IpcResult<{ activated: boolean }>> => {
    const ctx = windowManager.getByWebContentsId(event.sender.id);
    if (!ctx) return { data: null, error: 'Unknown window' };
    try {
      if (ctx.terminalPid && ctx.terminalBundleId) {
        const result = await activateTerminal(ctx.terminalPid, ctx.terminalBundleId, ctx.directory);
        return { data: result };
      }
      // No terminal info — open new terminal in directory
      await openNewTerminal(ctx.directory);
      return { data: { activated: false } };
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TERMINAL_GET_INFO, (event): IpcResult<TerminalInfo> => {
    const ctx = windowManager.getByWebContentsId(event.sender.id);
    if (!ctx) return { data: null, error: 'Unknown window' };

    const hasTerminal = ctx.terminalPid !== null && isProcessAlive(ctx.terminalPid);
    const terminalApp = ctx.terminalBundleId ? bundleIdToAppName(ctx.terminalBundleId) : '';

    return { data: { hasTerminal, terminalApp } };
  });

  const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL_LINK, async (_, url: string): Promise<IpcResult<null>> => {
    try {
      const parsed = new URL(url);
      if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
        return { data: null, error: `Blocked protocol: ${parsed.protocol}` };
      }
      await shell.openExternal(url);
      return { data: null };
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  });
};
