#!/usr/bin/env node
// This file is CJS (no "type": "module" in package.json)
const { Command } = require('commander');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const pkg = require('../package.json');

const program = new Command();

program
  .name('awesome-md')
  .description('Read-only Markdown viewer for macOS')
  .version(pkg.version)
  .argument('[directory]', 'Directory to browse', '.')
  .option('-t, --title <title>', 'Window title')
  .action((directory, options) => {
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

    // Find electron binary
    const electronPath = require.resolve('electron/cli.js');

    // Spawn Electron with --dir and --title args
    const child = spawn(
      process.execPath,
      [electronPath, '.', '--dir', resolvedDir, '--title', title],
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

program.parse();
