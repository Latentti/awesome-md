import { useState, useCallback } from 'react';
import type { AppConfig } from '../../types/electron-api';
import styles from './DropZone.module.css';

interface DropZoneProps {
  onDirectorySelected: (config: AppConfig) => void;
}

export const DropZone = ({ onDirectorySelected }: DropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files.length !== 1) {
      setError('Drop a single folder');
      return;
    }

    const file = files[0];
    const filePath = window.electronAPI.getPathForFile(file);

    if (!filePath) {
      setError('Could not read folder path');
      return;
    }

    const result = await window.electronAPI.selectDirectory(filePath);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data) {
      onDirectorySelected(result.data);
    }
  }, [onDirectorySelected]);

  return (
    <div className={styles.dropZone}>
      <div
        className={`${styles.dropArea} ${isDragOver ? styles.dragOver : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className={styles.icon}>📁</span>
        <span className={styles.label}>Drop a folder here</span>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};
