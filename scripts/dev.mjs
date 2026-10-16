import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const processes = [
  spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit', env: process.env }),
  spawn(isWindows ? 'pnpm.cmd' : 'pnpm', ['run', 'dev:frontend'], { stdio: 'inherit', env: process.env, shell: isWindows }),
];

let shuttingDown = false;
const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  processes.forEach((child) => child.kill());
  process.exit(code);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
processes.forEach((child) => child.on('exit', (code) => {
  if (!shuttingDown && code && code !== 0) shutdown(code);
}));
