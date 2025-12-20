---
name: track-sparc
description: Plan and execute complex features using SPARC methodology (Specification, Pseudocode, Architecture, Refinement, Completion) with track-cli. Use when given a project plan or specification in markdown, when implementing a large feature with formal phases, or when explicitly asked to use SPARC.
allowed-tools: Read, Glob, Grep, Edit, Bash
---

# SPARC Project Planning with track-cli

This skill enables planning and execution of complex software projects using the SPARC methodology (Specification, Pseudocode, Architecture, Refinement, Completion) integrated with the `track` CLI for progress tracking.

For general track-cli usage and CLI reference, see [track-basic](../track-basic/SKILL.md).

## Delegation Model

SPARC projects use a **supervisor-worker** model:

- **Supervisor** (track-supervisor) coordinates at the "super" level
- **Workers** (sparc-executor) are **spawned** for each feature
- Each worker gets fresh context, preventing bloat

### When You're a Worker

If you've been **delegated** a specific track:
1. Focus ONLY on your assigned track
2. Complete the work, commit, mark done
3. Return - don't look for next tasks

### When You're a Supervisor

If coordinating a project:
1. Find next planned track
2. Mark it in progress
3. **Spawn** a worker agent for it
4. Wait for completion
5. Repeat with next track

## SPARC Phases

For each major feature, work through these phases:

| Phase | Prefix | Purpose |
|-------|--------|---------|
| **S**pecification | `Spec:` | Define requirements, acceptance criteria, edge cases |
| **P**seudocode | `Pseudocode:` | Design approach, outline algorithms |
| **A**rchitecture | `Architecture:` | File structure, interfaces, data flow |
| **R**efinement | `Implement:` | Write code, tests, iterate |
| **C**ompletion | `Complete:` | Verify acceptance criteria, finalize |

## Worker Workflow

When spawned to implement a track:

### 1. Understand Assignment

You receive:
- Track ID
- Title
- Summary (what to build)
- Next (how to start)

### 2. Execute SPARC Phases

#### S - Specification
```bash
# Define what needs to be built
track update <id> --summary "Spec: Requirements defined. Acceptance: [criteria]" --next "Design approach"
```

#### P - Pseudocode
```bash
# Plan the approach
track update <id> --summary "Pseudocode: Algorithm X, data structure Y" --next "Define architecture"
```

#### A - Architecture
```bash
# Identify files and interfaces
track update <id> --summary "Architecture: Modify src/x.ts, create src/y.ts" --next "Begin implementation"
```

#### R - Refinement (Implementation)
```bash
# Write the code
# ... actual implementation ...
track update <id> --summary "Implemented: feature X complete" --next "Verify"
```

#### C - Completion
```bash
# Verify and commit
npm run build
git add -A && git commit -m "feat: <description>"
track update <id> --status done --summary "Complete: <what was done>" --next "Feature complete"
```

### 3. Return

Report completion. Don't continue to other tasks.

## Supervisor Workflow

When coordinating SPARC execution:

### 1. Check Status
```bash
track status --json
```

### 2. Find Next Track

Look for `status: "planned"` tracks that aren't blocked.

### 3. Spawn Worker

Use Task tool to delegate:

```
subagent_type: "sparc-executor"
prompt: |
  Implement this tracked feature using SPARC methodology.

  Track ID: <id>
  Title: <title>
  Summary: <summary>
  Next: <next_prompt>

  Complete the implementation, commit changes, and mark the track as done.
```

### 4. Wait and Repeat

After worker completes, spawn next worker for next track.

## CRITICAL RULES

### Don't Fill Context

- Supervisors **spawn** workers, don't do the work
- Workers complete ONE track and return
- Each feature gets fresh agent context

### Automatic Status Management

The CLI manages `blocked` and `planned` automatically. Only set:
- `in_progress` - when starting
- `done` - when complete
- `superseded` - when no longer needed

### Stop on Errors

If errors occur:
1. Update track with error details
2. Return/report to supervisor
3. Don't continue to other tasks

## Supporting Documentation

- [WORKFLOW.md](WORKFLOW.md) - Detailed SPARC execution steps
- [TEMPLATES.md](TEMPLATES.md) - Plan parsing patterns
- [track-basic](../track-basic/SKILL.md) - CLI reference and general usage
