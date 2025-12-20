import pc from 'picocolors';
import type { Status } from '../models/types.js';

export const STATUS_ICONS: Record<Status, string> = {
  planned: '○',
  in_progress: '●',
  done: '✓',
  blocked: '⚠',
  superseded: '✗',
  on_hold: '⏸',
};

export function colorStatus(status: Status): string {
  const icon = STATUS_ICONS[status];
  const rawStatus = status;
  switch (status) {
    case 'in_progress':
      return pc.yellow(`${icon} ${status}`);
    case 'done':
      return pc.green(`${icon} ${status}`);
    case 'blocked':
      return pc.red(`${icon} ${status}`);
    case 'planned':
      return pc.cyan(`${icon} ${status}`);
    case 'superseded':
      return pc.dim(`${icon} ${status}`);
    case 'on_hold':
      return pc.magenta(`${icon} ${status}`);
  }
  return `${icon} ${rawStatus}`;
}

export function colorKind(kind: string): string {
  switch (kind) {
    case 'super':
      return pc.bold(pc.magenta(kind));
    case 'feature':
      return pc.blue(kind);
    case 'task':
      return pc.white(kind);
    default:
      return kind;
  }
}

export const TREE = {
  BRANCH: '├──',
  LAST: '└──',
  PIPE: '│  ',
  SPACE: '   ',
};

const DEFAULT_WIDTH = 80;
const MIN_WIDTH = 40;

/**
 * Get the effective terminal width for text wrapping.
 * Falls back to 80 columns for non-TTY environments (piping).
 */
export function getTerminalWidth(): number {
  if (process.stdout.isTTY && process.stdout.columns) {
    return Math.max(process.stdout.columns, MIN_WIDTH);
  }
  return DEFAULT_WIDTH;
}

/**
 * Wrap text to fit within a maximum width, breaking at word boundaries.
 * Returns an array of lines. Multiple spaces are normalized to single spaces.
 */
export function wrapText(text: string, maxWidth: number): string[] {
  if (!text || maxWidth <= 0) {
    return [text || ''];
  }

  // Normalize whitespace and split into words
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const normalized = words.join(' ');

  if (normalized.length <= maxWidth) {
    return [normalized];
  }

  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    // Handle very long words that exceed maxWidth
    if (word.length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      // Break the long word into chunks
      for (let i = 0; i < word.length; i += maxWidth) {
        lines.push(word.slice(i, i + maxWidth));
      }
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

export interface FormatLabelOptions {
  labelWidth?: number;
  maxWidth?: number;
  continuationIndent?: string;
}

/**
 * Format a label and value pair with optional word wrapping.
 */
export function formatLabel(
  label: string,
  value: string,
  options: FormatLabelOptions | number = 8
): string {
  const opts: FormatLabelOptions = typeof options === 'number' ? { labelWidth: options } : options;

  const labelWidth = opts.labelWidth ?? 8;
  const paddedLabel = pc.dim(label.padEnd(labelWidth));

  if (!opts.maxWidth) {
    return `${paddedLabel} ${value}`;
  }

  const valueStartCol = labelWidth + 1;
  const availableWidth = opts.maxWidth - valueStartCol;

  if (availableWidth <= 0) {
    return `${paddedLabel} ${value}`;
  }

  const wrappedLines = wrapText(value, availableWidth);

  if (wrappedLines.length === 1) {
    return `${paddedLabel} ${wrappedLines[0]}`;
  }

  const continuationIndent = opts.continuationIndent ?? '';
  const continuationPadding = ' '.repeat(labelWidth + 1);

  const lines = wrappedLines.map((line, index) => {
    if (index === 0) {
      return `${paddedLabel} ${line}`;
    }
    return `${continuationIndent}${continuationPadding}${line}`;
  });

  return lines.join('\n');
}
