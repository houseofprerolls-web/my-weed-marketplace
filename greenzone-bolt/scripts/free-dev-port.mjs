/**
 * Free a TCP listen port on Windows by killing owning PIDs (repeat until clear).
 * Falls back to kill-port on non-Windows. Used by npm run dev:fresh.
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = process.argv[2] || '3000';
const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync wait — reliable when shell `timeout`/`sleep` hangs in CI */
  }
}

function pidsListeningOnPortWin() {
  let out = '';
  try {
    out = execSync(`netstat -ano | findstr "LISTENING" | findstr ":${port} "`, {
      encoding: 'utf8',
      shell: true,
      timeout: 12_000,
      maxBuffer: 2_000_000,
    });
  } catch {
    return [];
  }
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    const m = line.trim().split(/\s+/);
    const pid = m[m.length - 1];
    if (pid && /^\d+$/.test(pid)) pids.add(pid);
  }
  return [...pids];
}

if (os.platform() !== 'win32') {
  execSync(`npx --yes kill-port@2.0.1 ${port}`, { stdio: 'inherit', cwd: rootDir });
  process.exit(0);
}

for (let i = 0; i < 6; i++) {
  const pids = pidsListeningOnPortWin();
  if (pids.length === 0) {
    sleepMs(600);
    process.exit(0);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore', shell: true, timeout: 15_000 });
    } catch {
      /* ignore */
    }
  }
  sleepMs(1200);
}

const left = pidsListeningOnPortWin();
if (left.length) {
  console.error(`free-dev-port: port ${port} still in use by PID(s): ${left.join(', ')}`);
  console.error('Close other terminals running `next dev` or another app on this port.');
  process.exit(1);
}
process.exit(0);
