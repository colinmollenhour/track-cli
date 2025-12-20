import { projectExists, getDatabasePath } from '../utils/paths.js';
import * as lib from '../lib/db.js';

/**
 * Move a track before or after another track.
 *
 * @param trackId - Track ID to move
 * @param position - 'before' or 'after'
 * @param targetId - Target track ID
 * @throws Error if project doesn't exist, tracks not found, or operation fails
 */
export function sortCommand(trackId: string, position: string, targetId: string): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    process.exit(1);
  }

  // 2. Validate position
  if (position !== 'before' && position !== 'after') {
    console.error(`Error: Invalid position '${position}'.`);
    console.error('Use "before" or "after".');
    process.exit(1);
  }

  try {
    const dbPath = getDatabasePath();

    // 3. Check if tracks exist
    const track = lib.getTrack(dbPath, trackId);
    if (!track) {
      console.error(`Error: Unknown track id: ${trackId}`);
      process.exit(1);
    }

    const target = lib.getTrack(dbPath, targetId);
    if (!target) {
      console.error(`Error: Unknown target track id: ${targetId}`);
      process.exit(1);
    }

    // 4. Check they have the same parent
    if (track.parent_id !== target.parent_id) {
      console.error('Error: Tracks must have the same parent.');
      console.error(`Track "${track.title}" parent: ${track.parent_id ?? '(root)'}`);
      console.error(`Target "${target.title}" parent: ${target.parent_id ?? '(root)'}`);
      process.exit(1);
    }

    // 5. Move the track
    lib.moveTrack(dbPath, trackId, targetId, position);

    // 6. Success message
    console.log(`Moved "${track.title}" ${position} "${target.title}"`);
  } catch (error) {
    console.error('Error: Failed to move track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
