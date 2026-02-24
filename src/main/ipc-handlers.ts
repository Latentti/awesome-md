import { ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { IPC_CHANNELS } from '../shared/constants';
import type { AppConfig, IpcResult, TreeNode } from '../shared/types';
import { scanDirectory } from './directory-scanner';

export const registerIpcHandlers = (config: AppConfig): void => {
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
};
