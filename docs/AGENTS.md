# Track CLI - AI Agent Guide

> **Purpose:** Maintain project progress context across sessions via hierarchical task tracking. Copy this file to your project root as `AGENTS.md`.

## Essential Workflow

**1. Session Start - Resume Context**
```bash
track status --json
```
Parse JSON to find tracks with status `in_progress`, `planned`, or `blocked`. Read `summary` (what's done) and `next_prompt` (what's next).

**2. During Work - Create & Update**
```bash
# Create new track
track new "<title>" --parent <id> --summary "<text>" --next "<text>" --file <path>

# Update progress
track continue <id> --summary "<comprehensive-summary>" --next "<clear-next-step>" --status <value>
```

**3. Session End - Save State**
Always update in-progress tracks with comprehensive summaries and clear next steps before ending session.

## Commands

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `track init [name]` | Initialize project | `--force` (overwrite) |
| `track new "<title>"` | Create track (defaults to root parent) | `--parent <id>` `--summary <text>` `--next <text>` `--file <path>` |
| `track continue <id>` | Update track (defaults status to in_progress) | `--summary <text>` `--next <text>` `--status <value>` `--file <path>` |
| `track status` | View project state | `--json` (always use for parsing) |

## Status Values

- `planned`: Not started (default for new tracks)
- `in_progress`: Actively working (default for updates)
- `done`: Completed
- `blocked`: Waiting on dependency
- `superseded`: Abandoned

## Track Hierarchy (Derived, Not Specified)

- **super**: Root project OR has grandchildren
- **feature**: Has children but no grandchildren
- **task**: Leaf node (no children)

## JSON Output Structure

```json
{
  "tracks": [{
    "id": "abc12345",              // 8-char nanoid
    "title": "Feature Name",
    "parent_id": "xyz99999",       // null for root
    "summary": "Current state",
    "next_prompt": "Next step",
    "status": "in_progress",
    "kind": "feature",             // derived
    "files": ["src/file.ts"],
    "children": ["child-id"],
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T14:30:00.000Z"
  }]
}
```

## Common Queries

```bash
# Find work in progress
track status --json | jq '.tracks[] | select(.status == "in_progress")'

# Get specific track
track status --json | jq '.tracks[] | select(.id == "abc12345")'

# Find tasks only
track status --json | jq '.tracks[] | select(.kind == "task")'
```

## Key Principles

**DO:**
- Run `track status --json` at every session start
- Provide comprehensive summaries (no history in v1)
- Make `next_prompt` specific and actionable
- Update tracks regularly during work
- Use `--json` for all programmatic parsing

**DON'T:**
- Use vague summaries or next steps
- Forget to update tracks before session end
- Try to remove files (not supported in v1)

## The Breadcrumb Pattern

Leave detailed breadcrumbs in `next_prompt` to guide resumption:

**Bad (vague):**
```bash
--next "Continue with authentication"
```

**Good (specific breadcrumb):**
```bash
--next "Wire up LoginForm component (src/components/LoginForm.tsx) to authAPI.login() in src/api/auth.ts. On success: redirect to /dashboard. On error: show error below form. Then add loading spinner."
```

**Breadcrumb Principles:**
- Be specific: file paths, function names, line numbers
- Be sequential: First X, then Y, then Z
- Include context: Why this approach was chosen
- Reference similar patterns: "See ProfileForm.tsx lines 89-112"

## Example: Create Feature with Tasks

```bash
# Create feature
track new "User Auth" --summary "Need login/logout" --next "Design login form"
# Returns: abc12345

# Create tasks under feature
track new "Login Form" --parent abc12345 --next "Create component"
track new "Logout Button" --parent abc12345 --next "Create button"
```

## Multi-Agent Coordination

- Use `in_progress` status to claim work
- Keep summaries current for handoffs
- Check `track status` before starting new work
- SQLite WAL mode handles concurrent access automatically

## Resources

- Full command reference: `docs/commands.md`
- JSON schema: `docs/schema.json`
- Tool definitions: `docs/tools.json`
