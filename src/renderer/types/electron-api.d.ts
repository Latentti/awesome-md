import type { AppConfig, IpcResult, TreeNode } from '../../shared/types';

export type { AppConfig, IpcResult, TreeNode };

export interface ElectronAPI {
  getConfig(): Promise<AppConfig>;
  readDirectory(): Promise<IpcResult<TreeNode[]>>;
  readFile(filePath: string): Promise<IpcResult<string>>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
