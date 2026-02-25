import type { WindowInfo } from '../../../shared/types';
import styles from './ProjectSwitcher.module.css';

interface ProjectCardProps {
  window: WindowInfo;
  isSelected: boolean;
  filter: string;
  onClick: () => void;
}

const HighlightText = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.highlight}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

const shortenDir = (dir: string): string => {
  const home = '/Users/';
  if (dir.startsWith(home)) {
    const parts = dir.slice(home.length).split('/');
    return '~/' + parts.slice(1).join('/');
  }
  return dir;
};

const fileName = (filePath: string | null): string | null => {
  if (!filePath) return null;
  return filePath.split('/').pop() ?? null;
};

export const ProjectCard = ({ window: win, isSelected, filter, onClick }: ProjectCardProps) => {
  const cardClass = [
    styles.card,
    isSelected && styles.cardSelected,
    win.isCurrent && styles.cardCurrent,
  ].filter(Boolean).join(' ');

  return (
    <button className={cardClass} onClick={onClick} type="button">
      <div className={styles.cardTitle}>
        <HighlightText text={win.title} query={filter} />
        {win.isCurrent && <span className={styles.currentBadge}>Current</span>}
      </div>
      <div className={styles.cardPath}>
        <HighlightText text={shortenDir(win.directory)} query={filter} />
      </div>
      {fileName(win.currentFile) && (
        <div className={styles.cardFile}>{fileName(win.currentFile)}</div>
      )}
      {win.hasTerminal && (
        <div className={styles.cardTerminal}>◀ Terminal</div>
      )}
    </button>
  );
};
