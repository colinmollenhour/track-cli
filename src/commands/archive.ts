import { projectExists, getDatabasePath } from '../utils/paths.js';
import * as lib from '../lib/db.js';
import { ARCHIVABLE_STATUSES } from '../models/types.js';

/**
 * Archive a track.
 * Only tracks with status done, on_hold, or superseded can be archived.
 *
 * @param trackId - The track ID to archive
 * @throws Error if project doesn't exist, track not found, or status not archivable
 */
export function archiveCommand(trackId: string): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    process.exit(1);
  }

  try {
    const dbPath = getDatabasePath();
    lib.migrateDatabase(dbPath);

    // 2. Check if track exists
    const track = lib.getTrack(dbPath, trackId);
    if (!track) {
      console.error(`Error: Unknown track id: ${trackId}`);
      process.exit(1);
    }

    // 3. Check if already archived
    if (track.archived === 1) {
      console.error(`Error: Track "${track.title}" is already archived.`);
      process.exit(1);
    }

    // 4. Check if status is archivable
    if (!ARCHIVABLE_STATUSES.includes(track.status)) {
      console.error(`Error: Cannot archive track with status "${track.status}".`);
      console.error(`Only tracks with status: ${ARCHIVABLE_STATUSES.join(', ')} can be archived.`);
      process.exit(1);
    }

    // 5. Archive the track
    lib.setArchived(dbPath, trackId, true);

    // 6. Output success message
    console.log(`Archived: ${track.title}`);
  } catch (error) {
    console.error('Error: Failed to archive track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

/**
 * Unarchive a track.
 * Restores an archived track to normal visibility.
 *
 * @param trackId - The track ID to unarchive
 * @throws Error if project doesn't exist, track not found, or not archived
 */
export function unarchiveCommand(trackId: string): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    process.exit(1);
  }

  try {
    const dbPath = getDatabasePath();
    lib.migrateDatabase(dbPath);

    // 2. Check if track exists
    const track = lib.getTrack(dbPath, trackId);
    if (!track) {
      console.error(`Error: Unknown track id: ${trackId}`);
      process.exit(1);
    }

    // 3. Check if actually archived
    if (track.archived === 0) {
      console.error(`Error: Track "${track.title}" is not archived.`);
      process.exit(1);
    }

    // 4. Unarchive the track
    lib.setArchived(dbPath, trackId, false);

    // 5. Output success message
    console.log(`Unarchived: ${track.title}`);
  } catch (error) {
    console.error('Error: Failed to unarchive track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
