import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { spawn } from 'child_process';
import { createServer as createNetServer } from 'net';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TrackManager } from '../../lib/index.js';
import { apiRoutes } from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  port?: number;
  host?: string;
  dbPath: string;
  trackDir: string;
}

export async function findAvailablePort(startPort: number = 3000): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.unref();
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.listen(startPort, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : startPort;
      server.close(() => resolve(port));
    });
  });
}

export function openBrowser(url: string): void {
  const platform = process.platform;
  let command: string;
  let args: string[];

  if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

export function getPidPath(trackDir: string): string {
  return join(trackDir, 'web.pid');
}

export function getPortPath(trackDir: string): string {
  return join(trackDir, 'web.port');
}

export function isServerRunning(trackDir: string): { running: boolean; pid?: number; port?: number } {
  const pidPath = getPidPath(trackDir);
  const portPath = getPortPath(trackDir);

  if (!existsSync(pidPath)) {
    return { running: false };
  }

  const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);

  // Check if process is actually running
  try {
    process.kill(pid, 0);
  } catch {
    // Process not running, clean up stale files
    try {
      unlinkSync(pidPath);
      if (existsSync(portPath)) unlinkSync(portPath);
    } catch {
      // Ignore cleanup errors
    }
    return { running: false };
  }

  const port = existsSync(portPath) ? parseInt(readFileSync(portPath, 'utf-8').trim(), 10) : undefined;

  return { running: true, pid, port };
}

export function stopServer(trackDir: string): boolean {
  const status = isServerRunning(trackDir);

  if (!status.running || !status.pid) {
    return false;
  }

  try {
    process.kill(status.pid, 'SIGTERM');
  } catch {
    // Process may have already exited
  }

  // Clean up PID and port files
  try {
    const pidPath = getPidPath(trackDir);
    const portPath = getPortPath(trackDir);
    if (existsSync(pidPath)) unlinkSync(pidPath);
    if (existsSync(portPath)) unlinkSync(portPath);
  } catch {
    // Ignore cleanup errors
  }

  return true;
}

export function daemonize(options: ServerOptions): void {
  const scriptPath = fileURLToPath(import.meta.url);

  const child = spawn(process.execPath, [scriptPath], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      TRACK_WEB_DAEMON: '1',
      TRACK_WEB_PORT: String(options.port ?? 0),
      TRACK_WEB_HOST: options.host ?? '127.0.0.1',
      TRACK_WEB_DB_PATH: options.dbPath,
      TRACK_WEB_TRACK_DIR: options.trackDir,
    },
  });

  child.unref();

  // Write PID immediately (port will be written by daemon once determined)
  if (child.pid) {
    writeFileSync(getPidPath(options.trackDir), String(child.pid));
  }
}

export async function runServer(options: ServerOptions): Promise<void> {
  const port = options.port || (await findAvailablePort());
  const host = options.host || '127.0.0.1';

  const manager = new TrackManager(options.dbPath);

  if (!manager.exists()) {
    console.error('Track database not found. Run "track init" first.');
    process.exit(1);
  }

  const app = new Hono();

  // Mount API routes
  app.route('/api/web', apiRoutes(manager));

  // Serve static files from dist/web
  const webDistPath = join(__dirname, '../../web');
  app.use(
    '/*',
    serveStatic({
      root: webDistPath,
    })
  );

  // SPA fallback - serve index.html for non-API routes
  app.get('*', async (c) => {
    const indexPath = join(webDistPath, 'index.html');
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, 'utf-8');
      return c.html(html);
    }
    return c.text('Web interface not built. Run "npm run build:web" first.', 404);
  });

  // Write port file for daemon
  writeFileSync(getPortPath(options.trackDir), String(port));

  console.log(`Track web server running at http://${host}:${port}`);

  serve({
    fetch: app.fetch,
    port,
    hostname: host,
  });
}

// Run as daemon if TRACK_WEB_DAEMON env is set
if (process.env.TRACK_WEB_DAEMON === '1') {
  const port = process.env.TRACK_WEB_PORT ? parseInt(process.env.TRACK_WEB_PORT, 10) : undefined;
  const host = process.env.TRACK_WEB_HOST;
  const dbPath = process.env.TRACK_WEB_DB_PATH;
  const trackDir = process.env.TRACK_WEB_TRACK_DIR;

  if (!dbPath || !trackDir) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  runServer({
    port: port || undefined,
    host,
    dbPath,
    trackDir,
  }).catch((err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}
