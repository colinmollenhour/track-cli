import { describe, expect, it } from 'vitest';
import { handleRequest } from '../server.js';
import { MAX_PAYLOAD_BYTES } from '../constants.js';

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

  it('includes cache headers in response', () => {
    const res = handleRequest('/mcp/track/commands');
    expect(res.status).toBe(200);
    expect(res.headers.ETag).toBeTruthy();
    expect(res.headers['Last-Modified']).toBeTruthy();
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(res.headers['Content-Length']).toBeGreaterThan(0);
  });

  it('serves version endpoint', () => {
    const res = handleRequest('/mcp/track/version');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { cli: string; schema: number };
      etag: string;
    };
    expect(body.data.cli).toContain('track-cli');
    expect(body.data.schema).toBe(1);
    expect(body.etag).toBeTruthy();
  });

  it('serves state endpoint with runtime cwd', () => {
    const res = handleRequest('/mcp/track/state');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { cwd: string; defaultConfig: string };
    };
    expect(body.data.cwd).toBeTruthy();
    expect(body.data.defaultConfig).toBe('.track/config.json');
  });

  it('serves examples endpoint', () => {
    const res = handleRequest('/mcp/track/examples');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { examples: Array<{ name: string; example: string }> };
    };
    expect(Array.isArray(body.data.examples)).toBe(true);
    expect(body.data.examples.length).toBeGreaterThan(0);
    expect(body.data.examples[0]).toHaveProperty('name');
    expect(body.data.examples[0]).toHaveProperty('example');
  });

  it('serves help for valid command', () => {
    const res = handleRequest('/mcp/track/help/init');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { command: { name: string; summary: string; flags: unknown[] } };
    };
    expect(body.data.command.name).toBe('init');
    expect(body.data.command.summary).toBeTruthy();
    expect(Array.isArray(body.data.command.flags)).toBe(true);
  });

  it('serves example for valid command', () => {
    const res = handleRequest('/mcp/track/example/new');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { example: { name: string; example: string } };
    };
    expect(body.data.example.name).toBe('new');
    expect(body.data.example.example).toBeTruthy();
  });

  it('returns 404 for unknown help command', () => {
    const res = handleRequest('/mcp/track/help/does-not-exist');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: string };
    expect(body.error).toContain('Unknown command');
  });

  it('returns 404 for empty command name in help', () => {
    const res = handleRequest('/mcp/track/help/');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: string };
    expect(body.error).toContain('Invalid command name');
  });

  it('returns 404 for command name with slash in help', () => {
    const res = handleRequest('/mcp/track/help/foo/bar');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: string };
    expect(body.error).toContain('Invalid command name');
  });

  it('returns 404 for empty command name in example', () => {
    const res = handleRequest('/mcp/track/example/');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: string };
    expect(body.error).toContain('Invalid command name');
  });

  it('returns 404 for unknown route', () => {
    const res = handleRequest('/mcp/track/unknown');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: string };
    expect(body.error).toContain('Unknown route');
  });

  it('serves recent-errors with limit clamped and empty errors when log missing', () => {
    const res = handleRequest('/mcp/track/recent-errors?limit=999');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { data: { errors: unknown[] }; etag: string };
    expect(Array.isArray(body.data.errors)).toBe(true);
    expect(body.data.errors.length).toBe(0);
    expect(body.etag).toContain('recent:');
  });

  describe('size limits', () => {
    it('enforces 5KB payload limit', () => {
      expect(MAX_PAYLOAD_BYTES).toBe(5 * 1024);
    });

    it('all current endpoints respect size limit', () => {
      const endpoints = [
        '/mcp/track/commands',
        '/mcp/track/examples',
        '/mcp/track/version',
        '/mcp/track/state',
        '/mcp/track/help/init',
        '/mcp/track/example/new',
        '/mcp/track/recent-errors',
      ];

      endpoints.forEach((endpoint) => {
        const res = handleRequest(endpoint);
        expect(res.status).toBe(200);
        const size = Buffer.byteLength(res.body, 'utf8');
        expect(size).toBeLessThan(MAX_PAYLOAD_BYTES);
      });
    });
  });
});
