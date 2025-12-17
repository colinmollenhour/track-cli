# Plan Parsing Templates

Patterns for recognizing and converting markdown specifications into track structures.

## Recognizing Project Structure

### Headers as Hierarchy

```markdown
# Project Title          → track init "Project Title"
## Phase 1: Setup        → track new "Phase 1: Setup" (feature under root)
## Phase 2: Core         → track new "Phase 2: Core" --blocks <phase1>
### Task A               → track new "Task A" --parent <phase2>
### Task B               → track new "Task B" --parent <phase2>
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
2. Second step           → track new "Second step" --blocks <step1>
3. Third step            → track new "Third step" --blocks <step2>
```

Numbered lists imply sequential dependencies.

## Dependency Detection

### Explicit Keywords

| Pattern | Interpretation |
|---------|---------------|
| "after X is complete" | Current blocks X |
| "depends on X" | Current blocks X |
| "requires X" | Current blocks X |
| "blocked by X" | X blocks current |
| "once X is done" | Current blocks X |
| "prerequisite: X" | Current blocks X |
| "before starting Y" | Current blocks Y |

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

Extract: "Phase 2: API Layer" `--blocks` "Phase 1" (by name matching)

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
# Returns: root_id (e.g., abc000)

# Phase 1: Cart Management
track new "Phase 1: Cart Management" \
  --summary "Handle shopping cart operations. Acceptance: items persist, totals update real-time" \
  --next "Start with SPARC Specification phase"
# Returns: phase1_id (e.g., abc111)

# Phase 1 SPARC tasks
track new "Spec: Cart Management" \
  --parent abc111 \
  --summary "Define cart requirements" \
  --next "Document: item storage, persistence strategy, calculation rules"
# Returns: spec1_id

track new "Pseudocode: Cart Management" \
  --parent abc111 \
  --summary "Design cart algorithms" \
  --next "Outline: add/remove/update operations, total calculation" \
  --blocks $spec1_id

track new "Architecture: Cart Management" \
  --parent abc111 \
  --summary "Define cart file structure" \
  --next "Identify files: models, services, API routes" \
  --blocks $pseudo1_id

track new "Implement: Cart Management" \
  --parent abc111 \
  --summary "Build cart functionality" \
  --next "Implement cart service and API" \
  --blocks $arch1_id

track new "Complete: Cart Management" \
  --parent abc111 \
  --summary "Verify cart acceptance criteria" \
  --next "Test: persistence, real-time updates" \
  --blocks $impl1_id

# Phase 1 specific tasks (under implementation or as siblings)
track new "Add items to cart" \
  --parent abc111 \
  --summary "POST /cart/items endpoint" \
  --next "Define request schema"

track new "Remove items from cart" \
  --parent abc111 \
  --summary "DELETE /cart/items/:id endpoint" \
  --next "Define response handling"

track new "Update quantities" \
  --parent abc111 \
  --summary "PATCH /cart/items/:id endpoint" \
  --next "Handle validation"

track new "Calculate totals" \
  --parent abc111 \
  --summary "Cart total calculation service" \
  --next "Handle discounts, taxes"

# Phase 2: Payment Processing (blocks Phase 1)
track new "Phase 2: Payment Processing" \
  --summary "Integrate with payment gateway. Acceptance: successful payments create orders, errors shown clearly" \
  --next "Blocked until Cart Management complete" \
  --blocks abc111
# Returns: phase2_id (e.g., abc222)

# Phase 2 SPARC and tasks...
# (similar pattern)

# Phase 3: Order Fulfillment (blocks Phase 2)
track new "Phase 3: Order Fulfillment" \
  --summary "Handle post-payment workflow" \
  --next "Blocked until Payment Processing complete" \
  --blocks abc222
# Returns: phase3_id (e.g., abc333)
```

## Template: SPARC Task Creation

For any feature, create this standard set:

```bash
FEATURE_ID="<feature-id>"
FEATURE_NAME="<Feature Name>"

# Specification
SPEC_ID=$(track new "Spec: $FEATURE_NAME" \
  --parent $FEATURE_ID \
  --summary "Define requirements and acceptance criteria" \
  --next "Document inputs, outputs, constraints, edge cases" \
  | grep -oP 'Created track: \K\w+')

# Pseudocode
PSEUDO_ID=$(track new "Pseudocode: $FEATURE_NAME" \
  --parent $FEATURE_ID \
  --summary "Design implementation approach" \
  --next "Write pseudocode, plan data structures, error handling" \
  --blocks $SPEC_ID \
  | grep -oP 'Created track: \K\w+')

# Architecture
ARCH_ID=$(track new "Architecture: $FEATURE_NAME" \
  --parent $FEATURE_ID \
  --summary "Define file structure and interfaces" \
  --next "Identify files, define types, plan integration" \
  --blocks $PSEUDO_ID \
  | grep -oP 'Created track: \K\w+')

# Implementation
IMPL_ID=$(track new "Implement: $FEATURE_NAME" \
  --parent $FEATURE_ID \
  --summary "Write code and tests" \
  --next "Implement following architecture plan" \
  --blocks $ARCH_ID \
  | grep -oP 'Created track: \K\w+')

# Completion
COMPLETE_ID=$(track new "Complete: $FEATURE_NAME" \
  --parent $FEATURE_ID \
  --summary "Verify acceptance criteria" \
  --next "Run final verification" \
  --blocks $IMPL_ID \
  | grep -oP 'Created track: \K\w+')
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
| `2. Second` | `track new "Second" --blocks <first>` |
| `- [ ] Todo` | `track new "Todo"` (planned) |
| `- [x] Done` | `track new "Done" --status done` |
| "depends on X" | `--blocks <X>` |
| "Acceptance:" list | Include in `--summary` or `--next` |
