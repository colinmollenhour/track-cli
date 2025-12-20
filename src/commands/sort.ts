import { projectExists, getDatabasePath } from '../utils/paths.js';
import * as lib from '../lib/db.js';
import { resolveTrackIdOrExit } from '../utils/resolve.js';

/**
 * Move a track before or after another track.
 *
 * @param trackIdOrTitle - Track ID or title to move
 * @param position - 'before' or 'after'
 * @param targetIdOrTitle - Target track ID or title
 * @throws Error if project doesn't exist, tracks not found, or operation fails
 */
export function sortCommand(
  trackIdOrTitle: string,
  position: string,
  targetIdOrTitle: string
): void {
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

    // 3. Resolve track IDs (supports ID or title)
    const trackId = resolveTrackIdOrExit(dbPath, trackIdOrTitle);
    const targetId = resolveTrackIdOrExit(dbPath, targetIdOrTitle, 'target track');

    // 4. Get track details
    const track = lib.getTrack(dbPath, trackId)!;
    const target = lib.getTrack(dbPath, targetId)!;

    // 5. Check they have the same parent
    if (track.parent_id !== target.parent_id) {
      console.error('Error: Tracks must have the same parent.');
      console.error(`Track "${track.title}" parent: ${track.parent_id ?? '(root)'}`);
      console.error(`Target "${target.title}" parent: ${target.parent_id ?? '(root)'}`);
      process.exit(1);
    }

    // 6. Move the track
    lib.moveTrack(dbPath, trackId, targetId, position);

    // 7. Success message
    console.log(`Moved "${track.title}" ${position} "${target.title}"`);
  } catch (error) {
    console.error('Error: Failed to move track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
