# Using SPARC Track Agents

This directory contains specialized Claude Code subagents for the SPARC workflow with track-cli.

## Agents Overview

| Agent | Purpose | Model | Tools |
|-------|---------|-------|-------|
| `sparc-planner` | Design track hierarchies from specs | sonnet | Read-only |
| `sparc-executor` | Execute SPARC phases, create tracks | inherit | All |
| `track-manager` | Monitor progress, handle changes | haiku | Read + Bash |

## How They Work Together

```
                    ┌─────────────┐
                    │ User gives  │
                    │ spec/plan   │
                    └──────┬──────┘
                           │
                           ▼
                   ┌───────────────┐
                   │ sparc-planner │  ← Analyzes spec
                   │  (read-only)  │    Outputs JSON plan
                   └───────┬───────┘
                           │
                           ▼
                   ┌───────────────┐
                   │ sparc-executor│  ← Creates tracks
                   │  (full tools) │    Implements features
                   └───────┬───────┘
                           │
                           ▼
                   ┌───────────────┐
                   │ track-manager │  ← Monitors progress
                   │    (fast)     │    Handles changes
                   └───────────────┘
```

All agents load the `track-sparc` skill automatically, giving them access to:
- WORKFLOW.md - SPARC execution guide
- TRACK-REFERENCE.md - CLI command reference
- TEMPLATES.md - Plan parsing patterns

## Invocation Examples

### Explicit Invocation
```
> Use sparc-planner to analyze this specification
> Use sparc-executor to create the tracks from that plan
> Use track-manager to show current progress
```

### Automatic Invocation
Claude will automatically use these agents when appropriate:
- Given a spec to break down → sparc-planner
- Asked to implement from a plan → sparc-executor
- Asked about progress → track-manager

## Example Test Project

Use this sample spec to test the agents manually:

---

### Sample Spec: Todo API

```markdown
# Todo API

A simple REST API for managing todo items with SQLite storage.

## Phase 1: Database Layer

Set up SQLite database with todos table.

### Requirements
- Todos have: id, title, status (pending/done), created_at
- CRUD operations via typed functions
- Unit tests for all operations

### Tasks
- Create database schema
- Implement CRUD functions
- Write unit tests

### Acceptance Criteria
- [ ] Database initializes without errors
- [ ] Can create, read, update, delete todos
- [ ] All unit tests pass

## Phase 2: API Endpoints

Build REST endpoints for todo operations.
Depends on Database Layer.

### Endpoints
- GET /todos - list all todos
- POST /todos - create new todo
- PUT /todos/:id - update todo
- DELETE /todos/:id - delete todo

### Acceptance Criteria
- [ ] All endpoints return correct status codes
- [ ] JSON responses are properly formatted
- [ ] Errors return appropriate messages

## Phase 3: Validation & Error Handling

Add input validation and standardized error responses.
After API Endpoints complete.

### Validation Rules
- Title: required, max 200 characters
- Status: must be "pending" or "done"

### Error Handling
- 400 for validation errors
- 404 for not found
- 500 for server errors

### Acceptance Criteria
- [ ] Invalid requests return 400 with error details
- [ ] Missing todos return 404
- [ ] All errors have consistent JSON format
```

---

## Test Workflow

### 1. Plan the project
```
> Here's a spec for a Todo API (paste spec above). Use sparc-planner to analyze it and design the track structure.
```

Expected: sparc-planner returns JSON plan with 3 features and their dependencies.

### 2. Create tracks
```
> Use sparc-executor to create the tracks from that plan.
```

Expected: sparc-executor runs `track init` and creates all features and SPARC tasks.

### 3. Check status
```
> Use track-manager to show current project progress.
```

Expected: Progress report showing all planned tasks, nothing in progress yet.

### 4. Start work
```
> Use sparc-executor to work on the Specification task for Phase 1.
```

Expected: sparc-executor updates the Spec task to in_progress, works on defining requirements.

### 5. Complete a phase
```
> Use sparc-executor to complete all SPARC phases for Phase 1.
```

Expected: Each phase marked done in sequence, Phase 2 auto-unblocks.

### 6. Handle spec change
```
> The spec changed: we now need user authentication before any todo operations. Use track-manager to update the project.
```

Expected: track-manager adds new "Authentication" feature, updates dependencies.

### 7. Get final status
```
> Use track-manager for a full project health check.
```

Expected: Health report with all tasks, any issues, recommendations.

## Agent Details

### sparc-planner

**Best for:**
- Initial project setup
- Restructuring existing projects
- Analyzing complex specifications

**Characteristics:**
- Uses sonnet for strong reasoning
- Read-only tools (safe exploration)
- Outputs structured JSON

**Does NOT:**
- Create tracks directly
- Modify any files
- Execute commands that change state

### sparc-executor

**Best for:**
- Creating tracks from plans
- Working through SPARC phases
- Implementing features

**Characteristics:**
- Uses conversation's model (inherit)
- Full tool access
- Can be resumed for long implementations

**Key capability:**
- Session resumption - continue long implementations across invocations

### track-manager

**Best for:**
- Quick status checks
- Progress reports
- Handling spec changes
- Debugging blocked tasks

**Characteristics:**
- Uses haiku for speed
- Mostly read-only operations
- Fast turnaround

**Key capability:**
- Rapid progress analysis without polluting main context

## Tips for Best Results

1. **Let agents work autonomously** - Give clear goals, let them execute
2. **Use sparc-planner first** - Better plans lead to smoother execution
3. **Resume sparc-executor** - For long implementations, use agent resumption
4. **Check progress regularly** - track-manager is fast, use it often
5. **Handle changes via track-manager** - It knows the current state

## Troubleshooting

**Agent not being invoked:**
- Be explicit: "Use sparc-planner to..."
- Check if the skill is loaded: `skills: track-sparc`

**Tracks not creating:**
- Verify track CLI is installed and in PATH
- Run `track status` manually to check

**Dependencies not cascading:**
- Check `track show <id> --json` for blocked_by
- Use track-manager to debug

**Agent lost context:**
- For sparc-executor, use the resume feature with agent ID
- Start fresh with sparc-planner if needed
