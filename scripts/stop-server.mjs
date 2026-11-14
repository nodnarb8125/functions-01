import { readFileSync, readlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function developmentPort() {
  const envPath = path.join(projectRoot, '.env.json');
  const config = JSON.parse(readFileSync(envPath, 'utf8'));
  return Number(config.development?.PORT ?? 3456);
}

function processCwd(pid) {
  try {
    return readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    return null;
  }
}

function pidsMatching(pattern) {
  try {
    const out = execFileSync('pgrep', ['-f', pattern], { encoding: 'utf8' }).trim();
    return out ? out.split(/\s+/).map((id) => Number(id)) : [];
  } catch {
    return [];
  }
}

function killPid(pid, signal = 'SIGTERM') {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

function killPort(port) {
  try {
    execFileSync('fuser', ['-k', `${port}/tcp`], { stdio: 'ignore' });
  } catch {
    // Nothing listening.
  }
}

function stopProjectDevProcesses() {
  const patterns = [
    'env-cmd -f .env.json -e development',
    'node --watch src/index.js',
  ];

  const candidates = new Set();
  for (const pattern of patterns) {
    for (const pid of pidsMatching(pattern)) {
      if (pid === process.ppid || pid === process.pid) continue;
      candidates.add(pid);
    }
  }

  for (const pid of candidates) {
    if (processCwd(pid) !== projectRoot) continue;
    killPid(pid);
  }
}

const port = developmentPort();
stopProjectDevProcesses();
killPort(port);