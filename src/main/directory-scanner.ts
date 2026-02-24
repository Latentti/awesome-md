import fs from 'node:fs';
import path from 'node:path';
import type { TreeNode } from '../shared/types';

const isMdFile = (name: string): boolean => {
  return name.toLowerCase().endsWith('.md');
};

const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
  return nodes.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
};

const scanDir = (dirPath: string): TreeNode[] => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      try {
        const children = scanDir(fullPath);
        if (children.length > 0) {
          nodes.push({
            name: entry.name,
            path: fullPath,
            isDirectory: true,
            children,
          });
        }
      } catch {
        // Skip directories we can't read
      }
    } else if (isMdFile(entry.name)) {
      nodes.push({
        name: entry.name,
        path: fullPath,
        isDirectory: false,
      });
    }
  }

  return sortNodes(nodes);
};

export const scanDirectory = (rootPath: string): TreeNode[] => {
  const resolved = path.resolve(rootPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Directory not found: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${resolved}`);
  }

  return scanDir(resolved);
};
