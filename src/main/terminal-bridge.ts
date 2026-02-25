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

/** Get the TTY device path for a given PID (e.g. "/dev/ttys003"). */
const getTtyForPid = async (pid: number): Promise<string | null> => {
  try {
    const { stdout } = await execFileAsync('ps', ['-p', String(pid), '-o', 'tty=']);
    const tty = stdout.trim();
    if (!tty || tty === '??') return null;
    return `/dev/${tty}`;
  } catch {
    return null;
  }
};

/** Activate the specific Terminal.app window/tab matching the given TTY. */
const activateTerminalAppTab = async (tty: string): Promise<boolean> => {
  const safeTty = escapeForAppleScript(tty);
  const result = await runAppleScript(`
    tell application "Terminal"
      repeat with w in windows
        repeat with t in tabs of w
          if tty of t is "${safeTty}" then
            set selected tab of w to t
            set index of w to 1
            activate
            return "found"
          end if
        end repeat
      end repeat
    end tell
    return "notfound"
  `);
  return result === 'found';
};

/** Activate the specific iTerm2 session matching the given TTY. */
const activateITerm2Session = async (tty: string): Promise<boolean> => {
  const safeTty = escapeForAppleScript(tty);
  const result = await runAppleScript(`
    tell application "iTerm2"
      repeat with w in windows
        repeat with t in tabs of w
          repeat with s in sessions of t
            if tty of s is "${safeTty}" then
              select t
              set index of w to 1
              activate
              return "found"
            end if
          end repeat
        end repeat
      end repeat
    end tell
    return "notfound"
  `);
  return result === 'found';
};

export const activateTerminal = async (
  pid: number,
  bundleId: string,
  directory: string,
): Promise<{ activated: boolean }> => {
  if (!isProcessAlive(pid)) {
    await openNewTerminal(directory);
    return { activated: false };
  }

  // Try to find and focus the exact tab via TTY
  const tty = await getTtyForPid(pid);
  if (tty) {
    if (bundleId === 'com.apple.Terminal') {
      const found = await activateTerminalAppTab(tty);
      if (found) return { activated: true };
    } else if (bundleId === 'com.googlecode.iterm2') {
      const found = await activateITerm2Session(tty);
      if (found) return { activated: true };
    }
  }

  // Fallback: just activate the app (Warp, unknown terminals, or TTY lookup failed)
  const safeBundleId = escapeForAppleScript(bundleId);
  await runAppleScript(`tell application id "${safeBundleId}" to activate`);
  return { activated: true };
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
