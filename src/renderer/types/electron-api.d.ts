import type { AppConfig, IpcResult, TreeNode } from '../../shared/types';

export type { AppConfig, IpcResult, TreeNode };

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
