import path from 'node:path';
import type { AppConfig } from '../shared/types';

export const parseCliArgs = (argv?: string[]): AppConfig => {
  const args = argv ?? process.argv;

  let directory = '';
  let title: string | undefined;
  let terminalPid: number | null = null;
  let terminalBundleId: string | null = null;

  // Parse CLI flags from argv
  // (process.argv for first instance, received argv for second-instance event)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && i + 1 < args.length) {
      directory = args[i + 1];
      i++;
    } else if (args[i] === '--title' && i + 1 < args.length) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--terminal-pid' && i + 1 < args.length) {
      const parsed = parseInt(args[i + 1], 10);
      terminalPid = isNaN(parsed) || parsed <= 0 ? null : parsed;
      i++;
    } else if (args[i] === '--terminal-bundle-id' && i + 1 < args.length) {
      terminalBundleId = args[i + 1];
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

  return { directory, title: title ?? '', terminalPid, terminalBundleId };
};
