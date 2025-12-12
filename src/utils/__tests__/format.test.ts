import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  STATUS_ICONS,
  colorStatus,
  formatLabel,
  TREE,
  wrapText,
  getTerminalWidth,
} from '../format.js';
import { VALID_STATUSES } from '../../models/types.js';

describe('format utils', () => {
  const originalNoColor = process.env.NO_COLOR;

  beforeEach(() => {
    delete process.env.NO_COLOR;
  });

  afterEach(() => {
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
  });

  it('STATUS_ICONS covers all statuses', () => {
    for (const status of VALID_STATUSES) {
      expect(STATUS_ICONS[status]).toBeDefined();
    }
  });

  it('colorStatus includes icon and status text', () => {
    expect(colorStatus('planned')).toContain('○ planned');
    expect(colorStatus('in_progress')).toContain('● in_progress');
    expect(colorStatus('done')).toContain('✓ done');
    expect(colorStatus('blocked')).toContain('⚠ blocked');
    expect(colorStatus('superseded')).toContain('✗ superseded');
  });

  it('colorStatus disables colors when NO_COLOR set', () => {
    process.env.NO_COLOR = '1';
    const value = colorStatus('done');
    expect(value).toContain('✓ done');
  });

  it('formatLabel pads labels to width', () => {
    expect(formatLabel('next:', 'Hello')).toMatch(/next:\s+Hello/);
    expect(formatLabel('status:', 'planned')).toMatch(/status:\s+planned/);
  });

  it('TREE characters are defined', () => {
    expect(TREE.BRANCH).toBe('├──');
    expect(TREE.LAST).toBe('└──');
    expect(TREE.PIPE).toBe('│  ');
    expect(TREE.SPACE).toBe('   ');
  });
});

describe('getTerminalWidth', () => {
  it('returns a reasonable default when not a TTY', () => {
    const width = getTerminalWidth();
    expect(width).toBeGreaterThanOrEqual(40);
    expect(width).toBeLessThanOrEqual(200);
  });
});

describe('wrapText', () => {
  it('returns single line for short text', () => {
    const result = wrapText('Hello world', 80);
    expect(result).toEqual(['Hello world']);
  });

  it('wraps text at word boundaries', () => {
    const result = wrapText('The quick brown fox jumps over the lazy dog', 20);
    expect(result).toEqual(['The quick brown fox', 'jumps over the lazy', 'dog']);
  });

  it('handles single very long word', () => {
    const result = wrapText('supercalifragilisticexpialidocious', 10);
    expect(result).toEqual(['supercalif', 'ragilistic', 'expialidoc', 'ious']);
  });

  it('handles empty string', () => {
    const result = wrapText('', 80);
    expect(result).toEqual(['']);
  });

  it('handles text with multiple spaces by normalizing them', () => {
    // Multiple spaces between words are normalized to single spaces
    const result = wrapText('word   with   spaces', 30);
    expect(result).toEqual(['word with spaces']);
  });

  it('handles exact width match', () => {
    const result = wrapText('exactly twenty char', 20);
    expect(result).toEqual(['exactly twenty char']);
  });

  it('handles single word that fits exactly', () => {
    const result = wrapText('test', 4);
    expect(result).toEqual(['test']);
  });
});

describe('formatLabel with wrapping', () => {
  it('maintains backward compatibility with number argument', () => {
    const result = formatLabel('label:', 'value', 10);
    expect(result).toMatch(/label:\s+value/);
  });

  it('wraps long values when maxWidth specified', () => {
    const result = formatLabel(
      'summary:',
      'This is a very long summary that should wrap across multiple lines',
      {
        labelWidth: 8,
        maxWidth: 40,
        continuationIndent: '   ',
      }
    );
    expect(result).toContain('\n');
  });

  it('aligns continuation lines with value start', () => {
    const result = formatLabel('summary:', 'First line second line third line', {
      labelWidth: 8,
      maxWidth: 25,
      continuationIndent: '>>',
    });
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(1);
    // Continuation lines should start with indent + label-width padding
    expect(lines[1]).toMatch(/^>>\s{9}/);
  });

  it('does not wrap when value fits', () => {
    const result = formatLabel('next:', 'Short value', {
      labelWidth: 8,
      maxWidth: 80,
      continuationIndent: '  ',
    });
    expect(result).not.toContain('\n');
  });

  it('falls back to no wrapping when width too narrow', () => {
    const result = formatLabel('summary:', 'Some value', {
      labelWidth: 8,
      maxWidth: 5,
      continuationIndent: '  ',
    });
    // Should not crash, and should contain the value
    expect(result).toContain('Some value');
  });
});
