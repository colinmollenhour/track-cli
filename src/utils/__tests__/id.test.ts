import { describe, it, expect } from 'vitest';
import { generateId } from '../id.js';

describe('id utilities', () => {
  describe('generateId', () => {
    it('should generate an 8-character ID', () => {
      const id = generateId();
      expect(id).toHaveLength(8);
    });

    it('should generate alphanumeric characters only (no - or _)', () => {
      const id = generateId();
      // Custom alphabet: A-Za-z0-9 (no _ or - for easier copy/paste)
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId());
      }
      // All IDs should be unique
      expect(ids.size).toBe(1000);
    });

    it('should not include prefixes', () => {
      const id = generateId();
      // Should not start with common prefixes like 'trk_', 'proj_', etc.
      expect(id).not.toMatch(/^(trk_|proj_|nod_)/);
    });
  });
});
