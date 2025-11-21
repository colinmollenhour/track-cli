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

export interface QuickstartPayload {
  commands: {
    init: string;
    new: string;
    update: string;
    status: string;
  };
  session_pattern: string[];
  breadcrumb: string;
  statuses: string;
  json_fields: string;
  required_flags: {
    new: string;
    update: string;
  };
}

export interface RecipeDescriptor {
  name: string;
  jq: string;
  description: string;
}

export interface RecipesPayload {
  recipes: RecipeDescriptor[];
}

export interface TrackWithDetails {
  id: string;
  title: string;
  parent_id: string | null;
  summary: string;
  next_prompt: string;
  status: string;
  files: string[];
  children: string[];
  kind: string;
  created_at: string;
  updated_at: string;
}

export interface TracksPayload {
  tracks: TrackWithDetails[];
}
