export interface AppConfig {
  directory: string;
  title: string;
  terminalPid: number | null;
  terminalBundleId: string | null;
}

export interface WindowInfo {
  id: number;
  title: string;
  directory: string;
  currentFile: string | null;
  hasTerminal: boolean;
  isCurrent: boolean;
}

export interface IpcResult<T> {
  data: T | null;
  error?: string;
}

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
}
