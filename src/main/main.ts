import { app, protocol, net } from 'electron';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerIpcHandlers } from './ipc-handlers';
import { parseCliArgs } from './cli-args';
import { WindowManager } from './window-manager';

// Use the system DNS resolver instead of Chromium's built-in c-ares resolver,
// which has a use-after-free bug causing Chrome_IOThread crashes on macOS.
app.commandLine.appendSwitch('disable-features', 'AsyncDns');

// Must be called before app.ready — registers custom protocol for serving local images
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
    },
  },
]);

const windowManager = new WindowManager();

// Chromium rearranges argv in second-instance events, separating flags from
// their values. To work around this, the second instance writes its raw argv
// to a temp file before requesting the lock. The first instance reads it back
// in the second-instance handler.
const PENDING_ARGS_PATH = join(tmpdir(), 'awesome-md-pending-args.json');
try {
  writeFileSync(PENDING_ARGS_PATH, JSON.stringify(process.argv));
} catch {
  // Non-critical — first instance doesn't need the file
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    let args = parseCliArgs([]);
    try {
      const rawArgv: string[] = JSON.parse(readFileSync(PENDING_ARGS_PATH, 'utf-8'));
      unlinkSync(PENDING_ARGS_PATH);
      args = parseCliArgs(rawArgv);
    } catch {
      // File missing or parse error — no args to process
    }
    if (args.directory) {
      const win = windowManager.create({
        directory: args.directory,
        title: args.title,
        terminalPid: args.terminalPid,
        terminalBundleId: args.terminalBundleId,
      });
      app.focus();
      win.focus();
    }
  });

  app.on('ready', () => {
    app.setAboutPanelOptions({
      applicationName: 'awesome-md',
      applicationVersion: app.getVersion(),
      copyright: 'Latentti Oy — Ari Hietamäki',
    });

    const appConfig = parseCliArgs();

    protocol.handle('local-file', async (request) => {
      try {
        const url = new URL(request.url);
        const filePath = decodeURIComponent(url.pathname);
        return await net.fetch(`file://${filePath}`);
      } catch {
        return new Response('Not found', { status: 404 });
      }
    });

    registerIpcHandlers(windowManager);

    windowManager.create({
      directory: appConfig.directory,
      title: appConfig.title,
      terminalPid: appConfig.terminalPid,
      terminalBundleId: appConfig.terminalBundleId,
    });
  });

  app.on('before-quit', () => {
    for (const ctx of windowManager.getAll()) {
      ctx.watcher?.close();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // No default directory available — windows are created via CLI args or second-instance.
  });
}
