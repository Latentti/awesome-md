import path from 'node:path';
import type { AppConfig } from '../shared/types';

export type { AppConfig };

export const parseCliArgs = (): AppConfig => {
  const argv = process.argv;

  let directory = '';
  let title: string | undefined;

  // Parse --dir and --title from process.argv
  // (passed by bin/awesome-md.js when spawning electron)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir' && i + 1 < argv.length) {
      directory = argv[i + 1];
      i++;
    } else if (argv[i] === '--title' && i + 1 < argv.length) {
      title = argv[i + 1];
      i++;
    }
  }

  if (directory) {
    // Resolve to absolute path
    directory = path.resolve(directory);

    // Default title to directory basename
    if (!title) {
      title = path.basename(directory);
    }
  }

  return { directory, title: title ?? '' };
};
