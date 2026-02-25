import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const runAppleScript = async (script: string): Promise<string> => {
  const { stdout } = await execFileAsync('osascript', ['-e', script]);
  return stdout.trim();
};

/** Escape a string for embedding inside AppleScript double-quoted string literals. */
const escapeForAppleScript = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const BUNDLE_ID_TO_NAME: Record<string, string> = {
  'com.apple.Terminal': 'Terminal',
  'com.googlecode.iterm2': 'iTerm2',
  'dev.warp.Warp-Stable': 'Warp',
};

export const bundleIdToAppName = (bundleId: string): string => {
  return BUNDLE_ID_TO_NAME[bundleId] ?? bundleId.split('.').pop() ?? bundleId;
};

export const activateTerminal = async (
  pid: number,
  bundleId: string,
  directory: string,
): Promise<{ activated: boolean }> => {
  if (isProcessAlive(pid)) {
    const safeBundleId = escapeForAppleScript(bundleId);
    await runAppleScript(`tell application id "${safeBundleId}" to activate`);
    return { activated: true };
  }
  // Terminal is dead — fallback to opening a new one
  await openNewTerminal(directory);
  return { activated: false };
};

export const openNewTerminal = async (directory: string): Promise<void> => {
  // Escape single quotes for shell, then escape \ and " for AppleScript string context
  const shellEscaped = directory.replace(/'/g, "'\\''");
  const asEscaped = escapeForAppleScript(shellEscaped);
  await runAppleScript(
    `tell application "Terminal" to do script "cd '${asEscaped}'"`,
  );
  await runAppleScript('tell application "Terminal" to activate');
};
