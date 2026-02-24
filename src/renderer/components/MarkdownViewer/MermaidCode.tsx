import { useState, useEffect } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import mermaid from 'mermaid';
import { getCodeString } from 'rehype-rewrite';
import type { Element } from 'hast';
import styles from './MarkdownViewer.module.css';

const getMermaidTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default';

mermaid.initialize({ startOnLoad: false, theme: getMermaidTheme() });

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  mermaid.initialize({ startOnLoad: false, theme: getMermaidTheme() });
});

const randomId = () =>
  `mermaid-${parseInt(String(Math.random() * 1e15), 10).toString(36)}`;

const cleanupMermaidElements = (id: string) => {
  document.getElementById(id)?.remove();
  document.getElementById(`d${id}`)?.remove();
};

interface MermaidCodeProps extends ComponentPropsWithoutRef<'code'> {
  node?: Element;
}

export const MermaidCode = ({
  children = [],
  node,
}: MermaidCodeProps) => {
  const code = node?.children
    ? getCodeString(node.children)
    : Array.isArray(children)
      ? String(children[0] || '')
      : String(children);

  return <MermaidDiagram code={code} />;
};

interface MermaidDiagramProps {
  code: string;
}

const MermaidDiagram = ({ code }: MermaidDiagramProps) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = randomId();

    const renderDiagram = async () => {
      try {
        const result = await mermaid.render(id, code);
        if (cancelled) return;
        cleanupMermaidElements(id);
        setSvg(result.svg);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        cleanupMermaidElements(id);
        const message =
          err instanceof Error ? err.message : String(err);
        setSvg(null);
        setError(message);
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
      cleanupMermaidElements(id);
    };
  }, [code]);

  if (error) {
    return (
      <div className={styles.mermaidError}>
        Mermaid diagram error: {error}
      </div>
    );
  }

  if (svg) {
    return (
      <div
        className={styles.mermaidContainer}
        data-name="mermaid"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return null;
};
