import { resolve } from 'path';
import {
  isServerRunning,
  stopServer,
  daemonize,
  openBrowser,
  findAvailablePort,
  getPortPath,
} from '../web/server/index.js';
import { existsSync, readFileSync } from 'fs';

function findTrackDir(): string | null {
  let dir = process.cwd();
  while (dir !== '/') {
    const trackDir = resolve(dir, '.track');
    if (existsSync(trackDir)) {
      return trackDir;
    }
    dir = resolve(dir, '..');
  }
  return null;
}

export async function webCommand(
  action: string | undefined,
  options: { port?: number; host?: string }
): Promise<void> {
  const trackDir = findTrackDir();

  if (!trackDir) {
    console.error('Error: Not in a track project. Run "track init" first.');
    process.exit(1);
  }

  const dbPath = resolve(trackDir, 'track.db');
  const resolvedAction = action || 'start';

  if (resolvedAction === 'stop') {
    const status = isServerRunning(trackDir);
    if (!status.running) {
      console.log('Web server is not running.');
      return;
    }

    const stopped = stopServer(trackDir);
    if (stopped) {
      console.log('Web server stopped.');
    } else {
      console.error('Failed to stop web server.');
      process.exit(1);
    }
    return;
  }

  if (resolvedAction === 'start') {
    const status = isServerRunning(trackDir);
    if (status.running && status.port) {
      const host = options.host || '127.0.0.1';
      console.log(`Web server already running at http://${host}:${status.port}`);
      openBrowser(`http://${host}:${status.port}`);
      return;
    }

    // Determine port
    const port = options.port || (await findAvailablePort());
    const host = options.host || '127.0.0.1';

    // Start daemon
    daemonize({
      port,
      host,
      dbPath,
      trackDir,
    });

    // Wait a moment for daemon to start and write port file
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Read actual port from file (in case auto-assigned)
    const portPath = getPortPath(trackDir);
    let actualPort = port;
    if (existsSync(portPath)) {
      actualPort = parseInt(readFileSync(portPath, 'utf-8').trim(), 10);
    }

    const url = `http://${host}:${actualPort}`;
    console.log(`Web server started at ${url}`);
    openBrowser(url);
    return;
  }

  console.error(`Error: Unknown action: ${resolvedAction}`);
  console.error('Available actions: start, stop');
  process.exit(1);
}
