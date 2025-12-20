import { projectExists, getDatabasePath, getCurrentWorktree } from '../utils/paths.js';
import * as lib from '../lib/db.js';
import { buildTrackTree } from '../models/tree.js';
import { ACTIVE_STATUSES } from '../models/types.js';
import type { TrackWithDetails } from '../models/types.js';
import { TREE, colorKind, colorStatus, formatLabel, getTerminalWidth } from '../utils/format.js';

/**
 * Options for the status command.
 */
export interface StatusCommandOptions {
  json?: boolean;
  all?: boolean;
  worktree?: string | boolean; // true means use current, string means specific name
}

/**
 * Display the current state of the project and all tracks.
 *
 * @param trackId - Optional track ID to show status for (with descendants)
 * @param options - Command options (json flag)
 * @throws Error if project doesn't exist or database query fails
 */
export function statusCommand(trackId: string | undefined, options: StatusCommandOptions): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    process.exit(1);
  }

  try {
    const dbPath = getDatabasePath();

    // 2. If a specific track ID is provided, show that track and its descendants
    if (trackId) {
      // Validate track exists
      if (!lib.trackExists(dbPath, trackId)) {
        console.error(`Error: Unknown track id: ${trackId}`);
        process.exit(1);
      }

      // Get the specified track and all its descendants
      const allTracks = options.all
        ? lib.getAllTracks(dbPath)
        : lib.getTracksByStatus(dbPath, ACTIVE_STATUSES);

      // Build descendant set
      const descendantIds = new Set<string>();
      const collectDescendants = (id: string) => {
        descendantIds.add(id);
        const children = allTracks.filter((t) => t.parent_id === id);
        for (const child of children) {
          collectDescendants(child.id);
        }
      };
      collectDescendants(trackId);

      // Filter to only include the specified track and its descendants
      let tracks = allTracks.filter((t) => descendantIds.has(t.id));

      // Always include the target track even if it's not active
      const targetTrack = lib.getTrack(dbPath, trackId);
      if (targetTrack && !tracks.find((t) => t.id === trackId)) {
        tracks = [targetTrack, ...tracks];
      }

      // Load file and dependency maps
      const fileMap = lib.getAllTrackFiles(dbPath);
      const dependencyMap = lib.getAllDependencies(dbPath);

      // Build tree structure
      const tracksWithDetails = buildTrackTree(tracks, fileMap, dependencyMap);

      // Output in requested format
      if (options.json) {
        outputJson(tracksWithDetails);
      } else {
        outputHuman(tracksWithDetails, trackId);
      }
      return;
    }

    // 3. Determine worktree filter
    let worktreeFilter: string | null = null;
    if (options.worktree !== undefined) {
      if (options.worktree === true) {
        // --worktree flag without value: use auto-detected current worktree
        worktreeFilter = getCurrentWorktree();
        if (!worktreeFilter) {
          console.error('Error: Not in a git worktree. Use --worktree <name> to filter by name.');
          process.exit(1);
        }
      } else if (typeof options.worktree === 'string') {
        // --worktree <name>: use specified worktree
        worktreeFilter = options.worktree;
      }
    }

    // 4. Load tracks from database (filtered by default, all with --all flag)
    let tracks = options.all
      ? lib.getAllTracks(dbPath)
      : lib.getTracksByStatus(dbPath, ACTIVE_STATUSES);

    // 5. Apply worktree filter if specified
    if (worktreeFilter) {
      tracks = tracks.filter((t) => t.worktree === worktreeFilter);
    }

    // 6. Include root track for project context, but only if it's active
    if (!options.all) {
      const rootTrack = lib.getRootTrack(dbPath);
      if (
        rootTrack &&
        !tracks.find((t) => t.id === rootTrack.id) &&
        ACTIVE_STATUSES.includes(rootTrack.status)
      ) {
        tracks = [rootTrack, ...tracks];
      }
    }

    // 7. Load all track-file associations
    const fileMap = lib.getAllTrackFiles(dbPath);

    // 8. Load all dependencies
    const dependencyMap = lib.getAllDependencies(dbPath);

    // 9. Build tree structure with derived fields
    const tracksWithDetails = buildTrackTree(tracks, fileMap, dependencyMap);

    // 10. Output in requested format
    if (options.json) {
      outputJson(tracksWithDetails);
    } else {
      outputHuman(tracksWithDetails);
    }
  } catch (error) {
    console.error('Error: Failed to retrieve project status.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

/**
 * Output tracks in JSON format.
 */
function outputJson(tracks: TrackWithDetails[]): void {
  const output = {
    tracks,
  };
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Output tracks in human-readable tree format.
 *
 * @param tracks - Tracks to display
 * @param startFromId - Optional track ID to start the tree from (instead of root)
 */
function outputHuman(tracks: TrackWithDetails[], startFromId?: string): void {
  // Find the starting track
  const startTrack = startFromId
    ? tracks.find((t) => t.id === startFromId)
    : tracks.find((t) => t.parent_id === null);

  if (!startTrack) {
    console.log('No tracks found.');
    return;
  }

  // Build a map for quick child lookup
  const trackMap = new Map<string, TrackWithDetails>();
  for (const track of tracks) {
    trackMap.set(track.id, track);
  }

  // Get terminal width once for the entire output
  const terminalWidth = getTerminalWidth();

  // Print header
  if (startFromId) {
    console.log(`Track: ${startTrack.title} (${startTrack.id})`);
  } else {
    console.log(`Project: ${startTrack.title} (${startTrack.id})`);
  }
  console.log();

  // Print tree starting from start track
  printTrack(startTrack, trackMap, [], true, terminalWidth);
}

/**
 * Recursively print a track and its children with indentation.
 *
 * @param track - Track to print
 * @param trackMap - Map of all tracks for child lookup
 * @param prefixParts - Prefix parts for tree rendering
 * @param isLast - Whether this is the last child
 * @param terminalWidth - Terminal width for text wrapping
 */
function printTrack(
  track: TrackWithDetails,
  trackMap: Map<string, TrackWithDetails>,
  prefixParts: string[],
  isLast: boolean,
  terminalWidth: number
): void {
  const nodePrefix = prefixParts.join('') + (isLast ? TREE.LAST : TREE.BRANCH) + ' ';
  const detailsPrefix = prefixParts.join('') + (isLast ? TREE.SPACE : TREE.PIPE) + '  ';

  // Calculate available width for label content
  const prefixVisualWidth = detailsPrefix.length;
  const labelOptions = {
    labelWidth: 8,
    maxWidth: terminalWidth - prefixVisualWidth,
    continuationIndent: detailsPrefix,
  };

  const worktreeSuffix = track.worktree ? ` @${track.worktree}` : '';
  console.log(
    `${nodePrefix}[${colorKind(track.kind)}] ${track.id} - ${track.title}${worktreeSuffix}`
  );

  console.log(`${detailsPrefix}${formatLabel('summary:', track.summary, labelOptions)}`);
  console.log(`${detailsPrefix}${formatLabel('next:', track.next_prompt, labelOptions)}`);
  console.log(`${detailsPrefix}${formatLabel('status:', colorStatus(track.status), labelOptions)}`);

  if (track.files.length > 0) {
    console.log(`${detailsPrefix}${formatLabel('files:', track.files.join(', '), labelOptions)}`);
  }

  if (track.blocks.length > 0) {
    console.log(`${detailsPrefix}${formatLabel('blocks:', track.blocks.join(', '), labelOptions)}`);
  }

  if (track.blocked_by.length > 0) {
    console.log(
      `${detailsPrefix}${formatLabel('blocked by:', track.blocked_by.join(', '), labelOptions)}`
    );
  }

  const children = track.children.filter(Boolean);
  if (children.length > 0) {
    console.log();
  }

  for (let i = 0; i < children.length; i++) {
    const childId = children[i];
    if (!childId) continue;
    const child = trackMap.get(childId);
    if (!child) continue;

    const childIsLast = i === children.length - 1;
    const childPrefixParts = [...prefixParts, isLast ? TREE.SPACE : TREE.PIPE];

    printTrack(child, trackMap, childPrefixParts, childIsLast, terminalWidth);
    if (i < children.length - 1) {
      console.log();
    }
  }
}
