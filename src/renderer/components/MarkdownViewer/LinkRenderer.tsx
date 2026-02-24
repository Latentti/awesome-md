import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import type { Element } from 'hast';

interface LinkProps extends ComponentPropsWithoutRef<'a'> {
  node?: Element;
}

const resolveInternalPath = (href: string, fileDir: string): string => {
  const base = new URL('local-file:///');
  base.pathname = fileDir + '/';
  const resolved = new URL(href, base);
  return decodeURIComponent(resolved.pathname);
};

export const createLinkRenderer = (
  fileDir: string | undefined,
  onNavigate: ((filePath: string) => void) | undefined,
) => {
  const LinkRenderer = ({ href, children, node, ...props }: LinkProps) => {
    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();

      if (!href) return;

      // Anchor link — scroll to heading
      if (href.startsWith('#')) {
        const id = href.slice(1);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // External link — open in default browser
      if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
        window.electronAPI.openExternalLink(href);
        return;
      }

      // Internal .md link — navigate within app
      if (fileDir && onNavigate && href.toLowerCase().endsWith('.md')) {
        try {
          const absolutePath = resolveInternalPath(href, fileDir);
          onNavigate(absolutePath);
        } catch {
          console.error('Failed to resolve internal link:', href);
        }
        return;
      }

      // Internal link with anchor (e.g. ./file.md#section)
      if (fileDir && onNavigate && href.toLowerCase().includes('.md#')) {
        try {
          const [pathPart] = href.split('#');
          const absolutePath = resolveInternalPath(pathPart, fileDir);
          onNavigate(absolutePath);
        } catch {
          console.error('Failed to resolve internal link:', href);
        }
        return;
      }
    };

    return (
      <a href={href} onClick={handleClick} {...props}>
        {children}
      </a>
    );
  };

  return LinkRenderer;
};
