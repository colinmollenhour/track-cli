import { describe, expect, it } from 'vitest';
import { handleRequest } from '../server.js';
import { MAX_PAYLOAD_BYTES } from '../constants.js';

describe('MCP server handler', () => {
  it('serves quickstart with envelope fields', () => {
    const res = handleRequest('/mcp/track/quickstart');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      data: {
        commands: Record<string, string>;
        session_pattern: string[];
        breadcrumb: string;
      };
      etag: string;
      lastUpdated: string;
      schemaVersion: number;
    };
    expect(body.data.commands).toBeTruthy();
    expect(body.data.commands.init).toBeTruthy();
    expect(body.data.commands.new).toBeTruthy();
    expect(body.data.commands.update).toBeTruthy();
    expect(body.data.commands.status).toBeTruthy();
    expect(Array.isArray(body.data.session_pattern)).toBe(true);
    expect(body.data.breadcrumb).toBeTruthy();
    expect(body.etag).toBeTruthy();
    expect(body.lastUpdated).toBeTruthy();
    expect(body.schemaVersion).toBe(2);
  });

  it('serves recipes with envelope fields', () => {
    const res = handleRequest('/mcp/track/recipes');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { recipes: Array<{ name: string; jq: string; description: string }> };
      etag: string;
      lastUpdated: string;
      schemaVersion: number;
    };
    expect(Array.isArray(body.data.recipes)).toBe(true);
    expect(body.data.recipes.length).toBeGreaterThan(0);
    expect(body.data.recipes[0]).toHaveProperty('name');
    expect(body.data.recipes[0]).toHaveProperty('jq');
    expect(body.data.recipes[0]).toHaveProperty('description');
    expect(body.etag).toBeTruthy();
    expect(body.lastUpdated).toBeTruthy();
    expect(body.schemaVersion).toBe(2);
  });

  it('includes cache headers in response', () => {
    const res = handleRequest('/mcp/track/quickstart');
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
    expect(body.data.schema).toBe(2);
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

  it('returns 404 for status when no database exists', () => {
    const res = handleRequest('/mcp/track/status');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: string };
    expect(body.error).toContain('No track database found');
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
        '/mcp/track/quickstart',
        '/mcp/track/recipes',
        '/mcp/track/version',
        '/mcp/track/state',
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
