export interface CommandArg {
  name: string;
  required: boolean;
  description: string;
}

export interface CommandFlag {
  name: string;
  alias?: string;
  description?: string;
  type?: string;
  required?: boolean;
  defaultValue?: unknown;
  collect?: boolean;
  cliFlag: string;
}

export interface CommandMetadata {
  name: string;
  summary: string;
  flags: CommandFlag[];
  args: CommandArg[];
  usage: string;
  example: string;
}

export const commandMetadata: CommandMetadata[] = [
  {
    name: 'init',
    summary: 'Initialize a new track project in the current directory',
    flags: [
      {
        name: 'force',
        alias: 'F',
        description: 'Overwrite existing .track directory if present',
        type: 'boolean',
        required: false,
        defaultValue: false,
        cliFlag: '-F, --force',
      },
    ],
    args: [
      { name: 'name', required: false, description: 'Project name (defaults to directory name)' },
    ],
    usage: 'track init [name] [-F|--force]',
    example: 'track init "My Project"',
  },
  {
    name: 'new',
    summary: 'Create a new track',
    flags: [
      {
        name: 'parent',
        description: 'Parent track ID',
        type: 'string',
        required: false,
        cliFlag: '--parent <track-id>',
      },
      {
        name: 'summary',
        description: 'Current state description',
        type: 'string',
        required: false,
        defaultValue: '',
        cliFlag: '--summary <summary>',
      },
      {
        name: 'next',
        description: 'What to do next',
        type: 'string',
        required: false,
        defaultValue: '',
        cliFlag: '--next <next-prompt>',
      },
      {
        name: 'file',
        description: 'Associated file path (repeatable)',
        type: 'string[]',
        required: false,
        collect: true,
        cliFlag: '--file <file-path>',
      },
      {
        name: 'worktree',
        description: 'Git worktree name (auto-detected if omitted)',
        type: 'string',
        required: false,
        cliFlag: '--worktree <name>',
      },
      {
        name: 'blocks',
        description: 'Track ID(s) this will block (repeatable)',
        type: 'string[]',
        required: false,
        collect: true,
        cliFlag: '--blocks <track-id>',
      },
    ],
    args: [{ name: 'title', required: true, description: 'Track title' }],
    usage:
      'track new "<title>" [--parent <track-id>] [--summary "..."] [--next "..."] [--file <path>]... [--worktree <name>] [--blocks <track-id>]...',
    example:
      'track new "Add login screen" --parent ROOT123 --summary "UI stub" --next "Hook API" --blocks DASH456',
  },
  {
    name: 'update',
    summary: 'Update the current state of an existing track',
    flags: [
      {
        name: 'title',
        description: 'New title for the track',
        type: 'string',
        required: false,
        cliFlag: '--title <title>',
      },
      {
        name: 'summary',
        description: 'Updated state description (uses current if omitted)',
        type: 'string',
        required: false,
        cliFlag: '--summary <summary>',
      },
      {
        name: 'next',
        description: 'What to do next (uses current if omitted)',
        type: 'string',
        required: false,
        cliFlag: '--next <next-prompt>',
      },
      {
        name: 'status',
        description: 'Track status (planned|in_progress|done|blocked|superseded|on_hold)',
        type: 'string',
        required: false,
        defaultValue: 'in_progress',
        cliFlag: '--status <status>',
      },
      {
        name: 'file',
        description: 'Associated file path (repeatable)',
        type: 'string[]',
        required: false,
        collect: true,
        cliFlag: '--file <file-path>',
      },
      {
        name: 'worktree',
        description: 'Git worktree name (use "-" to unset)',
        type: 'string',
        required: false,
        cliFlag: '--worktree <name>',
      },
      {
        name: 'blocks',
        description: 'Add dependency: this track blocks given track (repeatable)',
        type: 'string[]',
        required: false,
        collect: true,
        cliFlag: '--blocks <track-id>',
      },
      {
        name: 'unblocks',
        description: 'Remove dependency on given track (repeatable)',
        type: 'string[]',
        required: false,
        collect: true,
        cliFlag: '--unblocks <track-id>',
      },
    ],
    args: [{ name: 'track-id', required: true, description: 'Track ID to update' }],
    usage:
      'track update <track-id> [--title "..."] [--summary "..."] [--next "..."] [--status <status>] [--file <file-path>]... [--worktree <name>] [--blocks <track-id>]... [--unblocks <track-id>]...',
    example: 'track update ABC123 --title "New title" --summary "API wired" --status done',
  },
  {
    name: 'status',
    summary: 'Display the current state of the project, a specific track, or all tracks',
    flags: [
      {
        name: 'json',
        description: 'Output as JSON',
        type: 'boolean',
        required: false,
        cliFlag: '--json',
      },
      {
        name: 'markdown',
        alias: 'm',
        description: 'Output as Markdown',
        type: 'boolean',
        required: false,
        cliFlag: '-m, --markdown',
      },
      {
        name: 'all',
        alias: 'a',
        description: 'Show all tracks including done and superseded (default: active only)',
        type: 'boolean',
        required: false,
        defaultValue: false,
        cliFlag: '-a, --all',
      },
      {
        name: 'worktree',
        alias: 'w',
        description: 'Filter to worktree (current if no name given)',
        type: 'string',
        required: false,
        cliFlag: '-w, --worktree [name]',
      },
    ],
    args: [
      {
        name: 'track-id',
        required: false,
        description: 'Optional track ID to show status for (with descendants)',
      },
    ],
    usage: 'track status [track-id] [--json] [-m|--markdown] [-a|--all] [-w|--worktree [name]]',
    example: 'track status abc123 --json',
  },
  {
    name: 'show',
    summary: 'Display details for a specific track',
    flags: [
      {
        name: 'json',
        description: 'Output as JSON',
        type: 'boolean',
        required: false,
        cliFlag: '--json',
      },
    ],
    args: [{ name: 'track-id', required: true, description: 'Track ID to display' }],
    usage: 'track show <track-id> [--json]',
    example: 'track show ABC123 --json',
  },
  {
    name: 'mcp',
    summary: 'Start the MCP server for AI agent integration',
    flags: [
      {
        name: 'port',
        alias: 'p',
        description: 'Port to listen on (default: 8765)',
        type: 'number',
        required: false,
        cliFlag: '-p, --port <port>',
      },
      {
        name: 'host',
        alias: 'h',
        description: 'Host to bind to (default: 127.0.0.1)',
        type: 'string',
        required: false,
        cliFlag: '-h, --host <host>',
      },
    ],
    args: [{ name: 'action', required: true, description: 'Action to perform (start)' }],
    usage: 'track mcp start [-p|--port <port>] [-h|--host <host>]',
    example: 'track mcp start --port 8877',
  },
  {
    name: 'web',
    summary: 'Start or stop the web interface server',
    flags: [
      {
        name: 'port',
        alias: 'p',
        description: 'Port to listen on (default: auto)',
        type: 'number',
        required: false,
        cliFlag: '-p, --port <port>',
      },
      {
        name: 'host',
        alias: 'h',
        description: 'Host to bind to (default: 127.0.0.1)',
        type: 'string',
        required: false,
        cliFlag: '-h, --host <host>',
      },
    ],
    args: [
      {
        name: 'action',
        required: false,
        description: 'Action to perform (start|stop, default: start)',
      },
    ],
    usage: 'track web [start|stop] [-p|--port <port>] [-h|--host <host>]',
    example: 'track web start --port 3000',
  },
  {
    name: 'delete',
    summary: 'Delete a track and all its children',
    flags: [
      {
        name: 'force',
        alias: 'f',
        description: 'Skip confirmation prompt',
        type: 'boolean',
        required: false,
        defaultValue: false,
        cliFlag: '-f, --force',
      },
    ],
    args: [{ name: 'track-id', required: true, description: 'Track ID to delete' }],
    usage: 'track delete <track-id> [-f|--force]',
    example: 'track delete ABC123 --force',
  },
  {
    name: 'sort',
    summary: 'Move a track before or after another track',
    flags: [],
    args: [
      { name: 'track-id', required: true, description: 'Track ID to move' },
      { name: 'position', required: true, description: 'Position: before or after' },
      { name: 'target-id', required: true, description: 'Target track ID' },
    ],
    usage: 'track sort <track-id> <before|after> <target-id>',
    example: 'track sort ABC123 before DEF456',
  },
];
