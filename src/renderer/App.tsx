import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { DEFAULTS } from '../shared/constants';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileTree } from './components/FileTree/FileTree';
import { MarkdownViewer } from './components/MarkdownViewer/MarkdownViewer';
import { RefreshIndicator } from './components/RefreshIndicator/RefreshIndicator';
import { DropZone } from './components/DropZone/DropZone';
import { TerminalBridgeButton } from './components/TerminalBridgeButton/TerminalBridgeButton';
import { ProjectSwitcher } from './components/ProjectSwitcher/ProjectSwitcher';
import type { AppConfig } from './types/electron-api';
import styles from './App.module.css';

export const App = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULTS.SIDEBAR_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const isResizing = useRef(false);
  const contentRef = useRef<HTMLElement>(null);
  const isAutoRefreshRef = useRef(false);
  const savedScrollTopRef = useRef(0);
  const configRef = useRef<AppConfig | null>(null);

  const sidebarWidthRef = useRef(DEFAULTS.SIDEBAR_WIDTH);

  // Keep a mutable ref in sync with config so keydown handler ([] deps) can read it
  useEffect(() => { configRef.current = config; }, [config]);

  const toggleSidebar = useCallback(() => setIsCollapsed(prev => !prev), []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, []);

  // Load config on mount
  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      const cfg = await window.electronAPI.getConfig();
      if (!cancelled) {
        setConfig(cfg);
      }
    };
    loadConfig();
    return () => { cancelled = true; };
  }, []);

  const handleDirectorySelected = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
  }, []);

  // Load and apply zoom level on mount / directory change
  useEffect(() => {
    if (!config?.directory) return;
    let cancelled = false;
    const loadZoom = async () => {
      try {
        const level = await window.electronAPI.getZoomLevel();
        if (!cancelled) {
          window.electronAPI.setZoomLevel(level);
        }
      } catch {
        // Use default zoom
      }
    };
    loadZoom();
    return () => { cancelled = true; };
  }, [config?.directory]);

  // Keyboard shortcuts: Cmd+Shift+P (project switcher), Cmd+T (terminal), Cmd+Plus/Minus/0 (zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;

      // Cmd+Shift+P: toggle Project Switcher (only when a directory is active)
      if (e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        const cfg = configRef.current;
        if (cfg?.directory) {
          e.preventDefault();
          setShowProjectSwitcher(prev => !prev);
        }
        return;
      }

      // Cmd+T: activate terminal (only when a directory with terminal PID is active)
      if (e.key === 't') {
        const cfg = configRef.current;
        if (cfg?.terminalPid != null && cfg?.directory) {
          e.preventDefault();
          window.electronAPI.activateTerminal();
        }
        return;
      }

      let delta: number | null = null;

      if (e.key === '=' || e.key === '+') {
        delta = DEFAULTS.ZOOM_STEP;
      } else if (e.key === '-') {
        delta = -DEFAULTS.ZOOM_STEP;
      } else if (e.key === '0') {
        e.preventDefault();
        window.electronAPI.setZoomLevel(0);
        return;
      }

      if (delta !== null) {
        e.preventDefault();
        window.electronAPI.getZoomLevel().then((current) => {
          const next = Math.min(DEFAULTS.ZOOM_MAX, Math.max(DEFAULTS.ZOOM_MIN, current + delta));
          window.electronAPI.setZoomLevel(next);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!config?.directory) return;
    let cancelled = false;
    const loadSidebarWidth = async () => {
      try {
        const width = await window.electronAPI.getSidebarWidth();
        if (cancelled) return;
        const clamped = Math.min(DEFAULTS.SIDEBAR_MAX_WIDTH, Math.max(DEFAULTS.SIDEBAR_MIN_WIDTH, width));
        setSidebarWidth(clamped);
        sidebarWidthRef.current = clamped;
      } catch {
        // Use default width
      }
    };
    loadSidebarWidth();
    return () => { cancelled = true; };
  }, [config?.directory]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(
        DEFAULTS.SIDEBAR_MAX_WIDTH,
        Math.max(DEFAULTS.SIDEBAR_MIN_WIDTH, e.clientX)
      );
      setSidebarWidth(newWidth);
      sidebarWidthRef.current = newWidth;
    };

    const handleMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.electronAPI.setSidebarWidth(sidebarWidthRef.current);
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
    savedScrollTopRef.current = 0;
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

  // Report selected file to main process for Project Switcher
  useEffect(() => {
    if (!config?.directory) return;
    window.electronAPI.setCurrentFile(selectedFile);
  }, [selectedFile, config?.directory]);

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
      savedScrollTopRef.current = contentRef.current?.scrollTop ?? 0;
      setIsRefreshing(true);

      const reloadFile = async () => {
        try {
          const result = await window.electronAPI.readFile(selectedFile);
          if (cancelled) return;
          if (result.error) {
            setFileError((prev) => prev === 'File no longer available' ? prev : result.error);
            setFileContent(null);
          } else {
            setFileContent(result.data);
            setFileError(null);
          }
        } catch (err) {
          if (cancelled) return;
          setFileError((prev) => prev === 'File no longer available' ? prev : 'Failed to read file');
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

  useEffect(() => {
    if (!selectedFile) return;

    const cleanup = window.electronAPI.onFileRemoved((removedPath: string) => {
      if (removedPath === selectedFile) {
        setFileContent(null);
        setFileError('File no longer available');
      }
    });

    return cleanup;
  }, [selectedFile]);

  useLayoutEffect(() => {
    if (!isAutoRefreshRef.current) return;
    const el = contentRef.current;
    if (el) {
      const maxScroll = el.scrollHeight - el.clientHeight;
      el.scrollTop = Math.min(savedScrollTopRef.current, Math.max(0, maxScroll));
    }
  }, [fileContent]);

  const handleTreeLoaded = useCallback((firstFilePath: string | null) => {
    setSelectedFile((current) => current ?? firstFilePath);
  }, []);

  // Loading state — config not yet fetched
  if (!config) {
    return null;
  }

  // No directory selected — show drop zone
  if (!config.directory) {
    return <DropZone onDirectorySelected={handleDirectorySelected} />;
  }

  const renderContent = () => {
    if (fileError) {
      return <p className={styles.emptyState}>{fileError}</p>;
    }
    if (fileContent !== null) {
      return <MarkdownViewer content={fileContent} filePath={selectedFile} onNavigate={setSelectedFile} />;
    }
    return <p className={styles.emptyState}>Select a file to view</p>;
  };

  return (
    <div className={styles.app}>
      {!isCollapsed && (
        <>
          <Sidebar
            width={sidebarWidth}
            onCollapse={toggleSidebar}
            footer={config.terminalPid != null ? (
              <TerminalBridgeButton directory={config.directory} />
            ) : undefined}
          >
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
        {isCollapsed && config.terminalPid != null && (
          <div className={styles.collapsedTerminal}>
            <TerminalBridgeButton directory={config.directory} collapsed />
          </div>
        )}
        <div className={styles.contentInner}>
          {renderContent()}
        </div>
      </main>
      {showProjectSwitcher && (
        <ProjectSwitcher
          onClose={() => setShowProjectSwitcher(false)}
          onActivateWindow={(id) => {
            window.electronAPI.activateWindow(id);
            setShowProjectSwitcher(false);
          }}
          onOpenNewWindow={async (dir) => {
            const result = await window.electronAPI.openNewWindow(dir);
            if (!result.error) {
              setShowProjectSwitcher(false);
            }
          }}
        />
      )}
    </div>
  );
};
