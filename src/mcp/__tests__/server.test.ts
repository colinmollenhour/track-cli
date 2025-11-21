import { describe, expect, it } from 'vitest';
import { handleRequest } from '../server.js';

describe('MCP server handler', () => {
  it('serves commands with envelope fields', () => {
    const res = handleRequest('/mcp/track/commands');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { commands: unknown[] };
      etag: string;
      lastUpdated: string;
    };
    expect(Array.isArray(body.data.commands)).toBe(true);
    expect(body.data.commands.length).toBeGreaterThan(0);
    expect(body.etag).toBeTruthy();
    expect(body.lastUpdated).toBeTruthy();
  });

  it('returns 404 for unknown help command', () => {
    const res = handleRequest('/mcp/track/help/does-not-exist');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: string };
    expect(body.error).toContain('Unknown command');
  });

  it('serves recent-errors with limit clamped and empty errors when log missing', () => {
    const res = handleRequest('/mcp/track/recent-errors?limit=999');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { data: { errors: unknown[] }; etag: string };
    expect(Array.isArray(body.data.errors)).toBe(true);
    expect(body.data.errors.length).toBe(0);
    expect(body.etag).toContain('recent:');
  });
});
