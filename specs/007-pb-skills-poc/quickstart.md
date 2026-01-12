# Quickstart: ProductBoard MCP Skills

**Feature**: 007-pb-skills-poc
**Date**: 2026-01-12

## Overview

This guide explains how to install, use, and test the pb-tools-expert skill for ProductBoard MCP.

## Prerequisites

- Claude Code CLI installed
- ProductBoard MCP server configured and working
- `PRODUCTBOARD_API_TOKEN` environment variable set

## Installation

### Option 1: Copy Skills Directory (Recommended for Development)

```bash
# Clone or copy the skills directory to your project
cp -r skills/ /path/to/your/project/skills/
```

### Option 2: Claude Code Plugin Install (When Available)

```bash
# Install via Claude Code plugin system
claude plugin install pb-mcp-skills
```

### Option 3: Manual SKILL.md Upload (Claude.ai)

1. Open Claude.ai Settings
2. Navigate to Custom Instructions or Skills
3. Upload the contents of `skills/pb-tools-expert/SKILL.md`

## Verification

After installation, verify the skill is active:

1. Start a new Claude Code session
2. Ask: "What tool should I use to find features by owner?"
3. The response should recommend `pb_entity_search` with the `owners` filter

## Usage Examples

### Tool Selection

Ask questions like:
- "How do I find all features with status 'In progress'?"
- "What's the best way to get details about a specific feature?"
- "How do I link a feature to an objective?"

### Avoiding Mistakes

The skill helps avoid common errors:
- Case-sensitive status names ("In progress" not "In Progress")
- Missing parent IDs for subfeatures
- Using unsupported entity types (like "initiative")

### Workflow Patterns

For multi-step tasks:
- "Find a feature and link it to an objective"
- "Create a feature hierarchy with parent and children"
- "Search, get details, then update a feature"

## Running Evaluations

Evaluate skill effectiveness by comparing responses with and without the skill:

### Manual Evaluation Process

1. **Baseline Test** (without skill):
   - Start fresh Claude session without skill loaded
   - Ask the query from an evaluation scenario
   - Record the response

2. **Skill Test** (with skill):
   - Load the pb-tools-expert skill
   - Ask the same query
   - Record the response

3. **Compare** against `expected_behavior` in the evaluation JSON

### Example Evaluation

**Query**: "Find all features owned by john@example.com that are in progress"

**Baseline (expected)**: May use pb_entity_list then filter, or use incorrect parameter format

**With Skill (expected)**:
- Uses `pb_entity_search`
- Includes `owners: [{email: "john@example.com"}]`
- Includes `statuses: [{name: "In progress"}]` (correct casing)

## Troubleshooting

### Skill Not Activating

**Symptom**: AI doesn't follow skill guidance

**Check**:
1. Skill file is in correct location (`skills/pb-tools-expert/SKILL.md`)
2. Frontmatter is valid YAML
3. Description contains relevant keywords

### Incorrect Tool Recommendation

**Symptom**: AI recommends wrong tool despite skill

**Check**:
1. Query matches skill's documented patterns
2. Skill priority is set appropriately (`highest` for this skill)
3. No conflicting skills override the recommendation

### Outdated Guidance

**Symptom**: Skill recommends parameters that don't work

**Check**:
1. SKILL.md matches current CLAUDE.md tool descriptions
2. MCP server version is compatible
3. ProductBoard workspace has expected configuration

## Next Steps

After successful installation and verification:

1. **Test all evaluation scenarios** in `evaluations/pb-tools-expert/`
2. **Customize for your workspace** - add workspace-specific status names if needed
3. **Report issues** - file bugs for incorrect guidance or missing patterns
4. **Contribute** - add new common mistakes or workflow patterns as discovered
