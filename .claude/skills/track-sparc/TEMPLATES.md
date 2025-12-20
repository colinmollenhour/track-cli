# Plan Parsing Templates

Patterns for recognizing and converting markdown specifications into track structures.

## Recognizing Project Structure

### Headers as Hierarchy

```markdown
# Project Title          → track init "Project Title"
## Phase 1: Setup        → track new "Phase 1: Setup" (feature under root)
## Phase 2: Core         → track new "Phase 2: Core" (create first, add deps later)
### Task A               → track new "Task A" --parent <phase2>
### Task B               → track new "Task B" --parent <phase2>
```

**Add dependencies AFTER creating tasks:**
```bash
# Phase 1 blocks Phase 2 (Phase 2 waits for Phase 1)
track update <phase1-id> --blocks <phase2-id> --summary "..." --next "..."
```

**Rules**:
- H1 (`#`) → Project name (super track)
- H2 (`##`) → Features (direct children of root)
- H3 (`###`) → Tasks (children of preceding H2)
- H4+ (`####`) → Sub-tasks or notes (usually ignored or included in summary)

### Bullet Lists as Tasks

```markdown
## Feature Name
- Task 1                 → track new "Task 1" --parent <feature>
- Task 2                 → track new "Task 2" --parent <feature>
- Task 3                 → track new "Task 3" --parent <feature>
```

### Checkbox Lists

```markdown
## Feature Name
- [ ] Unchecked task     → track new (status: planned)
- [x] Checked task       → track new (status: done)
```

### Numbered Lists (Sequential)

```markdown
## Feature Name
1. First step            → track new "First step" --parent <feature>
2. Second step           → track new "Second step" --parent <feature>
3. Third step            → track new "Third step" --parent <feature>
```

**Add sequential dependencies AFTER creating all steps:**
```bash
# Step 1 blocks Step 2, Step 2 blocks Step 3
track update <step1-id> --blocks <step2-id> --summary "..." --next "..."
track update <step2-id> --blocks <step3-id> --summary "..." --next "..."
```

Numbered lists imply sequential dependencies.

## Dependency Detection

### Explicit Keywords

| Pattern | Interpretation |
|---------|---------------|
| "after X is complete" | X blocks current (current waits for X) |
| "depends on X" | X blocks current (current waits for X) |
| "requires X" | X blocks current (current waits for X) |
| "blocked by X" | X blocks current (current waits for X) |
| "once X is done" | X blocks current (current waits for X) |
| "prerequisite: X" | X blocks current (current waits for X) |
| "before starting Y" | Current blocks Y (Y waits for current) |

**Remember**: `A --blocks B` means B waits for A. Update the BLOCKER with `--blocks <blocked-id>`.

### Implicit Dependencies

1. **Numbered lists**: Item N+1 depends on item N
2. **Phase ordering**: "Phase 2" likely depends on "Phase 1"
3. **Frontend/Backend**: Frontend often depends on API/Backend
4. **Testing**: Tests depend on implementation

### Example Detection

```markdown
## Phase 2: API Layer
Build the REST API endpoints.
Depends on Phase 1 database setup.
```

Extract: Phase 1 blocks Phase 2. After creating both, run:
```bash
track update <phase1-id> --blocks <phase2-id> --summary "..." --next "..."
```

## Acceptance Criteria Patterns

### Explicit Section

```markdown
### Acceptance Criteria
- [ ] User can log in with email/password
- [ ] Invalid credentials show error message
- [ ] Session persists across page refresh
```

→ Include in `--summary` or `--next`:
```bash
track new "Login feature" \
  --summary "Implement login functionality" \
  --next "Acceptance: 1) Login works 2) Error shown for invalid creds 3) Session persists"
```

### Inline Criteria

```markdown
## Login Feature
Implement login. Must support email/password, show errors for invalid input,
and maintain session state.
```

→ Extract criteria from prose into structured format.

### Definition of Done

```markdown
## Feature X
...

**Done when:**
- All tests pass
- Code reviewed
- Documentation updated
```

→ Include in Completion task criteria.

## Full Example: Plan Conversion

### Input Specification

```markdown
# E-Commerce Checkout System

## Overview
Build a complete checkout flow for the e-commerce platform.

## Phase 1: Cart Management
Handle shopping cart operations.

### Tasks
- Add items to cart
- Remove items from cart
- Update quantities
- Calculate totals

### Acceptance Criteria
- [ ] Items persist across sessions
- [ ] Totals update in real-time

## Phase 2: Payment Processing
Integrate with payment gateway.
Depends on Cart Management.

### Tasks
- Stripe integration
- Payment form
- Order confirmation

### Acceptance Criteria
- [ ] Successful payments create orders
- [ ] Failed payments show clear errors

## Phase 3: Order Fulfillment
Handle post-payment workflow.
After payment is complete.

### Tasks
- Send confirmation email
- Update inventory
- Create shipment record
```

### Output Commands

