import { projectExists, getDatabasePath, getCurrentWorktree } from '../utils/paths.js';
import * as lib from '../lib/db.js';
import { migrateDatabase } from '../lib/db.js';
import { buildTrackTree } from '../models/tree.js';
import { ACTIVE_STATUSES } from '../models/types.js';
import type { TrackWithDetails } from '../models/types.js';
import { TREE, colorKind, colorStatus, formatLabel, getTerminalWidth } from '../utils/format.js';

/**
 * Options for the status command.
 */
export interface StatusCommandOptions {
  json?: boolean;
  markdown?: boolean;
  all?: boolean;
  worktree?: string | boolean; // true means use current, string means specific name
  archived?: boolean; // Show archived tracks instead of active tracks
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

    // Run migrations if needed
    migrateDatabase(dbPath);

    // 2. If viewing archived tracks
    if (options.archived) {
      // Get all archived tracks
      const tracks = lib.getArchivedTracks(dbPath);

      // Load file and dependency maps
      const fileMap = lib.getAllTrackFiles(dbPath);
      const dependencyMap = lib.getAllDependencies(dbPath);

      // Build tree structure
      const tracksWithDetails = buildTrackTree(tracks, fileMap, dependencyMap);

      // Output in requested format
      if (options.json) {
        outputJson(tracksWithDetails);
      } else if (options.markdown) {
        outputMarkdown(tracksWithDetails);
      } else {
        outputHumanArchived(tracksWithDetails);
      }
      return;
    }

    // 3. If a specific track ID is provided, show that track and its descendants
    if (trackId) {
      // Validate track exists
      if (!lib.trackExists(dbPath, trackId)) {
        console.error(`Error: Unknown track id: ${trackId}`);
        process.exit(1);
      }

      // Get the specified track and all its descendants (unarchived only)
      const allTracks = options.all
        ? lib.getUnarchivedTracks(dbPath)
        : lib.getUnarchivedTracksByStatus(dbPath, ACTIVE_STATUSES);

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
      } else if (options.markdown) {
        outputMarkdown(tracksWithDetails, trackId);
      } else {
        outputHuman(tracksWithDetails, trackId);
      }
      return;
    }

    // 4. Determine worktree filter
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

    // 5. Load tracks from database (filtered by default, all with --all flag)
    // Always filter out archived tracks from the normal view
    let tracks = options.all
      ? lib.getUnarchivedTracks(dbPath)
      : lib.getUnarchivedTracksByStatus(dbPath, ACTIVE_STATUSES);

    // 6. Apply worktree filter if specified
    if (worktreeFilter) {
      tracks = tracks.filter((t) => t.worktree === worktreeFilter);
    }

    // 7. Include root track for project context, but only if it's active and unarchived
    if (!options.all) {
      const rootTrack = lib.getRootTrack(dbPath);
      if (
        rootTrack &&
        rootTrack.archived === 0 &&
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
    } else if (options.markdown) {
      outputMarkdown(tracksWithDetails);
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
 * Get status emoji for markdown output.
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'planned':
      return '📋';
    case 'in_progress':
      return '🔄';
    case 'done':
      return '✅';
    case 'blocked':
      return '🚫';
    case 'superseded':
      return '⏭️';
    case 'on_hold':
      return '⏸️';
    default:
      return '❓';
  }
}

/**
 * Output tracks in Markdown format.
 *
 * @param tracks - Tracks to display
 * @param startFromId - Optional track ID to start the tree from (instead of root)
 */
function outputMarkdown(tracks: TrackWithDetails[], startFromId?: string): void {
  // Build a map for quick child lookup
  const trackMap = new Map<string, TrackWithDetails>();
  for (const track of tracks) {
    trackMap.set(track.id, track);
  }

  // Find starting tracks (single track if ID specified, all roots otherwise)
  let startTracks: TrackWithDetails[];
  if (startFromId) {
    const startTrack = tracks.find((t) => t.id === startFromId);
    if (!startTrack) {
      console.log('No tracks found.');
      return;
    }
    startTracks = [startTrack];
  } else {
    // Find all root tracks (parent_id === null)
    startTracks = tracks.filter((t) => t.parent_id === null);
    if (startTracks.length === 0) {
      console.log('No tracks found.');
      return;
    }
  }

  // Print tree for each starting track
  for (let i = 0; i < startTracks.length; i++) {
    const startTrack = startTracks[i]!;
    if (i > 0) {
      console.log(); // Blank line between trees
    }
    printTrackMarkdown(startTrack, trackMap, 1); // Start at depth 1 (H1)
  }
}

