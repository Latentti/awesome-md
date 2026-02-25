import { useState, useEffect, useRef, useCallback } from 'react';
import type { WindowInfo } from '../../../shared/types';
import { ProjectCard } from './ProjectCard';
import styles from './ProjectSwitcher.module.css';

const shortenDir = (dir: string): string => {
  const home = '/Users/';
  if (dir.startsWith(home)) {
    const parts = dir.slice(home.length).split('/');
    return '~/' + parts.slice(1).join('/');
  }
  return dir;
};

interface ProjectSwitcherProps {
  onClose: () => void;
  onActivateWindow: (id: number) => void;
}

export const ProjectSwitcher = ({ onClose, onActivateWindow }: ProjectSwitcherProps) => {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(0);
  const [visible, setVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch window list on mount
  useEffect(() => {
    window.electronAPI.getAllWindows().then(result => {
      if (result.data) setWindows(result.data);
    });
  }, []);

  // Trigger fade-in after mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Auto-focus filter input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = windows.filter(w =>
    w.title.toLowerCase().includes(filter.toLowerCase()) ||
    shortenDir(w.directory).toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selection when filter changes; auto-select if 1 result
  useEffect(() => {
    setSelected(0);
  }, [filter]);

  // Scroll selected card into view (for 20+ windows)
  useEffect(() => {
    if (!gridRef.current) return;
    const card = gridRef.current.children[selected] as HTMLElement | undefined;
    card?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const getColumns = useCallback((): number => {
    if (!gridRef.current) return 3;
    const cols = getComputedStyle(gridRef.current)
      .getPropertyValue('grid-template-columns').split(' ').length;
    return cols || 3;
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        setSelected(prev => Math.min(prev + 1, filtered.length - 1));
        e.preventDefault();
        break;
      case 'ArrowLeft':
        setSelected(prev => Math.max(prev - 1, 0));
        e.preventDefault();
        break;
      case 'ArrowDown': {
        const cols = getColumns();
        setSelected(prev => Math.min(prev + cols, filtered.length - 1));
        e.preventDefault();
        break;
      }
      case 'ArrowUp': {
        const cols = getColumns();
        setSelected(prev => Math.max(prev - cols, 0));
        e.preventDefault();
        break;
      }
      case 'Enter':
        if (filtered[selected]) {
          onActivateWindow(filtered[selected].id);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const overlayClass = `${styles.overlay} ${visible ? styles.overlayVisible : ''}`;

  return (
    <div className={overlayClass} onKeyDown={handleKeyDown} onClick={handleBackdropClick} tabIndex={-1}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>Open Projects ({windows.length})</h2>
          <input
            ref={inputRef}
            className={styles.filterInput}
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <p className={styles.emptyState}>No matching projects</p>
        ) : (
          <div className={styles.grid} ref={gridRef}>
            {filtered.map((win, i) => (
              <ProjectCard
                key={win.id}
                window={win}
                isSelected={i === selected}
                filter={filter}
                onClick={() => onActivateWindow(win.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
