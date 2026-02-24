import { useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import type { Element } from 'hast';
import styles from './MarkdownViewer.module.css';

interface ImageProps extends ComponentPropsWithoutRef<'img'> {
  node?: Element;
}

const resolveImageSrc = (src: string, fileDir: string): string => {
  if (/^https?:\/\//i.test(src) || src.startsWith('data:')) {
    return src;
  }

  if (src.startsWith('/')) {
    const url = new URL('local-file:///');
    url.pathname = src;
    return url.href;
  }

  const base = new URL('local-file:///');
  base.pathname = fileDir + '/';
  return new URL(src, base).href;
};

export const createImageRenderer = (fileDir: string) => {
  const ImageRenderer = ({ src, alt, node, ...props }: ImageProps) => {
    const [broken, setBroken] = useState(false);

    if (!src) {
      return <img alt={alt} {...props} />;
    }

    let resolvedSrc: string;
    try {
      resolvedSrc = resolveImageSrc(src, fileDir);
    } catch {
      return (
        <span className={styles.brokenImage}>
          {alt || 'Image not found'}
        </span>
      );
    }

    if (broken) {
      return (
        <span className={styles.brokenImage}>
          {alt || 'Image not found'}
        </span>
      );
    }

    return (
      <img
        src={resolvedSrc}
        alt={alt}
        {...props}
        onError={() => setBroken(true)}
      />
    );
  };

  return ImageRenderer;
};
