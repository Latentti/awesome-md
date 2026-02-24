import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG),
  readDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.READ_DIRECTORY),
  readFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),
});
