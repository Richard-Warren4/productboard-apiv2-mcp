# Feature Specification: ProductBoard MCP Skills Proof of Concept

**Feature Branch**: `007-pb-skills-poc`
**Created**: 2026-01-12
**Status**: Draft
**Input**: User description: "Start with a single skill (pb-tools-expert) as a proof of concept for n8n-skills style skill system"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Assistant Receives Tool Selection Guidance (Priority: P1)

An AI assistant using the ProductBoard MCP needs to know which tool to use for a given task. When a user asks "find all features owned by Sarah", the assistant should immediately know to use `pb_entity_search` with the owners filter, not `pb_entity_list` followed by manual filtering.

**Why this priority**: Core value proposition - without effective tool selection guidance, AI assistants waste tokens on inefficient approaches or fail to complete tasks. This is the primary reason for creating skills.

**Independent Test**: Can be fully tested by presenting common ProductBoard queries to an AI with the skill loaded and verifying it selects the optimal tool and parameters.

**Acceptance Scenarios**:

1. **Given** a skill-enabled AI assistant, **When** asked to "find features by name", **Then** it recommends `pb_entity_search` with the name parameter (not `pb_entity_list`)
2. **Given** a skill-enabled AI assistant, **When** asked to "get details about feature X", **Then** it recommends `pb_entity_get` with the ID (not `pb_entity_search`)
3. **Given** a skill-enabled AI assistant, **When** asked to "filter features by custom field value", **Then** it recommends `pb_entity_search` with `customFieldFilters` parameter

---

### User Story 2 - AI Assistant Avoids Common Mistakes (Priority: P2)

An AI assistant using the ProductBoard MCP avoids known gotchas like case-sensitive status names, missing parent IDs for subfeatures, and incorrect entity type usage.

**Why this priority**: Preventing errors saves user time and frustration. This builds on P1 by ensuring selected tools are used correctly.

**Independent Test**: Can be tested by presenting error-prone queries and verifying the AI applies correct formatting without user correction.

**Acceptance Scenarios**:

1. **Given** a skill-enabled AI assistant, **When** asked to search for "in progress" features, **Then** it uses the exact status name "In progress" (correct casing)
2. **Given** a skill-enabled AI assistant, **When** asked to create a subfeature, **Then** it always includes the required `parent: {id}` field
3. **Given** a skill-enabled AI assistant, **When** asked to search for initiatives, **Then** it informs the user that initiatives are not supported by ProductBoard API v2

---

### User Story 3 - AI Assistant Follows Effective Workflow Patterns (Priority: P3)

An AI assistant using the ProductBoard MCP follows recommended multi-step workflows, such as "search -> get details -> check relationships" rather than making redundant or out-of-order calls.

**Why this priority**: Workflow optimization reduces token usage and improves response quality. This extends P1 and P2 with sequential guidance.

**Independent Test**: Can be tested by presenting multi-step tasks and verifying the AI follows the recommended tool sequence.

**Acceptance Scenarios**:

1. **Given** a skill-enabled AI assistant, **When** asked to "find a feature and link it to an objective", **Then** it follows: `pb_entity_search` then `pb_entity_get` then `pb_create_relationship`
2. **Given** a skill-enabled AI assistant, **When** asked to create a feature hierarchy, **Then** it creates parent first, then children with proper parent references

---

### Edge Cases

- What happens when the skill references a tool that doesn't exist in the current MCP version? Skill should gracefully note unavailable tools
- How does the skill handle queries that don't match any documented pattern? Skill provides general guidance and suggests consulting CLAUDE.md
- What if the user's ProductBoard workspace has custom statuses with different names? Skill recommends using `pb_get_config` to discover available statuses

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a skill definition file (`SKILL.md`) following Claude Code skill format with frontmatter metadata
- **FR-002**: System MUST document when to use each of the 14 ProductBoard MCP tools in a quick reference table
- **FR-003**: System MUST list at least 5 common mistakes and their corrections for ProductBoard API interactions
- **FR-004**: System MUST provide at least 3 recommended workflow patterns for multi-step operations
- **FR-005**: System MUST include tool selection guidance organized by user goal (find, create, update, link)
- **FR-006**: System MUST be loadable by Claude Code as a custom skill (placed in skills/ directory)
- **FR-007**: System MUST include at least 3 evaluation scenarios in JSON format to validate skill effectiveness
- **FR-008**: System MUST include a plugin configuration file for Claude Code integration

### Key Entities

- **Skill**: A markdown document with frontmatter metadata (name, description, priority) and structured guidance content including tool selection tables, common mistakes, and workflow patterns
- **Evaluation**: A JSON document defining a test query, expected behaviors with the skill, and baseline comparison without the skill
- **Plugin Configuration**: A JSON manifest describing the skill package for Claude Code integration

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI assistant with skill loaded selects the correct primary tool for 90% of common ProductBoard queries on first attempt (measured by evaluation scenarios)
- **SC-002**: AI assistant with skill loaded avoids documented common mistakes (case sensitivity, missing fields) in 95% of interactions
- **SC-003**: Skill documentation covers all 14 ProductBoard MCP tools with clear "when to use" guidance
- **SC-004**: At least 3 evaluation scenarios demonstrate measurable improvement over baseline (skill-less) responses
- **SC-005**: Skill can be loaded into Claude Code without errors within 2 minutes of setup

## Assumptions

- Claude Code supports custom skill loading via markdown files with frontmatter (similar to n8n-skills approach)
- The existing CLAUDE.md content provides sufficient domain knowledge to inform skill guidance
- Evaluation scenarios will be assessed qualitatively by comparing AI responses with and without the skill loaded
- The proof of concept focuses on the pb-tools-expert skill; additional skills (entity hierarchy, search patterns, etc.) will be separate features

## Dependencies

- Existing ProductBoard MCP tool implementations (14 tools documented in CLAUDE.md)
- Knowledge of ProductBoard API v2 gotchas from existing documentation
- Understanding of Claude Code skill format (based on n8n-skills reference implementation)
