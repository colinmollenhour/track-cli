import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deleteCommand } from '../delete.js';
import { initCommand } from '../init.js';
import { newCommand } from '../new.js';
import { getDatabasePath } from '../../utils/paths.js';
import * as lib from '../../lib/db.js';
import { withTempDir } from '../../__tests__/helpers/test-fs.js';
import { mockConsole, mockProcessExit } from '../../__tests__/helpers/mocks.js';

describe('delete command', () => {
  let consoleMock: ReturnType<typeof mockConsole>;
  let exitMock: ReturnType<typeof mockProcessExit>;

  beforeEach(() => {
    consoleMock = mockConsole();
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    consoleMock.restore();
    exitMock.restore();
  });

  function extractTrackId(logs: string[]): string {
    const trackIdLog = logs.find((log) => log.includes('Track ID:'));
    const trackId = trackIdLog?.split('Track ID: ')[1];
    return trackId || '';
  }

  describe('successful deletion', () => {
    it('should delete a leaf track (no children)', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Leaf Track', {
          parent: root?.id,
          summary: '',
          next: '',
        });

        const leafId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Delete the leaf track
        deleteCommand(leafId, {});

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes(`Deleted track: ${leafId}`))).toBe(true);

        // Verify track is gone
        const dbPath = getDatabasePath();
        expect(lib.trackExists(dbPath, leafId)).toBe(false);
      });
    });

    it('should cascade delete a track with children', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create parent
        newCommand('Parent Track', {
          parent: root?.id,
          summary: '',
          next: '',
        });

        const parentId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create child
        newCommand('Child Track', {
          parent: parentId,
          summary: '',
          next: '',
        });

        const childId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create grandchild
        newCommand('Grandchild Track', {
          parent: childId,
          summary: '',
          next: '',
        });

        const grandchildId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Delete parent with force (should cascade to child and grandchild)
        deleteCommand(parentId, { force: true });

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes('Deleted 3 tracks'))).toBe(true);

        // Verify all are gone
        const dbPath = getDatabasePath();
        expect(lib.trackExists(dbPath, parentId)).toBe(false);
        expect(lib.trackExists(dbPath, childId)).toBe(false);
        expect(lib.trackExists(dbPath, grandchildId)).toBe(false);
      });
    });

    it('should delete associated files when deleting track', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Track with files', {
          summary: '',
          next: '',
          file: ['file1.ts', 'file2.ts'],
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Delete the track
        deleteCommand(trackId, {});

        // Verify track and files are gone
        const dbPath = getDatabasePath();
        expect(lib.trackExists(dbPath, trackId)).toBe(false);

        // Verify no orphaned file records
        const fileMap = lib.getAllTrackFiles(dbPath);
        expect(fileMap.has(trackId)).toBe(false);
      });
    });

    it('should clean up dependencies when deleting track', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create two tracks
        newCommand('Track A', {
          parent: root?.id,
          summary: '',
          next: '',
        });

        const trackAId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Track B', {
          parent: root?.id,
          summary: '',
          next: '',
          blocks: [trackAId],
        });

        const trackBId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Verify dependency exists
        const dbPath = getDatabasePath();
        expect(lib.getBlockersOf(dbPath, trackAId)).toContain(trackBId);

        // Delete Track B
        deleteCommand(trackBId, {});

        // Verify Track B is gone and Track A no longer has blockers
        expect(lib.trackExists(dbPath, trackBId)).toBe(false);
        expect(lib.getBlockersOf(dbPath, trackAId)).not.toContain(trackBId);
      });
    });
  });

  describe('error handling', () => {
    it('should exit with error when project not initialized', async () => {
      await withTempDir(() => {
        try {
          deleteCommand('abc12345', {});
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('No track project found'))).toBe(true);
      });
    });

    it('should exit with error when track ID not found', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        try {
          deleteCommand('invalid123', {});
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('Unknown track id: invalid123'))).toBe(true);
      });
    });

    it('should exit with error when trying to delete root track', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        try {
          deleteCommand(root!.id, {});
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('Cannot delete the root track'))).toBe(true);
      });
    });
  });
});
