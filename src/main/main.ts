import { app, protocol, net } from 'electron';
import { registerIpcHandlers } from './ipc-handlers';
import { parseCliArgs } from './cli-args';
import { WindowManager } from './window-manager';

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

// Pass raw argv via additionalData — Chromium rearranges the argv array
// in second-instance events, separating flags from their values.
const gotLock = app.requestSingleInstanceLock({ rawArgv: process.argv });

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, _argv, _workingDir, additionalData) => {
    const rawArgv = (additionalData as { rawArgv?: string[] })?.rawArgv;
    const args = parseCliArgs(rawArgv ?? []);
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
