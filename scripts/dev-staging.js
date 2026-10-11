// scripts/dev-staging.js
// Launches the Vite development server explicitly configured to proxy /api to the local staging Worker.

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const viteBin = join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

const proxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8787';

// Strict safety check: Never allow staging launcher to proxy to production Cloudflare Worker
if (proxyTarget.includes('silachomka-api.samueljohnibrotech.workers.dev') || proxyTarget.includes('workers.dev')) {
  console.error('[FATAL SAFETY ABORT] Staging launcher refused to start: proxy target cannot be the production Worker URL!');
  console.error(`Target specified: ${proxyTarget}`);
  process.exit(1);
}

console.log('=== STARTING FRONTEND DEV SERVER (STAGING PROXY) ===');
console.log(`[CONFIG] /api proxy target configured explicitly to: ${proxyTarget}\n`);

const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1'], {
  cwd: rootDir,
  env: {
    ...process.env,
    VITE_API_PROXY_TARGET: proxyTarget
  },
  stdio: 'inherit'
});

process.on('SIGINT', () => {
  if (child && !child.killed) child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (child && !child.killed) child.kill('SIGTERM');
  process.exit(0);
});

child.on('error', (err) => {
  console.error('[FATAL FRONTEND SPAWN ERROR]:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
