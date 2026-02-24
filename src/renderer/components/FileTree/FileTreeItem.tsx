import { useState, useCallback } from 'react';
import type { TreeNode } from '../../../shared/types';
import styles from './FileTree.module.css';

interface FileTreeItemProps {
  node: TreeNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  depth: number;
}

export const FileTreeItem = ({
  node,
  selectedPath,
  onSelectFile,
  depth,
}: FileTreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleFileClick = useCallback(() => {
    onSelectFile(node.path);
  }, [node.path, onSelectFile]);

  const isSelected = !node.isDirectory && node.path === selectedPath;
  const indentStyle = { paddingLeft: depth * 16 };

  if (node.isDirectory) {
    return (
      <>
        <div
          className={styles.treeItem}
          style={indentStyle}
          onClick={handleToggle}
        >
          <span className={styles.disclosure}>
            {isExpanded ? '\u25BC' : '\u25B6'}
          </span>
          <span className={styles.icon}>{'\uD83D\uDCC1'}</span>
          <span className={styles.folderName}>{node.name}</span>
        </div>
        {isExpanded &&
          node.children?.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              depth={depth + 1}
            />
          ))}
      </>
    );
  }

  return (
    <div
      className={`${styles.treeItem} ${isSelected ? styles.selected : ''}`}
      style={indentStyle}
      onClick={handleFileClick}
    >
      <span className={styles.disclosure} />
      <span className={styles.icon}>{'\uD83D\uDCC4'}</span>
      <span className={styles.fileName}>{node.name}</span>
    </div>
  );
};
