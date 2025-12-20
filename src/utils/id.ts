import { customAlphabet } from 'nanoid';

/**
 * Custom alphabet without - and _ for easier copy/paste.
 * Uses only alphanumeric characters (A-Za-z0-9).
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Custom nanoid generator with alphanumeric-only alphabet.
 */
const nanoid = customAlphabet(ALPHABET, 8);

/**
 * Generate a unique 8-character ID for tracks.
 * Uses nanoid with alphanumeric alphabet (A-Za-z0-9) for easy copy/paste.
 *
 * Collision resistance: With 62 chars and 8 length, still very low collision rate.
 *
 * @returns 8-character nanoid (e.g., "V1StGXR8")
 */
export function generateId(): string {
  return nanoid();
}