/**
 * Recursively print a track and its children in markdown format.
 *
 * @param track - Track to print
 * @param trackMap - Map of all tracks for child lookup
 * @param headingLevel - Markdown heading level (1 = H1, 2 = H2, 3 = H3, etc.)
 */
function printTrackMarkdown(
  track: TrackWithDetails,
  trackMap: Map<string, TrackWithDetails>,
  headingLevel: number
): void {
  const emoji = getStatusEmoji(track.status);
  const worktreeSuffix = track.worktree ? ` @${track.worktree}` : '';

  // Use markdown headers (cap at H6 for deep nesting)
  const hashes = '#'.repeat(Math.min(headingLevel, 6));
  console.log(`${hashes} ${emoji} ${track.title} \`${track.id}\`${worktreeSuffix}\n`);

  // Details as plain text
  if (track.summary) {
    console.log(track.summary);
  }
  if (track.next_prompt) {
    console.log(`*Next:* ${track.next_prompt}`);
  }
  if (track.files.length > 0) {
    console.log(`*Files:* ${track.files.map((f) => `\`${f}\``).join(', ')}`);
  }
  if (track.blocks.length > 0) {
    console.log(`*Blocks:* ${track.blocks.map((id) => `\`${id}\``).join(', ')}`);
  }
  if (track.blocked_by.length > 0) {
    console.log(`*Blocked by:* ${track.blocked_by.map((id) => `\`${id}\``).join(', ')}`);
  }

  // Print children
  const children = track.children.filter(Boolean);
  if (children.length > 0) {
    console.log(); // Blank line before children
  }
  for (const childId of children) {
    if (!childId) continue;
    const child = trackMap.get(childId);
    if (!child) continue;
    printTrackMarkdown(child, trackMap, headingLevel + 1);
  }
}

/**
 * Output tracks in human-readable tree format.
 *
 * @param tracks - Tracks to display
 * @param startFromId - Optional track ID to start the tree from (instead of root)
 */
function outputHuman(tracks: TrackWithDetails[], startFromId?: string): void {
  // Build a map for quick child lookup
  const trackMap = new Map<string, TrackWithDetails>();
  for (const track of tracks) {
    trackMap.set(track.id, track);
  }

  // Get terminal width once for the entire output
  const terminalWidth = getTerminalWidth();

  // Find starting tracks (single track if ID specified, all roots otherwise)
  let startTracks: TrackWithDetails[];
  if (startFromId) {
    const startTrack = tracks.find((t) => t.id === startFromId);
    if (!startTrack) {
      console.log('No tracks found.');
      return;
    }
    startTracks = [startTrack];
    console.log(`Track: ${startTrack.title} (${startTrack.id})`);
  } else {
    // Find all root tracks (parent_id === null)
    startTracks = tracks.filter((t) => t.parent_id === null);
    if (startTracks.length === 0) {
      console.log('No tracks found.');
      return;
    }
    // Print header for first/main project
    console.log(`Project: ${startTracks[0]!.title} (${startTracks[0]!.id})`);
  }
  console.log();

  // Print tree for each starting track
  for (let i = 0; i < startTracks.length; i++) {
    const startTrack = startTracks[i]!;
    if (i > 0) {
      console.log(); // Blank line between trees
    }
    printTrack(startTrack, trackMap, [], i === startTracks.length - 1, terminalWidth);
  }
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

/**
 * Output archived tracks in human-readable format.
 *
 * @param tracks - Archived tracks to display
 */
function outputHumanArchived(tracks: TrackWithDetails[]): void {
  if (tracks.length === 0) {
    console.log('No archived tracks.');
    return;
  }

  console.log('Archived Tracks');
  console.log('===============');
  console.log();

  const terminalWidth = getTerminalWidth();

  for (const track of tracks) {
    const worktreeSuffix = track.worktree ? ` @${track.worktree}` : '';
    console.log(`[${colorKind(track.kind)}] ${track.id} - ${track.title}${worktreeSuffix}`);

    const labelOptions = {
      labelWidth: 8,
      maxWidth: terminalWidth - 2,
      continuationIndent: '  ',
    };

    console.log(`  ${formatLabel('summary:', track.summary, labelOptions)}`);
    console.log(`  ${formatLabel('status:', colorStatus(track.status), labelOptions)}`);
    console.log();
  }
}