```bash
# Initialize project
track init "E-Commerce Checkout System"

# STEP 1: Create ALL phases first (no dependencies yet)
track new "Phase 1: Cart Management" \
  --summary "Handle shopping cart operations" \
  --next "Start with cart specification"
# → abc111

track new "Phase 2: Payment Processing" \
  --summary "Integrate with payment gateway" \
  --next "Waiting for Phase 1"
# → abc222

track new "Phase 3: Order Fulfillment" \
  --summary "Handle post-payment workflow" \
  --next "Waiting for Phase 2"
# → abc333

# STEP 2: Add phase dependencies (blocker --blocks blocked)
# Phase 1 blocks Phase 2 (Phase 2 waits for Phase 1)
track update abc111 --blocks abc222 \
  --summary "Handle shopping cart operations" \
  --next "Start with cart specification"

# Phase 2 blocks Phase 3 (Phase 3 waits for Phase 2)
track update abc222 --blocks abc333 \
  --summary "Integrate with payment gateway" \
  --next "Waiting for Phase 1"

# STEP 3: Create SPARC tasks for Phase 1 (no dependencies yet)
track new "Spec: Cart" --parent abc111 \
  --summary "Define cart requirements" \
  --next "Document storage, persistence, calculations"
# → spec1

track new "Pseudocode: Cart" --parent abc111 \
  --summary "Design cart algorithms" \
  --next "Waiting for Spec"
# → pseudo1

track new "Architecture: Cart" --parent abc111 \
  --summary "Define cart file structure" \
  --next "Waiting for Pseudocode"
# → arch1

track new "Implement: Cart" --parent abc111 \
  --summary "Build cart functionality" \
  --next "Waiting for Architecture"
# → impl1

track new "Complete: Cart" --parent abc111 \
  --summary "Verify acceptance criteria" \
  --next "Waiting for Implementation"
# → complete1

# STEP 4: Add SPARC task dependencies
track update spec1 --blocks pseudo1 \
  --summary "Define cart requirements" --next "Document storage, persistence, calculations"
track update pseudo1 --blocks arch1 \
  --summary "Design cart algorithms" --next "Waiting for Spec"
track update arch1 --blocks impl1 \
  --summary "Define cart file structure" --next "Waiting for Pseudocode"
track update impl1 --blocks complete1 \
  --summary "Build cart functionality" --next "Waiting for Architecture"
```

## Template: SPARC Task Creation

For any feature, create all tasks first, then add dependencies:

```bash
FEATURE_ID="<feature-id>"
FEATURE_NAME="<Feature Name>"

# STEP 1: Create all SPARC tasks (no dependencies yet)
SPEC_ID=$(track new "Spec: $FEATURE_NAME" \
  --parent $FEATURE_ID \
  --summary "Define requirements and acceptance criteria" \
  --next "Document inputs, outputs, constraints, edge cases" \
  | grep -oP 'Created track: \K\w+')

PSEUDO_ID=$(track new "Pseudocode: $FEATURE_NAME" \
  --parent $FEATURE_ID \
  --summary "Design implementation approach" \
  --next "Waiting for Spec" \
  | grep -oP 'Created track: \K\w+')

ARCH_ID=$(track new "Architecture: $FEATURE_NAME" \
  --parent $FEATURE_ID \
  --summary "Define file structure and interfaces" \
  --next "Waiting for Pseudocode" \
  | grep -oP 'Created track: \K\w+')

IMPL_ID=$(track new "Implement: $FEATURE_NAME" \
  --parent $FEATURE_ID \
  --summary "Write code and tests" \
  --next "Waiting for Architecture" \
  | grep -oP 'Created track: \K\w+')

COMPLETE_ID=$(track new "Complete: $FEATURE_NAME" \
  --parent $FEATURE_ID \
  --summary "Verify acceptance criteria" \
  --next "Waiting for Implementation" \
  | grep -oP 'Created track: \K\w+')

# STEP 2: Add sequential dependencies (blocker --blocks blocked)
track update $SPEC_ID --blocks $PSEUDO_ID \
  --summary "Define requirements and acceptance criteria" \
  --next "Document inputs, outputs, constraints, edge cases"

track update $PSEUDO_ID --blocks $ARCH_ID \
  --summary "Design implementation approach" \
  --next "Waiting for Spec"

track update $ARCH_ID --blocks $IMPL_ID \
  --summary "Define file structure and interfaces" \
  --next "Waiting for Pseudocode"

track update $IMPL_ID --blocks $COMPLETE_ID \
  --summary "Write code and tests" \
  --next "Waiting for Architecture"
```

## Handling Ambiguity

### Unclear Structure

If the spec lacks clear structure:

1. **Ask for clarification**: "The spec doesn't have clear phases. Should I organize by [option A] or [option B]?"

2. **Propose structure**: "I'll organize this into 3 phases: Setup, Core Features, Polish. Does that work?"

3. **Default to logical grouping**:
   - Infrastructure/Setup first
   - Core functionality next
   - UI/Polish last
   - Testing throughout

### Missing Acceptance Criteria

If criteria aren't explicit:

1. **Infer from requirements**: Turn "user can log in" into testable criteria
2. **Ask**: "What defines 'done' for the login feature?"
3. **Use standard patterns**:
   - "Feature works as described"
   - "Tests pass"
   - "No regressions"
   - "Code reviewed"

### Overlapping Features

If features seem to overlap:

1. **Identify shared components**: Create separate track for shared code
2. **Establish clear boundaries**: Document what each feature owns
3. **Use dependencies**: Shared components block dependent features

## Quick Reference: Markdown to Track

| Markdown Element | Track Command |
|-----------------|---------------|
| `# Title` | `track init "Title"` |
| `## Section` | `track new "Section"` (feature) |
| `### Subsection` | `track new "Subsection" --parent <section>` |
| `- Item` | `track new "Item" --parent <current>` |
| `1. First` | `track new "First"` |
| `2. Second` | `track new "Second"`, then `track update <first> --blocks <second>` |
| `- [ ] Todo` | `track new "Todo"` (planned) |
| `- [x] Done` | `track new "Done" --status done` |
| "depends on X" | Create both, then `track update <X> --blocks <current>` |
| "Acceptance:" list | Include in `--summary` or `--next` |

**Remember**: `A --blocks B` means B waits for A. The BLOCKER gets the `--blocks` flag.
