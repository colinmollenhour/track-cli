---
name: track-sparc
description: Plan and execute complex features using SPARC methodology (Specification, Pseudocode, Architecture, Refinement, Completion) with track-cli. Use when given a project plan or specification in markdown, when implementing a large feature with formal phases, or when explicitly asked to use SPARC.
allowed-tools: Read, Glob, Grep, Edit, Bash
---

# SPARC Project Planning with track-cli

This skill enables planning and execution of complex software projects using the SPARC methodology (Specification, Pseudocode, Architecture, Refinement, Completion) integrated with the `track` CLI for progress tracking.

For general track-cli usage and CLI reference, see [track-basic](../track-basic/SKILL.md).

## When to Use This Skill

- Given a markdown specification or plan file to implement
- Starting a multi-phase development project
- Breaking down a large feature into formal SPARC phases
- When explicitly asked to use SPARC methodology
- Coordinating work across git worktrees with phased implementation

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

## Core Workflow

### 0. Check Existing Tracks First (CRITICAL)

**Before creating ANY new tracks**, always check for existing tracks:

```bash
track status --json
```

Look for:

- **Existing super tracks** with `status: "planned"` that match the work to be done
- **Existing feature tracks** that represent the specification for your task
- If a track already exists for the feature you're implementing, **use it as the parent** for sub-tasks

**IMPORTANT**: If there's already a super track or feature track that describes the work (e.g., "Auto-Refresh" with a summary describing the feature), add your implementation tasks as children of that track using `--parent <existing-id>`. Do NOT create a new parallel feature track.

### 1. Plan Ingestion

When given a specification file:

1. **Check existing tracks** with `track status --json`
2. **Read and analyze** the markdown specification
3. **Extract structure**:
   - Project title → super track (`track init`) **only if no project exists**
   - Major sections/phases → features (`track new` under root) **only if not already tracked**
   - Bullet points → tasks (`track new --parent <feature>`)
   - Dependency keywords → `--blocks` relationships

4. **Initialize tracking** (only if `.track/` doesn't exist):

   ```bash
   track init "Project Name"
   ```

5. **Create hierarchical tracks** with dependencies between phases

### 2. SPARC Execution Per Feature

For each major feature, create and execute these phases:

| Phase             | Track Prefix    | Purpose                                              |
| ----------------- | --------------- | ---------------------------------------------------- |
| **S**pecification | `Spec:`         | Define requirements, acceptance criteria, edge cases |
| **P**seudocode    | `Pseudocode:`   | Design approach, outline algorithms                  |
| **A**rchitecture  | `Architecture:` | File structure, interfaces, data flow                |
| **R**efinement    | `Implement:`    | Write code, tests, iterate                           |
| **C**ompletion    | `Complete:`     | Verify acceptance criteria, finalize                 |

**Dependency rule**: `A --blocks B` means B waits for A. Create tasks first, then add dependencies with `track update <blocker> --blocks <blocked>`.

**IMPORTANT**: The CLI automatically manages `blocked` and `planned` status. NEVER manually set `--status blocked` or `--status planned`. Only use `in_progress`, `done`, or `superseded` manually.

### 3. Worktree Management

For isolated feature development:

```bash
# Create worktree for feature
git worktree add ../project-feature-name feature-branch

# Work in worktree (track database is shared)
cd ../project-feature-name
track status  # Same project data

# Associate tasks with worktree
track update <task-id> --status in_progress
# Worktree auto-detected

# When complete
track update <task-id> --status done --worktree -
```

### 4. Adaptive Planning

When specifications change:

1. Check current state: `track status --json`
2. Identify affected features and tasks
3. Add/update tracks as needed
4. Use `--blocks` / `--unblocks` to adjust dependencies

## Acceptance Criteria Pattern

Always define clear acceptance criteria for tasks:

```bash
track new "Implement auth" \
  --parent <feature-id> \
  --summary "Build authentication system" \
  --next "Acceptance: 1) Login works 2) Logout works 3) Session persists"
```

Mark done only when ALL criteria are verified.

## Example: Ingesting a Plan

**Input specification:**

```markdown
# Build User Dashboard

## Phase 1: API Layer

- User endpoint
- Preferences endpoint

## Phase 2: UI Components

Depends on API Layer.

- Dashboard layout
- Settings panel
```

**Resulting commands:**

```bash
track init "Build User Dashboard"

# STEP 1: Create all phases first (no dependencies yet)
track new "Phase 1: API Layer" --summary "Backend endpoints" --next "Start with user endpoint"
# → abc123

track new "Phase 2: UI Components" --summary "Frontend components" --next "Waiting for API"
# → def456

# STEP 2: Add dependency (Phase 1 blocks Phase 2)
track update abc123 --blocks def456 \
  --summary "Backend endpoints" --next "Start with user endpoint"

# STEP 3: Create child tasks
track new "User endpoint" --parent abc123 --summary "GET/PUT /user" --next "Define schema"
track new "Preferences endpoint" --parent abc123 --summary "GET/PUT /prefs" --next "Define schema"
track new "Dashboard layout" --parent def456 --summary "Main layout" --next "Create component"
track new "Settings panel" --parent def456 --summary "User settings UI" --next "Create component"
```

## Supporting Documentation

- [WORKFLOW.md](WORKFLOW.md) - Detailed SPARC execution steps
- [TEMPLATES.md](TEMPLATES.md) - Plan parsing patterns
- [track-basic](../track-basic/SKILL.md) - CLI reference and general usage
