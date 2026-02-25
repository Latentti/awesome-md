import path from 'node:path';
import { BrowserWindow } from 'electron';
import { watch } from 'chokidar';
import { IPC_CHANNELS } from '../shared/constants';

const SKIP_DIRS = new Set(['node_modules', '.git']);
const DEBOUNCE_MS = 100;

const ignored = (filePath: string, stats?: { isFile?: () => boolean }): boolean => {
  const name = path.basename(filePath);
  if (SKIP_DIRS.has(name)) return true;
  if (!stats?.isFile?.()) return false;
  return !name.toLowerCase().endsWith('.md');
};

const sendToWindow = (win: BrowserWindow, channel: string, filePath: string): void => {
  if (!win.isDestroyed()) {
    win.webContents.send(channel, filePath);
  }
};

export const startFileWatcher = (directory: string, targetWindow: BrowserWindow) => {
  const debounceTimers = new Map<string, NodeJS.Timeout>();

  const watcher = watch(directory, {
    ignored,
    ignoreInitial: true,
    persistent: true,
  });

  watcher.on('change', (filePath: string) => {
    const existing = debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);

    debounceTimers.set(
      filePath,
      setTimeout(() => {
        debounceTimers.delete(filePath);
        sendToWindow(targetWindow, IPC_CHANNELS.FILE_CHANGED, filePath);
      }, DEBOUNCE_MS),
    );
  });

  watcher.on('add', (filePath: string) => {
    sendToWindow(targetWindow, IPC_CHANNELS.FILE_ADDED, filePath);
  });

  watcher.on('unlink', (filePath: string) => {
    const existing = debounceTimers.get(filePath);
    if (existing) {
      clearTimeout(existing);
      debounceTimers.delete(filePath);
    }
    sendToWindow(targetWindow, IPC_CHANNELS.FILE_REMOVED, filePath);
  });

  watcher.on('error', (error: unknown) => {
    console.error('File watcher error:', error);
  });

  return watcher;
};
