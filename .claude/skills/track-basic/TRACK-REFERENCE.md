# track CLI Reference

Complete reference for the `track` command-line tool.

## Initialization

```bash
# Create new project in current directory
track init "Project Name"

# Use directory name as project name
track init

# Overwrite existing project
track init "Project Name" --force
track init "Project Name" -F
```

Creates `.track/track.db` SQLite database with a root "super" track.

## Creating Tracks

```bash
track new "Title" [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--parent <id>` | Parent track ID (default: root/super track) |
| `--summary <text>` | Current state description |
| `--next <text>` | Next steps / what to do |
| `--file <path>` | Associate file (repeatable) |
| `--blocks <id>` | This track blocks given track (repeatable) |
| `--worktree <name>` | Associate with worktree (auto-detected if omitted) |

### Examples

```bash
# Create feature under root
track new "User Authentication" \
  --summary "Implement login/logout" \
  --next "Start with database schema"

# Create task under feature
track new "Login endpoint" \
  --parent abc123 \
  --summary "POST /auth/login" \
  --next "Define request/response schema" \
  --file src/routes/auth.ts

# Dependencies are added via update (see Dependencies section below)
track new "Frontend auth" \
  --summary "Auth UI components" \
  --next "Waiting for backend auth"

# Create with multiple files
track new "Database models" \
  --file src/models/user.ts \
  --file src/models/session.ts
```

## Updating Tracks

```bash
track update <track-id> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--summary <text>` | Update summary (**REQUIRED**) |
| `--next <text>` | Update next steps (**REQUIRED**) |
| `--status <value>` | Change status (see Status Values) |
| `--file <path>` | Add file association (repeatable) |
| `--blocks <id>` | Add dependency (this blocks given track) |
| `--unblocks <id>` | Remove dependency |
| `--worktree <name>` | Set worktree (use `-` to unset) |

**Note**: Both `--summary` and `--next` are **ALWAYS REQUIRED** for `track update`. There is NO `--note` option.

### Examples

```bash
# Update progress
track update abc123 \
  --summary "Login endpoint complete, logout in progress" \
  --next "Add token refresh logic" \
  --status in_progress

# Mark complete (triggers dependency cascade)
track update abc123 --status done \
  --summary "Login and logout endpoints implemented" \
  --next "Task complete, dependent tasks now unblocked"

# Add dependency
track update def456 --blocks abc123

# Remove dependency
track update def456 --unblocks abc123

# Associate with worktree
track update abc123 --worktree feature-auth

# Unset worktree (e.g., worktree being deleted)
track update abc123 --worktree -

# Add files during update
track update abc123 \
  --file src/middleware/auth.ts \
  --file tests/auth.test.ts
```

## Viewing Status

```bash
track status [track-id] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `track-id` | Optional track ID to show status for (with descendants) |

### Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON (for programmatic use) |
| `-a, --all` | Include done and superseded tracks |
| `--worktree` | Filter to current worktree (auto-detected) |
| `--worktree <name>` | Filter to named worktree |

**Note**: By default, done/superseded tracks (including super tracks) are hidden. Use `--all` to include them.

### Examples

```bash
# Human-readable tree (active tracks only)
track status

# Show a specific track and its descendants
track status abc123

# JSON output for parsing
track status --json

# JSON output for a specific track
track status abc123 --json

# Include completed tracks
track status --all
track status -a

# Filter to current worktree
track status --worktree

# Filter to specific worktree
track status --worktree feature-auth

# JSON with all tracks
track status --json --all
```

### Human Output Format

```
My Project (abc123) [in_progress]
├── User Auth (def456) [in_progress] @feature-auth
│   ├── Login (ghi789) [done]
│   │   Files: src/auth/login.ts
│   │   blocks: jkl012
│   └── Logout (mno345) [planned]
└── Dashboard (jkl012) [blocked]
    blocked by: ghi789
```

## Track Details

```bash
track show <track-id> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

### Examples

