import { useState, useRef, useEffect } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import vegaEmbed from 'vega-embed';
import type { Result, VisualizationSpec } from 'vega-embed';
import { getCodeString } from 'rehype-rewrite';
import type { Element } from 'hast';
import styles from './MarkdownViewer.module.css';

interface VegaCodeProps extends ComponentPropsWithoutRef<'code'> {
  node?: Element;
}

export const VegaCode = ({
  children = [],
  node,
}: VegaCodeProps) => {
  const code = node?.children
    ? getCodeString(node.children)
    : Array.isArray(children)
      ? String(children[0] || '')
      : String(children);

  let parsed: unknown;
  try {
    parsed = JSON.parse(code);
  } catch {
    return (
      <div className={styles.vegaError}>
        Vega-Lite JSON parse error: invalid JSON
        {'\n\n'}
        {code}
      </div>
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return (
      <div className={styles.vegaError}>
        Vega-Lite error: spec must be a JSON object
        {'\n\n'}
        {code}
      </div>
    );
  }

  const spec = 'width' in parsed
    ? (parsed as VisualizationSpec)
    : ({ ...parsed, width: 'container' } as VisualizationSpec);

  return <VegaChart spec={spec} />;
};

interface VegaChartProps {
  spec: VisualizationSpec;
}

const VegaChart = ({ spec }: VegaChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const specKey = JSON.stringify(spec);

  useEffect(() => {
    let cancelled = false;

    const renderChart = async () => {
      if (!containerRef.current) return;

      try {
        // Clean up previous render
        if (resultRef.current) {
          resultRef.current.finalize();
          resultRef.current = null;
        }

        const result = await vegaEmbed(containerRef.current, spec, {
          renderer: 'svg',
          actions: false,
        });

        if (cancelled) {
          result.finalize();
          return;
        }

        resultRef.current = result;
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : String(err);
        setError(message);
      }
    };

    renderChart();

    return () => {
      cancelled = true;
      if (resultRef.current) {
        resultRef.current.finalize();
        resultRef.current = null;
      }
    };
  }, [specKey]);

  return (
    <>
      {error && (
        <div className={styles.vegaError}>
          Vega-Lite chart error: {error}
        </div>
      )}
      <div
        className={styles.vegaContainer}
        data-name="vega"
        ref={containerRef}
        style={error ? { display: 'none' } : undefined}
      />
    </>
  );
};
