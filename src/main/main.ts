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

app.on('ready', () => {
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
  // Do NOT create a new window on activate — no default directory available.
  // Multi-window creation will be handled by second-instance in Story 5.2.
});
