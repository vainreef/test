import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, '..');

let command;
let args;
if (process.platform === 'win32') {
  command = 'powershell';
  args = [
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    path.join(scriptsDir, 'package-msix.ps1'),
  ];
} else if (process.platform === 'darwin') {
  command = process.execPath;
  args = [path.join(scriptsDir, 'package-msix-mac.mjs')];
} else {
  console.error('MSIX packaging is configured for macOS and Windows.');
  process.exit(1);
}

const result = spawnSync(command, args, {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
