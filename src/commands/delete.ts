import { projectExists, getDatabasePath } from '../utils/paths.js';
import * as lib from '../lib/db.js';

/**
 * Delete a track and all its descendants (cascade delete).
 *
 * @param trackId - The track ID to delete
 * @throws Error if project doesn't exist, track not found, or is root track
 */
export function deleteCommand(trackId: string): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    process.exit(1);
  }

  try {
    const dbPath = getDatabasePath();

    // 2. Validate track exists
    if (!lib.trackExists(dbPath, trackId)) {
      console.error(`Error: Unknown track id: ${trackId}`);
      process.exit(1);
    }

    // 3. Prevent root track deletion
    const rootTrack = lib.getRootTrack(dbPath);
    if (rootTrack && rootTrack.id === trackId) {
      console.error('Error: Cannot delete the root track.');
      console.error('Use "track update" to modify the project track instead.');
      process.exit(1);
    }

    // 4. Get descendant count for message
    const descendants = lib.getDescendantIds(dbPath, trackId);
    const totalCount = 1 + descendants.length;

    // 5. Delete track and descendants
    lib.deleteTrack(dbPath, trackId);

    // 6. Output success message
    if (descendants.length > 0) {
      console.log(
        `Deleted ${totalCount} tracks (${trackId} and ${descendants.length} descendants)`
      );
    } else {
      console.log(`Deleted track: ${trackId}`);
    }
  } catch (error) {
    console.error('Error: Failed to delete track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
