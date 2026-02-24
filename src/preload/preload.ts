import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG),
  readDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.READ_DIRECTORY),
  readFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),
  onFileChanged: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on(IPC_CHANNELS.FILE_CHANGED, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.FILE_CHANGED, handler); };
  },
  onFileAdded: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on(IPC_CHANNELS.FILE_ADDED, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.FILE_ADDED, handler); };
  },
  onFileRemoved: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on(IPC_CHANNELS.FILE_REMOVED, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.FILE_REMOVED, handler); };
  },
});
