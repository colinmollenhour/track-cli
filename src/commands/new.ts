import { projectExists } from '../utils/paths.js';
import { generateId } from '../utils/id.js';
import { getCurrentTimestamp } from '../utils/timestamp.js';
import { createTrack, trackExists, addTrackFiles } from '../storage/database.js';
import type { CreateTrackParams } from '../models/types.js';

/**
 * Options for the new command.
 */
export interface NewCommandOptions {
  parent?: string;
  summary: string;
  next: string;
  file?: string[];
}

/**
 * Create a new track (feature or task).
 *
 * @param title - Track title
 * @param options - Command options (parent, summary, next_prompt, files)
 * @throws Error if validation fails or track creation fails
 */
export function newCommand(title: string, options: NewCommandOptions): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    process.exit(1);
  }

  // 2. Validate title is non-empty
  if (!title || title.trim().length === 0) {
    console.error('Error: Track title cannot be empty.');
    process.exit(1);
  }

  // 3. Validate parent_id if provided
  if (options.parent) {
    if (!trackExists(options.parent)) {
      console.error(`Error: Unknown track id: ${options.parent}`);
      console.error('The specified parent track does not exist.');
      process.exit(1);
    }
  }

  try {
    // 4. Generate ID and timestamp
    const trackId = generateId();
    const now = getCurrentTimestamp();

    // 5. Build CreateTrackParams
    const newTrack: CreateTrackParams = {
      id: trackId,
      title: title.trim(),
      parent_id: options.parent || null,
      summary: options.summary || '',
      next_prompt: options.next || '',
      status: 'planned',
      created_at: now,
      updated_at: now,
    };

    // 6. Create track in database
    createTrack(newTrack);

    // 7. Add file associations if provided
    if (options.file && options.file.length > 0) {
      addTrackFiles(trackId, options.file);
    }

    // 8. Success message
    console.log(`Created track: ${title}`);
    console.log(`Track ID: ${trackId}`);
    if (options.parent) {
      console.log(`Parent: ${options.parent}`);
    }
    if (options.file && options.file.length > 0) {
      console.log(`Files: ${options.file.length} file(s) associated`);
    }
  } catch (error) {
    console.error('Error: Failed to create track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
