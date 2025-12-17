# SPARC Workflow Guide

Detailed guide for executing the SPARC methodology with track-cli.

## Overview

SPARC breaks down complex features into manageable phases:

| Phase | Focus | Deliverable |
|-------|-------|-------------|
| **S**pecification | What to build | Requirements doc, acceptance criteria |
| **P**seudocode | How to approach | Algorithm outline, flow diagrams |
| **A**rchitecture | Where code goes | File structure, interfaces |
| **R**efinement | Building it | Working code, tests |
| **C**ompletion | Verifying it | All criteria met, documented |

## Phase 1: Plan Ingestion

### Reading the Specification

When given a markdown plan file:

```bash
# Read the plan
cat path/to/spec.md
```

Look for:
- **Title** (H1) → Project name for `track init`
- **Major sections** (H2) → Features
- **Subsections** (H3) → Tasks within features
- **Bullet lists** → Individual work items
- **Dependency keywords** → `--blocks` relationships

### Dependency Keywords

Scan for phrases indicating order:
- "after X is complete"
- "depends on X"
- "requires X"
- "blocked by X"
- "once X is done"
- "prerequisite: X"

### Creating the Track Structure

```bash
# 1. Initialize project
track init "Project Name from H1"

# 2. Create first feature (no dependencies)
track new "Phase 1: Foundation" \
  --summary "Initial setup from spec" \
  --next "Begin SPARC: Start with Specification task"
# Save the returned ID, e.g., phase1_id=abc123

# 3. Create dependent features
track new "Phase 2: Core Features" \
  --summary "Main functionality from spec" \
  --next "Blocked until Phase 1 completes" \
  --blocks $phase1_id
# Save ID: phase2_id=def456

# 4. Create tasks under features
track new "Setup database" \
  --parent $phase1_id \
  --summary "Database initialization" \
  --next "Design schema"
```

## Phase 2: SPARC Execution

For each feature, create and execute SPARC tasks in sequence.

### S - Specification Task

**Purpose**: Define exactly what needs to be built.

```bash
track new "Spec: <Feature Name>" \
  --parent <feature-id> \
  --summary "Define clear requirements and acceptance criteria" \
  --next "Document: 1) Inputs 2) Outputs 3) Constraints 4) Edge cases 5) Acceptance tests"
```

**Acceptance Criteria**:
- [ ] Functional requirements documented
- [ ] Non-functional requirements identified
- [ ] Edge cases listed
- [ ] Acceptance tests defined (how to verify "done")
- [ ] Dependencies on other features noted

**Work Process**:
1. Review the original spec section for this feature
2. Ask clarifying questions if requirements are ambiguous
3. Document inputs, outputs, and constraints
4. Define specific acceptance criteria
5. Update track with findings

```bash
track update <spec-task-id> \
  --status done \
  --summary "Requirements: [summary]. Acceptance: [criteria list]" \
  --next "Proceed to Pseudocode phase"
```

### P - Pseudocode Task

**Purpose**: Design the implementation approach before writing code.

```bash
track new "Pseudocode: <Feature Name>" \
  --parent <feature-id> \
  --summary "Design implementation approach" \
  --next "Write pseudocode for main flows, data structures, error handling" \
  --blocks <spec-task-id>
```

**Acceptance Criteria**:
- [ ] Main algorithm outlined
- [ ] Data flow documented
- [ ] Error handling planned
- [ ] Edge cases addressed in design
- [ ] Performance considerations noted

**Work Process**:
1. Review the Specification output
2. Outline the main algorithm in pseudocode
3. Identify data structures needed
4. Plan error handling strategy
5. Consider performance implications

```bash
track update <pseudo-task-id> \
  --status done \
  --summary "Algorithm: [approach]. Data: [structures]. Errors: [strategy]" \
  --next "Proceed to Architecture phase"
```

### A - Architecture Task

**Purpose**: Define file structure, interfaces, and integration points.

```bash
track new "Architecture: <Feature Name>" \
  --parent <feature-id> \
  --summary "Define file structure and interfaces" \
  --next "Identify: 1) Files to create/modify 2) Interfaces 3) Integration points" \
  --blocks <pseudo-task-id>
```

**Acceptance Criteria**:
- [ ] File list created (new and modified)
- [ ] Interfaces/types defined
- [ ] Integration points identified
- [ ] Test file locations planned
- [ ] No conflicts with existing architecture

**Work Process**:
1. Review existing codebase structure
2. Identify files to create and modify
3. Define interfaces and types
4. Plan test structure
5. Document integration points

```bash
track update <arch-task-id> \
  --status done \
  --summary "Files: [list]. Interfaces: [types]. Integration: [points]" \
  --next "Proceed to Implementation phase" \
  --file src/new-file.ts \
  --file src/modified-file.ts
```

### R - Refinement (Implementation) Task

**Purpose**: Write the actual code and tests.

```bash
track new "Implement: <Feature Name>" \
  --parent <feature-id> \
  --summary "Write code, tests, iterate" \
  --next "Start implementation following Architecture plan" \
  --blocks <arch-task-id>
```

