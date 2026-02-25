import type { AppConfig, IpcResult, TerminalInfo, TreeNode } from '../../shared/types';

export type { AppConfig, IpcResult, TerminalInfo, TreeNode };

export interface ElectronAPI {
  getConfig(): Promise<AppConfig>;
  readDirectory(): Promise<IpcResult<TreeNode[]>>;
  readFile(filePath: string): Promise<IpcResult<string>>;
  onFileChanged(callback: (filePath: string) => void): () => void;
  onFileAdded(callback: (filePath: string) => void): () => void;
  onFileRemoved(callback: (filePath: string) => void): () => void;
  getSidebarWidth(): Promise<number>;
  setSidebarWidth(width: number): Promise<void>;
  openExternalLink(url: string): Promise<IpcResult<null>>;
  selectDirectory(dirPath: string): Promise<IpcResult<AppConfig>>;
  getPathForFile(file: File): string;
  getZoomLevel(): Promise<number>;
  setZoomLevel(level: number): void;
  activateTerminal(): Promise<IpcResult<{ activated: boolean }>>;
  getTerminalInfo(): Promise<IpcResult<TerminalInfo>>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
