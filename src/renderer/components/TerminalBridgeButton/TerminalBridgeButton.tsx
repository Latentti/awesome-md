import { useState, useEffect, useCallback } from 'react';
import type { TerminalInfo } from '../../../shared/types';
import styles from './TerminalBridgeButton.module.css';

interface TerminalBridgeButtonProps {
  directory: string;
  collapsed?: boolean;
}

export const TerminalBridgeButton = ({ directory, collapsed }: TerminalBridgeButtonProps) => {
  const [terminalInfo, setTerminalInfo] = useState<TerminalInfo | null>(null);

  useEffect(() => {
    window.electronAPI.getTerminalInfo().then((result) => {
      if (result.data) setTerminalInfo(result.data);
    });
  }, []);

  const handleClick = useCallback(() => {
    window.electronAPI.activateTerminal();
  }, []);

  const shortenDir = (dir: string) => {
    const home = '/Users/';
    if (dir.startsWith(home)) {
      const parts = dir.slice(home.length).split('/');
      return '~/' + parts.slice(1).join('/');
    }
    return dir;
  };

  const tooltip = terminalInfo?.hasTerminal
    ? `Return to ${terminalInfo.terminalApp} (Cmd+T)`
    : `Open terminal in ${shortenDir(directory)} (Cmd+T)`;

  if (collapsed) {
    return (
      <button
        className={styles.collapsedButton}
        onClick={handleClick}
        title={tooltip}
      >
        ◀
      </button>
    );
  }

  return (
    <button
      className={styles.button}
      onClick={handleClick}
      title={tooltip}
    >
      ◀ Terminal
    </button>
  );
};
