# Contract: Skill File Schema

**Feature**: 007-pb-skills-poc
**Date**: 2026-01-12

## SKILL.md Format

### Frontmatter Schema (YAML)

```yaml
---
name: string           # Required: Human-readable skill name
description: string    # Required: Brief description for activation matching
priority: string       # Required: One of "highest", "high", "medium", "low"
---
```

### Content Sections (Markdown)

The skill content follows this structure:

```markdown
## Overview

Brief introduction to the skill's purpose and when it activates.

## Tool Selection Guide

| Goal | Tool | Parameters | Notes |
|------|------|------------|-------|
| [User intent] | [Tool name] | [Key params] | [Important context] |

## Common Mistakes

### Mistake 1: [Title]

**Wrong**: [What users/AI might do incorrectly]
**Right**: [Correct approach]
**Why**: [Explanation]

## Workflow Patterns

### Pattern 1: [Name]

**Use when**: [Trigger condition]
**Steps**:
1. [First tool call]
2. [Second tool call]
3. [etc.]

## Best Practices

**Do**:
- [Good practice 1]
- [Good practice 2]

**Don't**:
- [Anti-pattern 1]
- [Anti-pattern 2]
```

## Evaluation Scenario Schema (JSON)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "skills", "query", "expected_behavior", "baseline_without_skill", "with_skill_expected"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^pb-[0-9]{3}$",
      "description": "Unique identifier (e.g., pb-001)"
    },
    "skills": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "description": "Skills required for this test"
    },
    "query": {
      "type": "string",
      "minLength": 1,
      "description": "User question to test"
    },
    "expected_behavior": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "description": "Expected AI behaviors when skill is active"
    },
    "baseline_without_skill": {
      "type": "object",
      "required": ["likely_response", "expected_quality"],
      "properties": {
        "likely_response": { "type": "string" },
        "expected_quality": { "enum": ["Low", "Medium", "High"] }
      }
    },
    "with_skill_expected": {
      "type": "object",
      "required": ["response_quality", "uses_skill_content", "provides_correct_tool"],
      "properties": {
        "response_quality": { "enum": ["Low", "Medium", "High"] },
        "uses_skill_content": { "type": "boolean" },
        "provides_correct_tool": { "type": "boolean" }
      }
    }
  }
}
```

## Plugin Configuration Schema (JSON)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "version", "description", "license"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Package name in kebab-case"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version"
    },
    "description": {
      "type": "string",
      "minLength": 1,
      "description": "Brief package description"
    },
    "author": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "url": { "type": "string", "format": "uri" }
      }
    },
    "license": {
      "type": "string",
      "description": "SPDX license identifier"
    },
    "keywords": {
      "type": "array",
      "items": { "type": "string" }
    },
    "repository": {
      "type": "string",
      "format": "uri"
    },
    "homepage": {
      "type": "string",
      "format": "uri"
    }
  }
}
```

## Examples

### Example SKILL.md Frontmatter

```yaml
---
name: ProductBoard MCP Tools Expert
description: Guides effective use of ProductBoard MCP tools for searching, creating, and managing entities
priority: highest
---
```

### Example Evaluation Scenario

```json
{
  "id": "pb-001",
  "skills": ["pb-tools-expert"],
  "query": "Find all features owned by sarah@example.com",
  "expected_behavior": [
    "Recommends pb_entity_search as the tool",
    "Includes owners filter with email",
    "Does NOT use pb_entity_list followed by filtering"
  ],
  "baseline_without_skill": {
    "likely_response": "May use pb_entity_list and filter manually, or use incorrect filter format",
    "expected_quality": "Medium"
  },
  "with_skill_expected": {
    "response_quality": "High",
    "uses_skill_content": true,
    "provides_correct_tool": true
  }
}
```

### Example Plugin Config

```json
{
  "name": "pb-mcp-skills",
  "version": "1.0.0",
  "description": "Expert skills for using ProductBoard MCP tools effectively",
  "author": {
    "name": "ProductBoard MCP Contributors"
  },
  "license": "MIT",
  "keywords": ["productboard", "mcp", "skills", "ai", "tools"],
  "repository": "https://github.com/your-org/productboard-apiv2-mcp",
  "homepage": "https://github.com/your-org/productboard-apiv2-mcp"
}
```
