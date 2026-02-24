import { useState, useEffect } from 'react';
import type { TreeNode } from '../../../shared/types';
import { FileTreeItem } from './FileTreeItem';
import styles from './FileTree.module.css';

interface FileTreeProps {
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onTreeLoaded?: (firstFilePath: string | null) => void;
}

const findFirstFile = (nodes: TreeNode[]): string | null => {
  for (const node of nodes) {
    if (!node.isDirectory) return node.path;
    if (node.children) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
};

export const FileTree = ({ selectedPath, onSelectFile, onTreeLoaded }: FileTreeProps) => {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTree = async () => {
      try {
        const result = await window.electronAPI.readDirectory();
        if (result.error) {
          console.error('Failed to load directory:', result.error);
          setError(result.error);
          onTreeLoaded?.(null);
        } else if (result.data) {
          setTree(result.data);
          onTreeLoaded?.(findFirstFile(result.data));
        } else {
          onTreeLoaded?.(null);
        }
      } catch (err) {
        console.error('IPC error:', err);
        setError('Failed to load directory');
        onTreeLoaded?.(null);
      }
      setLoaded(true);
    };
    loadTree();
  }, []);

  if (!loaded) {
    return null;
  }

  if (error) {
    return (
      <p className={styles.emptyState}>{error}</p>
    );
  }

  if (tree.length === 0) {
    return (
      <p className={styles.emptyState}>
        No Markdown files found in this directory
      </p>
    );
  }

  return (
    <div className={styles.tree}>
      {tree.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          depth={0}
        />
      ))}
    </div>
  );
};
