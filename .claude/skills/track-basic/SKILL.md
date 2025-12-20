---
name: track-basic
description: Track tasks, features, and project work using the track CLI. Use when breaking down work into tasks, tracking progress, managing dependencies between tasks, or coordinating multi-step work like security scans, refactoring, migrations, or any multi-part project.
allowed-tools: Read, Glob, Grep, Bash
---

# Task Tracking with track-cli

This skill enables tracking and managing project work using the `track` CLI tool. Use it for any multi-step work that benefits from task breakdown, progress tracking, and dependency management.

## Delegation Model

Track-cli is designed for a **supervisor-worker** model:

- **Supervisor** operates at the "super" level, coordinating features
- **Workers** are spawned with fresh context for each feature
- This prevents context bloat from accumulated work

### Supervisor Role

The supervisor (track-supervisor agent):
1. Finds the next planned track
2. Marks it `in_progress`
3. **Spawns** a fresh worker agent
4. Waits for completion
5. Moves to next track

### Worker Role

A spawned worker agent:
1. Receives a single track to implement
2. Does ALL work for that feature
3. Commits changes
4. Marks track as `done`
5. Returns control to supervisor

## When You're a Worker

If you've been **delegated** a specific track:

1. **Focus ONLY on your assigned track** - don't look for other work
2. Implement the feature completely
3. Build and test
4. Commit with descriptive message
5. Update track status:
   ```bash
   track update <id> --status done --summary "What was done" --next "Feature complete"
   ```

## CRITICAL RULES

### One Task at a Time

**NEVER tackle multiple tracks.** Workers handle exactly ONE task:

1. Receive your assigned track
2. Mark it `in_progress`: `track update <id> --status in_progress`
3. Complete ALL work for that single task
4. Mark it `done`: `track update <id> --status done`
5. Return - let supervisor handle the next track

### Stop on Errors

**If ANY error occurs, STOP immediately:**

1. Update the track with error details: `track update <id> --summary "Error: <description>" --next "Fix: <specific fix needed>"`
2. Return to supervisor with error report
3. Do NOT continue to other tasks

### Automatic Status Management

**The CLI automatically manages `blocked` and `planned` status. NEVER manually set these.**

Only use these statuses manually:
- `in_progress` - when starting work
- `done` - when completing a task
- `superseded` - when a task is no longer needed

## Core Commands

### Check Status
```bash
track status           # View task tree (active only)
track status --json    # JSON output for parsing
track status <id>      # View specific track + descendants
track status --all     # Include done/superseded
```

### Update Progress
```bash
# Start working (if not already in_progress)
track update <id> --status in_progress

# Update with progress (summary/next optional, uses current if omitted)
track update <id> --summary "What was done" --next "What's next"

# Mark complete
track update <id> --status done
```

### Create Tasks (supervisors typically do this)
```bash
track new "Task title" \
  --parent <parent-id> \
  --summary "Description" \
  --next "First step"
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `track init "Name"` | Initialize project |
| `track new "Title"` | Create new task |
| `track update <id>` | Update task |
| `track status` | View active tracks |
| `track status --json` | JSON output |
| `track show <id>` | View task details |

### Common Options

| Option | Description |
|--------|-------------|
| `--parent <id>` | Set parent task |
| `--summary "..."` | Current state (optional on update) |
| `--next "..."` | Next steps (optional on update) |
| `--status <value>` | in_progress, done, superseded, on_hold |
| `--blocks <id>` | This task blocks `<id>` |
| `--file <path>` | Associate a file |
| `--worktree <name>` | Associate with git worktree |

## Understanding `--blocks`

**`A --blocks B` means: B waits for A** (A must complete before B can start)

```bash
# CORRECT: Phase 1 blocks Phase 2 (Phase 2 waits for Phase 1)
track update <phase1-id> --blocks <phase2-id>
```

When blocker is marked `done`, blocked task automatically becomes `planned`.

## Best Practices for Workers

### Keep Updates Focused

When updating your track:
- Summarize what you accomplished
- State the result/outcome
- If done, say so clearly

### Commit Before Marking Done

Always commit your changes BEFORE updating status:
```bash
# 1. Commit changes
git add -A && git commit -m "feat: implement feature X"

# 2. THEN mark done
track update <id> --status done --summary "Implemented feature X" --next "Complete"
```

### Signal Completion Clearly

When done, make it obvious:
```bash
track update <id> --status done --summary "Feature complete: <summary>" --next "Done"
```

## Full CLI Reference

For complete command documentation, see [TRACK-REFERENCE.md](TRACK-REFERENCE.md).
