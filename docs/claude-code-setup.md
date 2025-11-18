# Claude Code Setup Guide

How to set up Track CLI to work seamlessly with Claude Code via the personal skill system.

## What is a Claude Code Skill?

Claude Code Skills are modular capabilities that extend Claude's functionality. The track-cli skill teaches Claude how to:
- Automatically check project status at session start
- Create and update tracks as you work
- Maintain progress context across sessions
- Coordinate with other AI agents

## Installation

### Prerequisites

1. **Install track CLI globally:**
   ```bash
   npm install -g @lackeyjb/track-cli
   ```

2. **Verify installation:**
   ```bash
   track --version
   ```

### Install the Personal Skill

**Option A: Copy Skill Files (Recommended for Testing)**

```bash
# Create skill directory
mkdir -p ~/.claude/skills/track-cli

# Copy skill files from track-cli repo
cp -r track-cli-repo-path/docs/claude-skills/* ~/.claude/skills/track-cli/
```

**Option B: Create Symlink (For Development)**

```bash
# Create skill directory
mkdir -p ~/.claude/skills/track-cli

# Symlink to skill files in track-cli repo
ln -s /absolute/path/to/track-cli/docs/claude-skills/* ~/.claude/skills/track-cli/
```

### Verify Installation

1. **Check skill files exist:**
   ```bash
   ls -la ~/.claude/skills/track-cli/
   ```

   You should see:
   - `SKILL.md` (main skill file)
   - `reference.md` (detailed command reference)
   - `workflows.md` (common patterns)
   - `schema.json` (JSON schema)

2. **Test in Claude Code:**
   ```bash
   # Start Claude Code in a test directory
   cd /path/to/test-project

   # Mention track CLI to trigger the skill
   # Ask Claude: "Check if there's a track project here"
   ```

   Claude should automatically use the track-cli skill to check for a project.

## How It Works

### Automatic Invocation

The skill is configured to be **proactive**. Claude will automatically use it when:

1. **Session Start:**
   - Claude detects you're in a project directory
   - Automatically runs `track status --json` to resume context
   - Reports current state and suggests next steps

2. **Creating Work:**
   - You mention creating a feature or task
   - Claude suggests using `track new` to organize work
   - Creates appropriate hierarchy (features → tasks)

3. **During Work:**
   - Claude updates tracks as work progresses
   - Associates files with `--file` flag
   - Provides comprehensive summaries

4. **Session End:**
   - Before concluding, Claude updates in-progress tracks
   - Saves comprehensive summaries and clear next steps
   - Ensures context is preserved for next session

### Manual Invocation

You can also explicitly ask Claude to use track CLI:

```
"Create a track for the authentication feature"
"Update the login form track with our progress"
"Show me all in-progress tracks"
"What should I work on next?"
```

## Using Track CLI with Claude Code

### First Time in a Project

```bash
# 1. Navigate to your project
cd /path/to/your-project

# 2. Start Claude Code
claude

# 3. Ask Claude to initialize tracking
> "Initialize track CLI for this project"

# Claude will run: track init "Project Name"
```

### Resuming Work

```bash
# 1. Start Claude Code in project directory
cd /path/to/your-project
claude

# 2. Claude automatically checks status
# Runs: track status --json
# Reports: "You have 2 in-progress tracks: ..."

# 3. Ask Claude to continue
> "Resume work on the login form"

# Claude reads track details and continues
```

### Creating Features and Tasks

```bash
> "I want to add user authentication"

# Claude suggests structure:
# - Creates feature track: "User Authentication"
# - Suggests breaking into tasks:
#   - Login Form
#   - Logout Button
#   - Session Management
# - Creates tracks with --parent relationships
```

### Ending Session

```bash
> "I need to stop for now"

# Claude automatically:
# 1. Gets all in-progress tracks
# 2. Updates each with comprehensive summary
# 3. Adds clear next steps
# 4. Confirms state saved
```

## Configuration

### Customizing the Skill

Edit `~/.claude/skills/track-cli/SKILL.md` to customize:

**Change proactivity triggers:**
```markdown
description: Use track CLI ... PROACTIVELY check at session start...
```

**Restrict tools (optional):**
```yaml
allowed-tools: Bash, Read  # Remove Grep if not needed
```

**Change model (optional):**
```yaml
model: haiku  # Use faster, cheaper model
```

### Project-Specific Skills

To share the skill with your team, create a project-level skill:

```bash
# In your project repo
mkdir -p .claude/skills/track-cli

# Copy skill files
cp ~/.claude/skills/track-cli/* .claude/skills/track-cli/

# Commit to git
git add .claude/
git commit -m "Add track-cli skill for team"
```

Team members will automatically use the skill when working in this project.

## Troubleshooting

### Skill Not Loading

**Check skill directory:**
```bash
ls -la ~/.claude/skills/track-cli/
```

Ensure `SKILL.md` exists and has valid YAML frontmatter.

**Check SKILL.md syntax:**
```bash
head -20 ~/.claude/skills/track-cli/SKILL.md
```

Should start with:
```markdown
---
name: track-cli
description: ...
---
```

### Claude Not Using Skill Automatically

**Be explicit:**
Instead of: "What's the status?"
Try: "Check track status"

**Verify skill description:**
The description in SKILL.md should mention "PROACTIVELY" and "session start".

### Track Commands Failing

**Verify track CLI is installed:**
```bash
which track
track --version
```

**Check you're in a project directory:**
```bash
track status
```

If error "No project found", run `track init`.

### Permission Errors

**Skill directory permissions:**
```bash
chmod -R 755 ~/.claude/skills/track-cli/
```

**Track database permissions:**
```bash
# Check .track/ ownership
ls -la .track/
```

## Advanced Usage

### Multi-Agent Coordination

Multiple Claude Code sessions can work on same project:

**Agent 1 (Feature A):**
```bash
> "Work on authentication feature"
# Claude updates track abc123 with status: in_progress
```

**Agent 2 (Feature B - concurrent):**
```bash
> "Work on dashboard feature"
# Claude updates track def456 with status: in_progress
# No conflict - different tracks
```

### Skill Updates

When track-cli is updated with new features:

```bash
# Update skill files
cp track-cli-repo-path/docs/claude-skills/* ~/.claude/skills/track-cli/

# Claude will use updated skill on next invocation
```

## Best Practices

1. **Let Claude be proactive:**
   - Don't manually run track commands unless needed
   - Claude will handle status checks and updates

2. **Trust the summaries:**
   - Claude generates comprehensive summaries
   - Review periodically to ensure accuracy

3. **Provide feedback:**
   - If Claude's summaries are too brief, ask for more detail
   - If too verbose, ask for concise updates

4. **Use for team projects:**
   - Commit `.claude/skills/` to git
   - Team benefits from shared context

## Next Steps

- Read [AGENTS.md](AGENTS.md) for AI agent integration patterns
- Check [examples/ai-agent-usage.md](../examples/ai-agent-usage.md) for complete examples
- Review [commands.md](commands.md) for command details

## Future: Plugin Distribution

When track-cli is published as a Claude Code plugin:

```bash
# Install via plugin system (future)
claude plugin install track-cli

# Plugin includes:
# - track CLI binary (or installation script)
# - Skill files (SKILL.md, reference.md, workflows.md)
# - Automatic setup
```

Stay tuned for plugin release!
