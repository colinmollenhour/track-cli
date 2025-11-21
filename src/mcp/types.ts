export const DEFAULT_SCHEMA_VERSION = 1;
export const MAX_PAYLOAD_BYTES = 5 * 1024; // 5KB cap to keep responses lightweight for agents

export interface Envelope<T> {
  data: T;
  lastUpdated: string;
  schemaVersion: number;
  etag: string;
}

export interface FlagDescriptor {
  name: string;
  alias?: string;
  description?: string;
  type?: string;
  required?: boolean;
  defaultValue?: unknown;
}

export interface CommandDescriptor {
  name: string;
  summary: string;
  flags: FlagDescriptor[];
}

export interface CommandsPayload {
  commands: CommandDescriptor[];
}

export interface ExampleDescriptor {
  name: string;
  example: string;
}

export interface ExamplesPayload {
  examples: ExampleDescriptor[];
}

export interface VersionPayload {
  cli: string;
  schema: number;
}

export interface StatePayload {
  cwd: string;
  defaultConfig: string;
}

export interface ErrorEntry {
  timestamp: string;
  message: string;
}

export interface RecentErrorsPayload {
  errors: ErrorEntry[];
}

export interface RecentErrorsOptions {
  limit: number;
  maxLimit: number;
  logPath: string;
}
