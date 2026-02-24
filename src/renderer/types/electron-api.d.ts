import type { AppConfig, IpcResult, TreeNode } from '../../shared/types';

export type { AppConfig, IpcResult, TreeNode };

export interface ElectronAPI {
  getConfig(): Promise<AppConfig>;
  readDirectory(): Promise<IpcResult<TreeNode[]>>;
  readFile(filePath: string): Promise<IpcResult<string>>;
  onFileChanged(callback: (filePath: string) => void): () => void;
  onFileAdded(callback: (filePath: string) => void): () => void;
  onFileRemoved(callback: (filePath: string) => void): () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
