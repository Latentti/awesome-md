export interface AppConfig {
  directory: string;
  title: string;
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
