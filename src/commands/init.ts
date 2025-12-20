import { rmSync } from 'fs';
import { projectExists, getTrackDir, getDatabasePath } from '../utils/paths.js';
import { generateId } from '../utils/id.js';
import { getCurrentTimestamp } from '../utils/timestamp.js';
import { detectProjectName } from '../utils/project-name.js';
import * as lib from '../lib/db.js';
import type { CreateTrackParams } from '../models/types.js';

/**
 * Initialize a new track project in the current directory.
 *
 * Creates .track/ directory and track.db SQLite database,
 * then creates a root track (the project itself).
 *
 * @param name - Optional project name (defaults to current directory name)
 * @param force - If true, overwrite existing .track directory
 * @throws Error if project already exists (and force is false) or initialization fails
 */
export function initCommand(name?: string, force?: boolean): void {
  // Check if project already exists
  if (projectExists()) {
    if (force) {
      // Remove existing .track directory
      console.log('Removing existing .track directory...');
      rmSync(getTrackDir(), { recursive: true, force: true });
    } else {
      console.error('Error: Track project already exists in this directory.');
      console.error('A .track/ directory is already present.');
      console.error('Use --force to overwrite.');
      process.exit(1);
    }
  }

  // Determine project name (auto-detect from package.json/pyproject.toml if not provided)
  const projectName = name || detectProjectName();

  try {
    const dbPath = getDatabasePath();

    // Initialize database and schema
    lib.initializeDatabase(dbPath);

    // Create root track (the project)
    const now = getCurrentTimestamp();
    const rootTrack: CreateTrackParams = {
      id: generateId(),
      title: projectName,
      parent_id: null, // Root track has no parent
      summary: '',
      next_prompt: '',
      status: 'planned',
      worktree: null, // Root track has no worktree by default
      sort_order: 0,
      archived: 0,
      created_at: now,
      updated_at: now,
      completed_at: null,
    };

    lib.createTrack(dbPath, rootTrack);

    // Success message
    console.log(`Initialized track project: ${projectName}`);
    console.log(`Project ID: ${rootTrack.id}`);
    console.log(`Database: .track/track.db`);
  } catch (error) {
    // Clean up on error would be nice, but for v1 we'll keep it simple
    console.error('Error: Failed to initialize track project.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
