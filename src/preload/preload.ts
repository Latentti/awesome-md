import { contextBridge, ipcRenderer, webFrame, webUtils } from 'electron';
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
  getSidebarWidth: (): Promise<number> => ipcRenderer.invoke(IPC_CHANNELS.GET_SIDEBAR_WIDTH),
  setSidebarWidth: (width: number): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.SET_SIDEBAR_WIDTH, width),
  openExternalLink: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_LINK, url),
  selectDirectory: (dirPath: string) => ipcRenderer.invoke(IPC_CHANNELS.SELECT_DIRECTORY, dirPath),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  getZoomLevel: (): Promise<number> => ipcRenderer.invoke(IPC_CHANNELS.GET_ZOOM_LEVEL),
  setZoomLevel: (level: number): void => {
    webFrame.setZoomLevel(level);
    ipcRenderer.invoke(IPC_CHANNELS.SET_ZOOM_LEVEL, level);
  },
  activateTerminal: () => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_ACTIVATE),
  getTerminalInfo: () => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_GET_INFO),
  getAllWindows: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOWS_GET_ALL),
  activateWindow: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.WINDOWS_ACTIVATE, id),
  openNewWindow: (dirPath: string) => ipcRenderer.invoke(IPC_CHANNELS.WINDOWS_OPEN_NEW, dirPath),
  closeWindow: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.WINDOWS_CLOSE, id),
  setCurrentFile: (filePath: string | null) => ipcRenderer.invoke(IPC_CHANNELS.SET_CURRENT_FILE, filePath),
});
