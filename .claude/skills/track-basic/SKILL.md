---
name: track-basic
description: Track tasks, features, and project work using the track CLI. Use when breaking down work into tasks, tracking progress, managing dependencies between tasks, or coordinating multi-step work like security scans, refactoring, migrations, or any multi-part project.
allowed-tools: Read, Glob, Grep, Bash
---

# Task Tracking with track-cli

This skill enables tracking and managing project work using the `track` CLI tool. Use it for any multi-step work that benefits from task breakdown, progress tracking, and dependency management.

## When to Use This Skill

- Breaking down work into trackable tasks
- Tracking progress on multi-step projects
- Managing dependencies between tasks
- Coordinating work across git worktrees
- Any multi-part work: security scans, refactoring, migrations, audits, etc.

## CRITICAL RULES

### One Task at a Time

**NEVER tackle the entire project at once.** Work on exactly ONE task at a time:

1. Run `track status` to find the next actionable task (unblocked, not done)
2. Mark it `in_progress` with `track update <id> --status in_progress --summary "Starting..." --next "First step"`
3. Complete ALL work for that single task
4. Mark it `done` with `track update <id> --status done --summary "What was done" --next "Task complete"`
5. THEN find the next task

### Stop on Errors

**If ANY error occurs, STOP immediately.** Do not continue to the next task:

1. Update the track with error details: `track update <id> --summary "Error: <description>" --next "Fix: <specific fix needed>"`
2. Either fix the error OR ask the user for help
3. Only proceed after the error is resolved

### Required Options for `track update`

- Both `--summary` and `--next` are **ALWAYS required** for `track update`
- There is NO `--note` option - use `--summary` for current state and `--next` for next steps
- Both should be specific and actionable

### Automatic Status Management (DO NOT OVERRIDE)

**The CLI automatically manages `blocked` and `planned` status. NEVER manually set these.**

Only use these statuses manually:
- `in_progress` - when starting work
- `done` - when completing a task
- `superseded` - when a task is no longer needed

## Core Workflow

### 1. Check Existing Tracks First (CRITICAL)

**Before creating ANY new tracks**, always check what already exists:

```bash
track status --json
```

Look for:

- **Existing tracks** with `status: "planned"` that match the work to be done
- **Existing feature tracks** that represent the work you're about to do
- If a track already exists for your task, **use it as the parent** for sub-tasks

**IMPORTANT**: If there's already a track that describes the work, add your implementation tasks as children using `--parent <existing-id>`. Do NOT create duplicate tracks.

### 2. Initialize (If Needed)

Only if `.track/` doesn't exist:

```bash
track init "Project Name"
```

### 3. Create Tasks

```bash
# Create a feature/task under root
track new "Security Audit" \
  --summary "Audit codebase for vulnerabilities" \
  --next "Start with dependency check"

# Create sub-task under a parent
track new "Check dependencies" \
  --parent <parent-id> \
  --summary "Scan for vulnerable packages" \
  --next "Run npm audit"

# Add dependency AFTER creating both tasks
# Phase 1 blocks Phase 2 means: Phase 2 waits for Phase 1
track update <phase1-id> --blocks <phase2-id> \
  --summary "Must complete before Phase 2" \
  --next "Start working on this first"
```

### 4. Update Progress

```bash
# Start working
track update <id> --status in_progress \
  --summary "Running npm audit..." \
  --next "Review results and categorize"

# Update with progress
track update <id> \
  --summary "Found 3 high, 5 medium vulnerabilities" \
  --next "Fix high severity issues first"

# Associate files
track update <id> --file package.json --file package-lock.json
```

### 5. Complete Tasks

```bash
# Mark done (triggers dependency cascade)
track update <id> --status done \
  --summary "All vulnerabilities addressed" \
  --next "Dependent tasks now unblocked"
```

## Quick Reference

| Command                  | Purpose                           |
| ------------------------ | --------------------------------- |
| `track init "Name"`      | Initialize project tracking       |
| `track new "Title"`      | Create new task                   |
| `track update <id>`      | Update task progress              |
| `track status`           | View task tree (active only)      |
| `track status <id>`      | View specific track + descendants |
| `track status --json`    | JSON output for parsing           |
| `track status --all`     | Include done/superseded tracks    |
| `track show <id>`        | View task details                 |

### Common Options

| Option              | Description                                     |
| ------------------- | ----------------------------------------------- |
| `--parent <id>`     | Set parent task                                 |
| `--summary "..."`   | Current state description                       |
| `--next "..."`      | Next steps to take                              |
| `--status <value>`  | planned, in_progress, blocked, done, superseded |
| `--blocks <id>`     | This task blocks `<id>` (id waits for this)     |
| `--file <path>`     | Associate a file                                |
| `--worktree <name>` | Associate with git worktree                     |

## Understanding `--blocks` (CRITICAL)

**`A --blocks B` means: B waits for A** (A must complete before B can start)

The blocker (A) uses the `--blocks` flag pointing to the blocked task (B):

```bash
# CORRECT: Phase 1 blocks Phase 2 (Phase 2 waits for Phase 1)
track update <phase1-id> --blocks <phase2-id> \
  --summary "..." --next "..."

# WRONG: This makes Phase 1 wait for Phase 2!
track new "Phase 2" --blocks <phase1-id>  # DON'T DO THIS
```

### Automatic Status Management (DO NOT OVERRIDE)

**The CLI automatically manages `blocked` and `planned` status. NEVER manually set these.**

- When you add `--blocks`: blocked task automatically becomes `blocked`
- When blocker is marked `done`: blocked task automatically becomes `planned`
- When you remove blocker with `--unblocks`: blocked task becomes `planned` if no other blockers

**Only use these statuses manually:**
- `in_progress` - when starting work on a task
- `done` - when completing a task
- `superseded` - when a task is no longer needed

**Recommended workflow for sequential tasks:**

```bash
# 1. Create both tasks first (no dependencies)
track new "Phase 1: Setup" --summary "Initial setup" --next "Start here"
# → abc123

track new "Phase 2: Build" --summary "Main work" --next "Waiting for Phase 1"
# → def456

# 2. Add dependency: Phase 1 blocks Phase 2
track update abc123 --blocks def456 \
  --summary "Initial setup" --next "Start here"
# Now def456 is automatically set to "blocked" status - DO NOT change it!
```

## Best Practices

### Keep Summaries Current

Update `--summary` to reflect actual state:

- What has been done
- What was found/learned
- What remains

### Make Next Steps Specific

`--next` should be actionable:

- Bad: "Continue working"
- Good: "Run npm audit and categorize results by severity"

### Use Dependencies Strategically

Only add `--blocks` when there's a real dependency:

- Task B cannot start until Task A completes
- Results from A are needed to do B

## Full CLI Reference

For complete command documentation, see [TRACK-REFERENCE.md](TRACK-REFERENCE.md).