```bash
# Human-readable details
track show abc123

# JSON format
track show abc123 --json
```

### Human Output Format

```
[feature] abc123 - User Authentication
  summary:    Login and logout implemented
  next:       Add password reset flow
  status:     in_progress
  worktree:   feature-auth
  files:      src/auth/login.ts, src/auth/logout.ts
  blocks:     def456, ghi789
  blocked by: (none)
```

## Status Values

| Status | Description | Active? | Set Manually? |
|--------|-------------|---------|---------------|
| `planned` | Not started yet | Yes | **NO** - auto-managed |
| `in_progress` | Currently working on it | Yes | Yes |
| `blocked` | Waiting on dependencies | Yes | **NO** - auto-managed |
| `done` | Completed | No | Yes |
| `superseded` | Replaced by different approach | No | Yes |

**Active statuses** are shown by default in `track status`. Use `--all` to see inactive.

**IMPORTANT**: `blocked` and `planned` are automatically managed by the CLI through `--blocks` and `--unblocks`. Never set these manually.

## Track Kinds (Derived)

Kinds are automatically derived from hierarchy:

| Kind | Condition |
|------|-----------|
| `super` | Root track (no parent) - the project itself |
| `feature` | Has children (intermediate node) |
| `task` | No children (leaf node) |

## Dependencies

**Remember**: `A --blocks B` means B waits for A. The BLOCKER gets the `--blocks` flag.

### Creating Dependencies

```bash
# CORRECT: Create tasks first, then add dependencies
track new "Phase 1" --summary "..." --next "..."
# → phase1-id

track new "Phase 2" --summary "..." --next "Waiting for Phase 1"
# → phase2-id

# Phase 1 blocks Phase 2 (Phase 2 waits for Phase 1)
track update <phase1-id> --blocks <phase2-id> \
  --summary "..." --next "..."
```

### Dependency Behavior

1. **Auto-block**: Creating `A --blocks B` automatically sets B to `blocked` status (if B was `planned`)

2. **Auto-unblock**: When A is marked `done`:
   - System checks all tracks A was blocking
   - For each blocked track, if ALL its blockers are now `done`
   - AND the track has actual dependency records (not manually blocked)
   - Status changes from `blocked` to `planned`

3. **Cycle prevention**: Circular dependencies are detected and rejected

### Removing Dependencies

```bash
track update <task-id> --unblocks <other-id>
```

If the unblocked track has no remaining blockers and status is `blocked`, it changes to `planned`.

## Worktree Support

The `track` CLI automatically detects git worktrees:

- When run in a worktree, finds the main repo's `.track/track.db`
- Uses `git rev-parse --git-common-dir` to locate shared database
- Worktree name auto-detected from directory

### Worktree Commands

```bash
# Auto-detect and set worktree
track update <id> --status in_progress
# Worktree set automatically if in a worktree

# Explicit worktree (for testing/override)
track update <id> --worktree my-feature

# Unset worktree
track update <id> --worktree -

# Filter status to worktree
track status --worktree
track status --worktree my-feature
```

## File Associations

Files can be associated with tracks for context:

```bash
# During creation
track new "Feature" --file src/feature.ts --file tests/feature.test.ts

# During update
track update <id> --file src/new-file.ts
```

- File associations are **idempotent** (no duplicates)
- Files appear in `track status` and `track show` output
- Helps agents understand which files relate to which tasks

## JSON Output Schema

`track status --json` returns:

```json
{
  "tracks": [
    {
      "id": "abc123",
      "title": "Project Name",
      "kind": "super",
      "parent_id": null,
      "summary": "...",
      "next_prompt": "...",
      "status": "in_progress",
      "worktree": null,
      "files": [],
      "children": ["def456", "ghi789"],
      "blocks": [],
      "blocked_by": [],
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (invalid input, track not found, etc.) |

## Database Location

- Default: `.track/track.db` in project root
- In worktree: Uses main repo's `.track/track.db`
- SQLite with WAL mode for concurrent access
