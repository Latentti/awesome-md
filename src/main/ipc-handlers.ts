import { ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { IPC_CHANNELS } from '../shared/constants';
import type { AppConfig, IpcResult, TreeNode } from '../shared/types';
import { scanDirectory } from './directory-scanner';

interface AppState {
  getSidebarWidth: () => number;
  setSidebarWidth: (width: number) => void;
  getZoomLevel: () => number;
  setZoomLevel: (level: number) => void;
}

export const registerIpcHandlers = (config: AppConfig, appState: AppState): void => {
  ipcMain.handle(IPC_CHANNELS.GET_CONFIG, () => config);

  ipcMain.handle(IPC_CHANNELS.READ_DIRECTORY, (): IpcResult<TreeNode[]> => {
    try {
      const tree = scanDirectory(config.directory);
      return { data: tree };
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.READ_FILE, (_, filePath: string): IpcResult<string> => {
    try {
      const resolved = fs.realpathSync(path.resolve(filePath));
      const normalizedRoot = fs.realpathSync(path.resolve(config.directory));

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

  ipcMain.handle(IPC_CHANNELS.GET_SIDEBAR_WIDTH, () => appState.getSidebarWidth());

  ipcMain.handle(IPC_CHANNELS.SET_SIDEBAR_WIDTH, (_, width: number) => {
    appState.setSidebarWidth(width);
  });

  ipcMain.handle(IPC_CHANNELS.GET_ZOOM_LEVEL, () => appState.getZoomLevel());

  ipcMain.handle(IPC_CHANNELS.SET_ZOOM_LEVEL, (_, level: number) => {
    appState.setZoomLevel(level);
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
