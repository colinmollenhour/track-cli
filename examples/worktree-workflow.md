# Example: Git Worktree Workflow

This example demonstrates how Track CLI supports parallel development across git worktrees. When you're working on multiple features simultaneously in different worktrees, Track CLI automatically associates tracks with their worktree and provides filtering to focus on context-relevant work.

## Background

Git worktrees allow you to have multiple working directories from the same repository, enabling parallel development on different branches without constantly switching. Track CLI enhances this workflow by:

1. **Auto-detecting worktrees**: When creating tracks in a worktree, Track CLI automatically tags them with the worktree name
2. **Sharing the database**: All worktrees share the same `.track/track.db` in the main repo root
3. **Filtering by worktree**: Use `--worktree` to show only tracks relevant to your current context

## Setup

```bash
# Main repository
cd ~/projects/my-app

# Initialize track CLI (do this once, in the main repo)
track init "My App"

# Create worktrees for parallel development
git worktree add ../my-app-auth feature/auth
git worktree add ../my-app-ui feature/ui-redesign
```

## Working in Multiple Worktrees

### Feature A: Authentication (in worktree)

```bash
cd ~/projects/my-app-auth

# Tracks created here are automatically tagged with worktree name
track new "OAuth Integration" \
  --summary "Add OAuth2 login support" \
  --next "Set up OAuth provider configuration"
```

**Output:**
```
Created track: OAuth Integration
Track ID: abc12345
Parent: ROOT123
Worktree: my-app-auth
```

### Feature B: UI Redesign (in different worktree)

```bash
cd ~/projects/my-app-ui

# This track gets tagged with 'my-app-ui' worktree
track new "Dashboard Redesign" \
  --summary "New dashboard layout" \
  --next "Create wireframes"
```

**Output:**
```
Created track: Dashboard Redesign
Track ID: def67890
Parent: ROOT123
Worktree: my-app-ui
```

### Viewing All Tracks

From any location (main repo or any worktree):

```bash
track status
```

**Output:**
```
My App (ROOT123) [planned]
├── OAuth Integration (abc12345) @my-app-auth [planned]
│   summary: Add OAuth2 login support
│   next:    Set up OAuth provider configuration
│   status:  planned
└── Dashboard Redesign (def67890) @my-app-ui [planned]
    summary: New dashboard layout
    next:    Create wireframes
    status:  planned
```

Notice the `@worktree-name` suffix showing which worktree each track belongs to.

### Filtering by Current Worktree

When working in a specific worktree, focus on relevant tracks:

```bash
cd ~/projects/my-app-auth

# Show only tracks for current worktree
track status --worktree
```

**Output:**
```
My App (ROOT123) [planned]
└── OAuth Integration (abc12345) @my-app-auth [planned]
    summary: Add OAuth2 login support
    next:    Set up OAuth provider configuration
    status:  planned
```

### Filtering by Worktree Name

You can also filter by a specific worktree name:

```bash
# From anywhere, show tracks for the UI worktree
track status --worktree my-app-ui
```

## JSON Output with Worktree

```bash
track status --json --worktree my-app-auth
```

**Output:**
```json
{
  "tracks": [
    {
      "id": "ROOT123",
      "title": "My App",
      "parent_id": null,
      "worktree": null,
      "kind": "super",
      ...
    },
    {
      "id": "abc12345",
      "title": "OAuth Integration",
      "parent_id": "ROOT123",
      "worktree": "my-app-auth",
      "kind": "task",
      ...
    }
  ]
}
```

## Worktree Inheritance

Child tracks inherit their parent's worktree by default:

```bash
cd ~/projects/my-app-auth

# Create parent track
track new "Auth Feature" --summary "Authentication system" --next "Plan tasks"

# Child tracks inherit worktree from parent
track new "Login Form" --parent AUTH123 --summary "Login UI" --next "Build form"
track new "Session Management" --parent AUTH123 --summary "Handle sessions" --next "Implement"
```

All three tracks will have `worktree: my-app-auth`.

## Explicit Worktree Override

You can explicitly set or override the worktree:

```bash
# Create with explicit worktree (different from current)
track new "Shared Utils" \
  --worktree "" \
  --summary "Shared utilities" \
  --next "Extract common code"

# Update to change worktree
track update XYZ789 \
  --summary "Moved to auth" \
  --next "Continue work" \
  --worktree my-app-auth

# Unset worktree (use '-')
track update XYZ789 \
  --summary "Now shared" \
  --next "Make generic" \
  --worktree -
```

## Best Practices

### 1. Initialize Once

Initialize Track CLI in the main repository. All worktrees will share the same database.

```bash
cd ~/projects/my-app  # Main repo
track init "My App"
```

### 2. Use Worktree Filtering

When focused on a specific feature, use `--worktree` to reduce noise:

```bash
# Quick way to see current worktree's tracks
track status -w
```

### 3. Tag Shared Work

For tracks that span multiple worktrees, either:
- Don't assign a worktree (create in main repo)
- Use an explicit worktree name like "shared"

### 4. AI Agent Integration

When using AI agents in worktrees, the agent can filter to relevant context:

```bash
# AI session start in a worktree
track status --json --worktree
```

This gives the AI only the tracks relevant to the current feature branch.

## Summary

| Command | Description |
|---------|-------------|
| `track status` | Show all tracks with @worktree suffix |
| `track status -w` | Filter to current worktree |
| `track status -w <name>` | Filter to specific worktree |
| `track new "X" --worktree <name>` | Create with explicit worktree |
| `track update ID --worktree -` | Unset worktree |
