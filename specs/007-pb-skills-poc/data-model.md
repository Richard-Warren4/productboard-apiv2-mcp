# Data Model: ProductBoard MCP Skills Proof of Concept

**Feature**: 007-pb-skills-poc
**Date**: 2026-01-12

## Overview

This feature introduces documentation artifacts (skills, evaluations, plugin config) rather than database entities. The "data model" describes the structure and relationships of these artifacts.

## Entities

### Skill

A markdown document providing AI assistant guidance for ProductBoard MCP tool usage.

**Location**: `skills/pb-tools-expert/SKILL.md`

**Structure**:
```yaml
---
# Frontmatter (YAML)
name: string           # Display name
description: string    # Activation trigger description
priority: enum         # highest | high | medium | low
---

# Content (Markdown)
## Tool Selection Guide
[Table mapping user goals to tools]

## Common Mistakes
[List of anti-patterns with corrections]

## Workflow Patterns
[Multi-step operation sequences]

## Best Practices
[Do/Don't guidance]
```

**Relationships**:
- Referenced by: Plugin Configuration
- Tested by: Evaluation Scenarios

### Evaluation Scenario

A JSON document defining a test case for skill effectiveness.

**Location**: `evaluations/pb-tools-expert/eval-*.json`

**Structure**:
```typescript
interface EvaluationScenario {
  id: string;                           // Unique identifier (e.g., "pb-001")
  skills: string[];                     // Required skills (e.g., ["pb-tools-expert"])
  query: string;                        // User question to test
  expected_behavior: string[];          // List of expected AI behaviors
  baseline_without_skill: {
    likely_response: string;            // What AI would do without skill
    expected_quality: "Low" | "Medium" | "High";
  };
  with_skill_expected: {
    response_quality: "Low" | "Medium" | "High";
    uses_skill_content: boolean;
    provides_correct_tool: boolean;
    [key: string]: any;                 // Additional assertions
  };
}
```

**Relationships**:
- Tests: Skill
- Part of: Evaluation Suite

### Plugin Configuration

A JSON manifest for Claude Code plugin integration.

**Location**: `.claude-plugin/plugin.json`

**Structure**:
```typescript
interface PluginConfig {
  name: string;           // Package name (e.g., "pb-mcp-skills")
  version: string;        // Semver (e.g., "1.0.0")
  description: string;    // Brief package description
  author: {
    name: string;
    url?: string;
  };
  license: string;        // SPDX identifier (e.g., "MIT")
  keywords: string[];     // Discovery tags
  repository: string;     // GitHub URL
  homepage: string;       // Project URL
}
```

**Relationships**:
- Contains: Skills (via directory structure)
- Contains: Evaluations (via directory structure)

## Entity Relationships Diagram

```text
┌─────────────────────┐
│  Plugin Config      │
│  (.claude-plugin/)  │
└─────────┬───────────┘
          │ contains
          ▼
┌─────────────────────┐     tested by    ┌─────────────────────┐
│  Skill              │◄─────────────────│  Evaluation         │
│  (skills/)          │                  │  (evaluations/)     │
└─────────────────────┘                  └─────────────────────┘
```

## File System Layout

```text
productboard-apiv2-mcp/
├── .claude-plugin/
│   ├── plugin.json           # Plugin manifest
│   └── marketplace.json      # Optional marketplace metadata
├── skills/
│   └── pb-tools-expert/
│       └── SKILL.md          # Main skill definition
├── evaluations/
│   └── pb-tools-expert/
│       ├── eval-001-tool-selection.json
│       ├── eval-002-common-mistakes.json
│       └── eval-003-workflow-patterns.json
└── [existing project files]
```

## Validation Rules

### Skill Validation

| Field | Rule |
|-------|------|
| name | Required, non-empty string |
| description | Required, non-empty string, should contain activation keywords |
| priority | Required, one of: highest, high, medium, low |
| Content sections | At least Tool Selection Guide required |

### Evaluation Validation

| Field | Rule |
|-------|------|
| id | Required, unique across all evaluations |
| skills | Required, non-empty array |
| query | Required, non-empty string |
| expected_behavior | Required, at least 1 item |
| baseline_without_skill | Required object |
| with_skill_expected | Required object |

### Plugin Config Validation

| Field | Rule |
|-------|------|
| name | Required, kebab-case, no spaces |
| version | Required, valid semver |
| description | Required, non-empty |
| license | Required, valid SPDX identifier |
