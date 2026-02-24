import { Component, memo, useMemo } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { createImageRenderer } from './ImageRenderer';
import styles from './MarkdownViewer.module.css';

interface MarkdownViewerProps {
  content: string;
  filePath?: string | null;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MarkdownErrorBoundary extends Component<
  { children: ReactNode; content: string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('MarkdownViewer render error:', error, info);
  }

  componentDidUpdate(prevProps: { content: string }): void {
    if (prevProps.content !== this.props.content && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <pre className={styles.fallback}>{this.props.content}</pre>
      );
    }
    return this.props.children;
  }
}

const REMARK_PLUGINS = [remarkGfm];
const TRANSPARENT_BG = { backgroundColor: 'transparent' } as const;
const CODE_ONLY_COMPONENTS = { code: CodeBlock } as const;

export const MarkdownViewer = memo(({ content, filePath }: MarkdownViewerProps) => {
  const fileDir = filePath
    ? filePath.substring(0, filePath.lastIndexOf('/'))
    : undefined;

  const components = useMemo(
    () =>
      fileDir
        ? { code: CodeBlock, img: createImageRenderer(fileDir) }
        : CODE_ONLY_COMPONENTS,
    [fileDir],
  );

  return (
    <MarkdownErrorBoundary content={content}>
      <div className={styles.viewer}>
        <MarkdownPreview
          source={content}
          remarkPlugins={REMARK_PLUGINS}
          style={TRANSPARENT_BG}
          components={components}
        />
      </div>
    </MarkdownErrorBoundary>
  );
});
