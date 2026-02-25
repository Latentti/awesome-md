#!/usr/bin/env node
// This file is CJS (no "type": "module" in package.json)
const { Command } = require('commander');
const path = require('node:path');
const fs = require('node:fs');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const pkg = require('../package.json');

const execFileAsync = promisify(execFile);

async function getTerminalInfo() {
  try {
    // Walk up the process tree from our parent until we find a process with a macOS bundle ID.
    // Tree can be deep: node → claude → zsh → login → Terminal.app
    let currentPid = process.ppid;

    for (let depth = 0; depth < 10; depth++) {
      if (currentPid <= 1) return null;

      // Check if this process has a bundle ID
      const { stdout: bundleOut } = await execFileAsync('lsappinfo', ['info', '-only', 'bundleid', String(currentPid)]);
      // Output format: "CFBundleIdentifier"="com.apple.Terminal" (or [ NULL ] if no bundle)
      const match = bundleOut.match(/=\s*"([^"]+)"/);
      if (match) {
        return { pid: currentPid, bundleId: match[1] };
      }

      // No bundle ID — walk up one level
      const { stdout: ppidOut } = await execFileAsync('ps', ['-o', 'ppid=', '-p', String(currentPid)]);
      const parentPid = parseInt(ppidOut.trim(), 10);
      if (isNaN(parentPid) || parentPid <= 1) return null;

      currentPid = parentPid;
    }

    return null;
  } catch {
    return null;
  }
}

const program = new Command();

program
  .name('awesome-md')
  .description('Read-only Markdown viewer for macOS')
  .version(pkg.version)
  .argument('[directory]', 'Directory to browse', '.')
  .option('-t, --title <title>', 'Window title')
  .action(async (directory, options) => {
    const resolvedDir = path.resolve(directory);

    // Validate directory exists
    if (!fs.existsSync(resolvedDir)) {
      process.stderr.write(`Error: Directory not found: ${resolvedDir}\n`);
      process.exit(1);
    }

    // Validate path is a directory
    const stat = fs.statSync(resolvedDir);
    if (!stat.isDirectory()) {
      process.stderr.write(`Error: Not a directory: ${resolvedDir}\n`);
      process.exit(1);
    }

    // Default title to directory basename
    const title = options.title || path.basename(resolvedDir);

    // Detect terminal that launched this CLI
    const terminalInfo = await getTerminalInfo();

    // Find electron binary
    const electronPath = require.resolve('electron/cli.js');

    // Build spawn args — include terminal info if detected
    const spawnArgs = [electronPath, '.', '--dir', resolvedDir, '--title', title];
    if (terminalInfo) {
      spawnArgs.push('--terminal-pid', String(terminalInfo.pid));
      spawnArgs.push('--terminal-bundle-id', terminalInfo.bundleId);
    }

    // Spawn Electron
    const child = spawn(
      process.execPath,
      spawnArgs,
      {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      }
    );

    child.on('error', (err) => {
      process.stderr.write(`Error: Failed to launch Electron: ${err.message}\n`);
      process.exit(1);
    });

    child.on('close', (code) => {
      process.exit(code || 0);
    });
  });

program.parseAsync();
