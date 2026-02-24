import { type ReactNode } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  width: number;
  onCollapse?: () => void;
  children?: ReactNode;
}

export const Sidebar = ({ width, onCollapse, children }: SidebarProps) => {
  return (
    <aside className={styles.sidebar} style={{ width }}>
      {onCollapse && (
        <button className={styles.collapseButton} onClick={onCollapse} title="Hide sidebar">
          ‹
        </button>
      )}
      {children}
    </aside>
  );
};
