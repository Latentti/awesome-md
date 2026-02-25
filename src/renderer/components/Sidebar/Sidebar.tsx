import { type ReactNode } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  width: number;
  onCollapse?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
}

export const Sidebar = ({ width, onCollapse, footer, children }: SidebarProps) => {
  return (
    <aside className={styles.sidebar} style={{ width }}>
      {onCollapse && (
        <button className={styles.collapseButton} onClick={onCollapse} title="Hide sidebar">
          ‹
        </button>
      )}
      <div className={styles.sidebarContent}>
        {children}
      </div>
      {footer && <div className={styles.sidebarFooter}>{footer}</div>}
    </aside>
  );
};
