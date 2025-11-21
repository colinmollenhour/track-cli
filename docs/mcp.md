# MCP Server Guide

The MCP server exposes a minimal, cached view of Track CLI metadata for AI coding agents. It is side-effect free and bounded to small JSON payloads.

## Endpoints (HTTP)

All responses share envelope fields: `data`, `lastUpdated`, `schemaVersion`, `etag`.

### `/mcp/track/commands`
List all commands with flags and args.

**Example response:**
```json
{
  "data": {
    "commands": [
      {
        "name": "init",
        "summary": "Initialize a new track project in the current directory",
        "flags": [
          {
            "name": "force",
            "alias": "F",
            "description": "Overwrite existing .track directory if present",
            "type": "boolean",
            "required": false,
            "defaultValue": false
          }
        ],
        "args": [
          {
            "name": "name",
            "required": false,
            "description": "Project name (defaults to directory name)"
          }
        ],
        "usage": "track init [name] [-F|--force]"
      }
    ]
  },
  "lastUpdated": "2025-11-21T15:12:42.008Z",
  "schemaVersion": 1,
  "etag": "e7f3a9848563"
}
```

### `/mcp/track/examples`
Get shortest valid example per command.

**Example response:**
```json
{
  "data": {
    "examples": [
      {
        "name": "init",
        "example": "track init \"My Project\""
      },
      {
        "name": "new",
        "example": "track new \"Add login screen\" --parent ROOT123 --summary \"UI stub\" --next \"Hook API\""
      }
    ]
  },
  "lastUpdated": "2025-11-21T15:12:42.009Z",
  "schemaVersion": 1,
  "etag": "5b0a685004a6"
}
```

### `/mcp/track/help/{command}`
Get usage + flags for a specific command.

**Example request:** `/mcp/track/help/init`

**Example response:**
```json
{
  "data": {
    "command": {
      "name": "init",
      "summary": "Initialize a new track project in the current directory",
      "flags": [...],
      "args": [...],
      "usage": "track init [name] [-F|--force]"
    }
  },
  "lastUpdated": "2025-11-21T15:12:42.008Z",
  "schemaVersion": 1,
  "etag": "e7f3a9848563:init"
}
```

### `/mcp/track/example/{command}`
Get example for a specific command.

**Example request:** `/mcp/track/example/new`

**Example response:**
```json
{
  "data": {
    "example": {
      "name": "new",
      "example": "track new \"Add login screen\" --parent ROOT123 --summary \"UI stub\" --next \"Hook API\""
    }
  },
  "lastUpdated": "2025-11-21T15:12:42.009Z",
  "schemaVersion": 1,
  "etag": "5b0a685004a6:new"
}
```

### `/mcp/track/version`
Get CLI + schema version.

**Example response:**
```json
{
  "data": {
    "cli": "track-cli 0.1.0",
    "schema": 1
  },
  "lastUpdated": "2025-11-21T15:12:42.009Z",
  "schemaVersion": 1,
  "etag": "84632f552cd0"
}
```

### `/mcp/track/state`
Get current working directory (runtime) + default config path.

**Example response:**
```json
{
  "data": {
    "cwd": "/Users/example/my-project",
    "defaultConfig": ".track/config.json"
  },
  "lastUpdated": "2025-11-21T15:12:42.009Z",
  "schemaVersion": 1,
  "etag": "774131bbbed6"
}
```

### `/mcp/track/recent-errors?limit=n`
Get newest log entries (best-effort, bounded to max 20).

**Example request:** `/mcp/track/recent-errors?limit=3`

**Example response:**
```json
{
  "data": {
    "errors": [
      {
        "timestamp": "2025-11-21T14:30:15.123Z",
        "message": "Track ABC123 not found"
      }
    ]
  },
  "lastUpdated": "2025-11-21T15:12:42.009Z",
  "schemaVersion": 1,
  "etag": "recent:1:2025-11-21T15:12:42.009Z"
}
```
**Note:** Returns empty array if log file is missing or unreadable.