**Acceptance Criteria**:
- [ ] Code written following architecture plan
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Edge cases handled
- [ ] Code follows project conventions

**Work Process**:
1. Set up worktree if needed (see Worktree section)
2. Create files per Architecture plan
3. Implement incrementally, testing as you go
4. Handle edge cases from Specification
5. Run full test suite

```bash
# Update progress during implementation
track update <impl-task-id> \
  --status in_progress \
  --summary "Implemented: [done]. Remaining: [todo]" \
  --next "Next: [specific next step]"

# When implementation complete
track update <impl-task-id> \
  --status done \
  --summary "Implementation complete. All tests passing." \
  --next "Proceed to Completion verification"
```

### C - Completion Task

**Purpose**: Final verification that all acceptance criteria are met.

```bash
track new "Complete: <Feature Name>" \
  --parent <feature-id> \
  --summary "Verify all acceptance criteria met" \
  --next "Run final verification against Spec acceptance criteria" \
  --blocks <impl-task-id>
```

**Acceptance Criteria**:
- [ ] All Specification acceptance criteria verified
- [ ] All tests pass
- [ ] Code reviewed (self or peer)
- [ ] Documentation updated if needed
- [ ] No regressions introduced

**Work Process**:
1. Review original Specification acceptance criteria
2. Verify each criterion is met
3. Run full test suite
4. Check for regressions
5. Update documentation if needed

```bash
track update <complete-task-id> \
  --status done \
  --summary "All acceptance criteria verified. Feature complete." \
  --next "Feature done. Dependent features now unblocked."
```

## Phase 3: Worktree Management

### When to Use Worktrees

Use worktrees for:
- Major features that touch many files
- Work that might conflict with other ongoing work
- Features that need isolated testing
- Parallel development of independent features

### Creating a Worktree

```bash
# Check if project has specific worktree conventions
cat CONTRIBUTING.md  # or similar
cat .claude/commands/*.md  # project-specific commands

# Standard git worktree creation
git worktree add ../project-feature-name -b feature/feature-name

# Navigate to worktree
cd ../project-feature-name

# Verify track database is shared
track status  # Should show same project
```

### Working in a Worktree

```bash
# Start work on a task
track update <task-id> --status in_progress
# Worktree auto-detected and associated

# View only tasks in this worktree
track status --worktree

# Continue working...
# Make commits, run tests, etc.
```

### Completing Worktree Work

```bash
# Mark task complete
track update <task-id> --status done

# If worktree is being deleted, unset it first
track update <task-id> --worktree -

# Return to main repo
cd ../main-project

# Clean up worktree
git worktree remove ../project-feature-name

# Or if you want to keep the branch
git worktree remove ../project-feature-name
# Branch still exists for PR
```

## Phase 4: Adaptive Planning

### Detecting Spec Changes

When specifications change mid-project:

```bash
# Check current state
track status --json

# Review which tasks are affected
# - In progress tasks may need summary updates
# - Planned tasks may need requirement changes
# - New tasks may be needed
# - Dependencies may need adjustment
```

### Adding New Requirements

```bash
# Add new task to existing feature
track new "Handle new requirement X" \
  --parent <feature-id> \
  --summary "New requirement from updated spec" \
  --next "Integrate with existing implementation"

# If it blocks other work
track new "New prerequisite" \
  --parent <feature-id> \
  --summary "Must complete before Y" \
  --blocks <dependent-task-id>
```

### Updating Existing Tasks

```bash
# Update summary to reflect spec changes
track update <task-id> \
  --summary "Updated: now includes requirement X" \
  --next "Revisit implementation to add X"

# Add new dependency
track update <task-id> --blocks <new-blocker-id>

# Remove obsolete dependency
track update <task-id> --unblocks <old-blocker-id>
```

### Handling Scope Reduction

```bash
# If a task is no longer needed
track update <task-id> \
  --status superseded \
  --summary "No longer needed: requirement removed from spec"

# If approach changed
track update <old-task-id> \
  --status superseded \
  --summary "Replaced by new approach"

track new "New approach for X" \
  --parent <feature-id> \
  --summary "Better approach identified" \
  --next "Implement new approach"
```

## Best Practices

### 1. Keep Summaries Current

Update `--summary` frequently to reflect actual state:
- What has been done
- What works
- What remains

### 2. Make Next Steps Specific

`--next` should be actionable:
- Bad: "Continue working"
- Good: "Add validation for email field in src/forms/login.ts:45"

### 3. Associate Files Early

Link relevant files as soon as you touch them:
```bash
track update <id> --file src/new-file.ts
```

### 4. Use Dependencies Strategically

Don't over-block. Only add `--blocks` when:
- There's a real technical dependency
- The blocked work cannot proceed without the blocker

### 5. Check Status Regularly

```bash
# Quick status check
track status

# Detailed JSON for debugging
track status --json | jq '.tracks[] | select(.status == "blocked")'
```

### 6. Complete SPARC Phases

Don't skip phases. Even for "simple" features:
- Spec forces clarity
- Pseudocode prevents dead ends
- Architecture avoids refactoring
- Completion ensures quality
