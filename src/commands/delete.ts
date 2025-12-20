import { projectExists, getDatabasePath } from '../utils/paths.js';
import * as lib from '../lib/db.js';
import { resolveTrackIdOrExit } from '../utils/resolve.js';

/**
 * Options for the delete command.
 */
export interface DeleteCommandOptions {
  force?: boolean;
}

/**
 * Delete a track and all its children.
 *
 * @param trackIdOrTitle - The track ID or title to delete
 * @param options - Command options (force flag)
 * @throws Error if project doesn't exist, track not found, or database operation fails
 */
export function deleteCommand(trackIdOrTitle: string, options: DeleteCommandOptions): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    process.exit(1);
  }

  try {
    const dbPath = getDatabasePath();

    // 2. Resolve track ID (supports ID or title)
    const trackId = resolveTrackIdOrExit(dbPath, trackIdOrTitle);

    // 3. Get track details
    const track = lib.getTrack(dbPath, trackId)!;

    // 4. Check if this is the root track
    if (track.parent_id === null) {
      console.error('Error: Cannot delete the root track (project).');
      console.error('Use "rm -rf .track" to delete the entire project.');
      process.exit(1);
    }

    // 5. Get child count for warning
    const childIds = lib.getChildTrackIds(dbPath, trackId);
    const hasChildren = childIds.length > 0;

    // 6. If not forced and has children, warn and exit
    if (!options.force && hasChildren) {
      console.error(`Warning: Track "${track.title}" has ${childIds.length} child track(s).`);
      console.error('All children will be deleted. Use --force to confirm.');
      process.exit(1);
    }

    // 7. Delete the track and all its children
    const deletedCount = lib.deleteTrack(dbPath, trackId);

    // 8. Output success message
    if (deletedCount === 1) {
      console.log(`Deleted track: ${trackId}`);
    } else {
      console.log(`Deleted ${deletedCount} tracks (including children)`);
    }
  } catch (error) {
    console.error('Error: Failed to delete track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
