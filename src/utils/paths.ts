import { join, dirname, resolve, basename } from 'path';
import { existsSync, statSync } from 'fs';
import { execSync } from 'child_process';

/**
 * Name of the track directory created at project root.
 */
export const TRACK_DIR = '.track';

/**
 * Name of the SQLite database file.
 */
export const DB_FILE = 'track.db';

/**
 * Get the main repo root (parent of .git common dir).
 * When running from a worktree, this returns the main repository's root.
 * When running from the main repo, this returns the current directory.
 *
 * @returns Absolute path to the main project root
 */
export function getProjectRoot(): string {
  const cwd = process.cwd();
  const gitPath = join(cwd, '.git');

  // If .git doesn't exist or is a file (worktree indicator)
  if (!existsSync(gitPath) || statSync(gitPath).isFile()) {
    try {
      const commonDir = execSync('git rev-parse --git-common-dir', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();

      // --git-common-dir returns path to .git of main repo
      // Go up one level to get project root
      if (commonDir && commonDir !== '.git') {
        return dirname(resolve(cwd, commonDir));
      }
    } catch {
      // Not in a git repo, fall back to cwd
    }
  }

  return cwd;
}

/**
 * Get current worktree name (null if in main repo).
 *
 * @returns Worktree name (directory basename) or null if in main repo
 */
export function getCurrentWorktree(): string | null {
  try {
    const toplevel = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const commonDir = execSync('git rev-parse --git-common-dir', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const mainRoot = dirname(resolve(process.cwd(), commonDir));

    // If toplevel differs from main root, we're in a worktree
    if (toplevel !== mainRoot) {
      return basename(toplevel); // Use directory name as worktree name
    }
  } catch {
    // Not in git repo
  }
  return null;
}

/**
 * Get the path to the .track directory.
 * Uses getProjectRoot() to find the main repo root, ensuring worktrees share the same database.
 *
 * @returns Absolute path to .track directory
 */
export function getTrackDir(): string {
  return join(getProjectRoot(), TRACK_DIR);
}

/**
 * Get the path to the SQLite database file.
 *
 * @returns Absolute path to track.db file
 */
export function getDatabasePath(): string {
  return join(getTrackDir(), DB_FILE);
}

/**
 * Check if a track project exists in the current directory.
 *
 * @returns true if .track directory exists
 */
export function projectExists(): boolean {
  return existsSync(getTrackDir());
}
