/**
 * MCP server configuration constants.
 * Centralized to avoid magic numbers and ease maintenance.
 */

/** Maximum response payload size in bytes (5KB) */
export const MAX_PAYLOAD_BYTES = 5 * 1024;

/** Default HTTP port for MCP server */
export const DEFAULT_PORT = 8765;

/** Default host address (localhost only for security) */
export const DEFAULT_HOST = '127.0.0.1';

/** Maximum number of recent errors to return */
export const DEFAULT_MAX_RECENT_ERRORS = 20;

/** Default limit for recent errors when not specified */
export const DEFAULT_RECENT_ERRORS_LIMIT = 5;

/** Default path to errors log file */
export const DEFAULT_ERRORS_LOG_PATH = '.track/mcp-errors.log';

/** URL path prefix for all MCP endpoints */
export const PATH_PREFIX = '/mcp/track';

/** Schema version for MCP envelopes */
export const SCHEMA_VERSION = 1;
