import type { ComponentPropsWithoutRef } from 'react';
import type { Element } from 'hast';
import { MermaidCode } from './MermaidCode';
import { VegaCode } from './VegaCode';

interface CodeBlockProps extends ComponentPropsWithoutRef<'code'> {
  node?: Element;
}

export const CodeBlock = ({
  children = [],
  className,
  node,
  ...props
}: CodeBlockProps) => {
  if (
    typeof className === 'string' &&
    /^language-mermaid\b/i.test(className)
  ) {
    return <MermaidCode node={node}>{children}</MermaidCode>;
  }

  if (
    typeof className === 'string' &&
    /^language-(vega-lite|vega)\b/i.test(className)
  ) {
    return <VegaCode node={node}>{children}</VegaCode>;
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
};