## Environment Variables
- `MCP_PORT` (default `8765`) — listening port.
- `MCP_HOST` (default `127.0.0.1`) — listening host.
- `MCP_ERRORS_FILE` (default `.track/mcp-errors.log`) — source log for recent-errors.

## Scripts
- `npm run mcp:sync` — regenerate metadata JSON envelopes and rebuild.
- `npm run mcp:start` — start compiled server from `dist`.
- `npm run mcp:dev` — dev compile watch (server not auto-run).

Metadata source of truth lives in `src/commands/metadata.ts`. This feeds both the CLI (Commander wiring) and MCP outputs; update it when commands/flags change, then run `npm run mcp:sync`.

## Data Regeneration
`scripts/mcp-sync.js` is the single source of truth for command metadata. Update it when commands/flags change, then run `npm run mcp:sync` to refresh envelopes and `dist` artifacts.

## Size & Safety
- Payloads capped at 5 KB; server returns 500 if exceeded.
- recent-errors is best-effort: returns empty array if log missing or unreadable.

## Security

**⚠️ Localhost-only by default**

The MCP server binds to `127.0.0.1` (localhost) by default for security. This prevents external network access.

**Warning:** If you set `MCP_HOST` to a non-localhost address (e.g., `0.0.0.0`), the server will be exposed to your network. The server will display a warning when this happens:

```
⚠️  WARNING: MCP server is binding to 0.0.0.0, which may expose it to external networks.
   For security, consider using 127.0.0.1 (localhost) unless you have a specific need.
```

**Best practices:**
- Keep `MCP_HOST=127.0.0.1` unless you have a specific requirement
- No authentication is provided by default (localhost-only assumed)
- Read-only endpoints only (no state mutation possible)

## Troubleshooting

### Port already in use

**Error:** `EADDRINUSE: address already in use`

**Solution:** Either:
1. Stop the process using port 8765: `lsof -ti:8765 | xargs kill`
2. Use a different port: `MCP_PORT=8866 npm run mcp:start`

### Connection refused

**Error:** `curl: (7) Failed to connect to 127.0.0.1 port 8765`

**Solution:**
- Verify server is running: `ps aux | grep "node.*mcp"`
- Check server logs for startup errors
- Ensure firewall isn't blocking the port

### Empty commands or stale data

**Problem:** MCP endpoints return outdated or empty command metadata

**Solution:** Regenerate metadata after changing commands:
```bash
npm run mcp:sync  # Regenerates metadata from src/commands/metadata.ts
```

### 404 for valid command

**Error:** `{"error":"Unknown command \"my-command\""}`

**Solution:**
- Verify command name matches exactly (case-sensitive)
- Check `/mcp/track/commands` to see available commands
- Run `npm run mcp:sync` if you recently added the command

### Invalid command name

**Error:** `{"error":"Invalid command name"}`

**Cause:** Command parameter is empty or contains slashes

**Solution:** Use valid command names without path separators:
- ✅ `/mcp/track/help/init`
- ❌ `/mcp/track/help/`
- ❌ `/mcp/track/help/foo/bar`

## Sample Usage

Start the server:
```bash
npm run mcp:start
```

Query endpoints:
```bash
# Get all commands
curl -s http://127.0.0.1:8765/mcp/track/commands | jq .

# Get help for specific command
curl -s http://127.0.0.1:8765/mcp/track/help/new | jq .

# Get recent errors (max 3)
curl -s "http://127.0.0.1:8765/mcp/track/recent-errors?limit=3" | jq .

# Check version
curl -s http://127.0.0.1:8765/mcp/track/version | jq .
```

Use custom port:
```bash
MCP_PORT=8877 npm run mcp:start &
curl -s http://127.0.0.1:8877/mcp/track/commands | jq .
```
