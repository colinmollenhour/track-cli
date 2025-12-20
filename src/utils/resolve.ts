import { resolveTrackId, type ResolveResult } from '../lib/db.js';
import { colorKind } from './format.js';

/**
 * Resolve a track identifier (ID or title) to a track ID.
 * Prints appropriate error messages and exits on failure.
 *
 * @param dbPath - Path to the database file
 * @param input - Track ID or title to resolve
 * @param entityName - Name of the entity for error messages (e.g., "track", "target track")
 * @returns The resolved track ID
 */
export function resolveTrackIdOrExit(
  dbPath: string,
  input: string,
  entityName: string = 'track'
): string {
  const result: ResolveResult = resolveTrackId(dbPath, input);

  if (result.success) {
    return result.trackId;
  }

  if (result.error === 'not_found') {
    console.error(`Error: Unknown ${entityName}: ${result.input}`);
    console.error(`No track found with ID or title "${result.input}".`);
    process.exit(1);
  }

  if (result.error === 'ambiguous') {
    console.error(`Error: Ambiguous ${entityName}: ${result.input}`);
    console.error(`Multiple tracks match the title "${result.input}":`);
    for (const match of result.matches) {
      const kind = colorKind(match.parent_id === null ? 'super' : 'sub');
      console.error(`  - [${kind}] ${match.id} - ${match.title}`);
    }
    console.error('Please use the track ID instead.');
    process.exit(1);
  }

  // TypeScript exhaustiveness check
  throw new Error('Unexpected resolution result');
}
