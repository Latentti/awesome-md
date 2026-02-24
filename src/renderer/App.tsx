import { useState, useCallback, useEffect, useRef } from 'react';
import { DEFAULTS } from '../shared/constants';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileTree } from './components/FileTree/FileTree';
import { MarkdownViewer } from './components/MarkdownViewer/MarkdownViewer';
import { RefreshIndicator } from './components/RefreshIndicator/RefreshIndicator';
import styles from './App.module.css';

export const App = () => {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULTS.SIDEBAR_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isResizing = useRef(false);
  const contentRef = useRef<HTMLElement>(null);
  const isAutoRefreshRef = useRef(false);

  const toggleSidebar = useCallback(() => setIsCollapsed(prev => !prev), []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(
        DEFAULTS.SIDEBAR_MAX_WIDTH,
        Math.max(DEFAULTS.SIDEBAR_MIN_WIDTH, e.clientX)
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setFileContent(null);
      setFileError(null);
      return;
    }
    let cancelled = false;
    const loadFile = async () => {
      try {
        const result = await window.electronAPI.readFile(selectedFile);
        if (cancelled) return;
        if (result.error) {
          setFileError(result.error);
          setFileContent(null);
        } else {
          setFileContent(result.data);
          setFileError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setFileError('Failed to read file');
        setFileContent(null);
      }
      if (!isAutoRefreshRef.current) {
        contentRef.current?.scrollTo(0, 0);
      }
    };
    loadFile();
    return () => { cancelled = true; };
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile) return;

    let cancelled = false;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = window.electronAPI.onFileChanged((changedFilePath: string) => {
      if (changedFilePath !== selectedFile) return;

      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }

      isAutoRefreshRef.current = true;
      setIsRefreshing(true);

      const reloadFile = async () => {
        try {
          const result = await window.electronAPI.readFile(selectedFile);
          if (cancelled) return;
          if (result.error) {
            setFileError(result.error);
            setFileContent(null);
          } else {
            setFileContent(result.data);
            setFileError(null);
          }
        } catch (err) {
          if (cancelled) return;
          setFileError('Failed to read file');
          setFileContent(null);
        }
        if (cancelled) return;
        refreshTimeout = setTimeout(() => {
          if (cancelled) return;
          setIsRefreshing(false);
          isAutoRefreshRef.current = false;
        }, 300);
      };
      reloadFile();
    });

    return () => {
      cancelled = true;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      cleanup();
    };
  }, [selectedFile]);

  const handleTreeLoaded = useCallback((firstFilePath: string | null) => {
    setSelectedFile((current) => current ?? firstFilePath);
  }, []);

  const renderContent = () => {
    if (fileError) {
      return <p className={styles.emptyState}>{fileError}</p>;
    }
    if (fileContent !== null) {
      return <MarkdownViewer content={fileContent} filePath={selectedFile} />;
    }
    return <p className={styles.emptyState}>Select a file to view</p>;
  };

  return (
    <div className={styles.app}>
      {!isCollapsed && (
        <>
          <Sidebar width={sidebarWidth} onCollapse={toggleSidebar}>
            <FileTree
              selectedPath={selectedFile}
              onSelectFile={setSelectedFile}
              onTreeLoaded={handleTreeLoaded}
            />
          </Sidebar>
          <div
            className={styles.divider}
            onMouseDown={handleMouseDown}
          />
        </>
      )}
      <main className={styles.content} ref={contentRef}>
        <RefreshIndicator isRefreshing={isRefreshing} />
        {isCollapsed && (
          <button className={styles.expandButton} onClick={toggleSidebar} title="Show sidebar">
            ›
          </button>
        )}
        <div className={styles.contentInner}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};
