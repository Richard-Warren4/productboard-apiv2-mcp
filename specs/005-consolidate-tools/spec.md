# Feature Specification: Consolidate MCP Tools

**Feature Branch**: `005-consolidate-tools`
**Created**: 2025-12-15
**Status**: Draft
**Input**: User description: "Remove type-specific feature/subfeature tools, enhance generic entity tools, and update documentation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use Generic Tools for All Entity Operations (Priority: P1)

As an AI assistant using the ProductBoard MCP, I want to use a single set of generic entity tools for all CRUD operations, so that I have a simpler, more consistent interface with fewer tools to understand.

**Why this priority**: Core value proposition - reducing tool count simplifies the MCP interface and reduces context overhead for LLMs.

**Independent Test**: Can be fully tested by performing create, read, update, list, and search operations on features using only `pb_entity_*` tools.

**Acceptance Scenarios**:

1. **Given** I want to create a feature, **When** I use `pb_entity_create(entityType: "feature", ...)`, **Then** the feature is created successfully with all fields supported
2. **Given** I want to list features, **When** I use `pb_entity_list(entityType: "feature")`, **Then** I receive the same data as the old `pb_list_features` tool provided
3. **Given** I want to search features by status, **When** I use `pb_entity_search(entityType: "feature", statuses: [{name: "In progress"}])`, **Then** I receive matching features
4. **Given** I want to update a feature, **When** I use `pb_entity_update(id, fields)`, **Then** the feature is updated successfully

---

### User Story 2 - Subfeature Operations via Generic Tools (Priority: P1)

As an AI assistant, I want to manage subfeatures using the same generic entity tools, so that I don't need separate tools for parent-child entity relationships.

**Why this priority**: Subfeatures are a key use case that must work seamlessly with generic tools.

**Independent Test**: Can be tested by creating, listing, and updating subfeatures using `pb_entity_*` tools with appropriate parent relationships.

**Acceptance Scenarios**:

1. **Given** I want to create a subfeature under a parent feature, **When** I use `pb_entity_create(entityType: "subfeature", fields: {name: "...", parent: {id: "..."}})`, **Then** the subfeature is created with correct parent relationship
2. **Given** I want to list subfeatures for a specific parent, **When** I use `pb_entity_search(entityType: "subfeature", parent: {id: "..."})`, **Then** I receive only subfeatures under that parent

---

### User Story 3 - Clear Documentation for Consolidated Tools (Priority: P2)

As a developer integrating the MCP, I want updated documentation that clearly explains the consolidated tool set, so that I can quickly understand how to use the MCP.

**Why this priority**: Documentation is essential for adoption but doesn't block core functionality.

**Independent Test**: Can be tested by reviewing CLAUDE.md and verifying it accurately describes available tools and their usage.

**Acceptance Scenarios**:

1. **Given** the type-specific tools have been removed, **When** I read CLAUDE.md, **Then** I see only the consolidated tool list without references to removed tools
2. **Given** I want to understand how to search features, **When** I read the documentation, **Then** I find clear examples using `pb_entity_search`

---

### Edge Cases

- What happens when a user tries to call a removed tool name? (Standard MCP "unknown tool" error)
- How does `pb_entity_search` handle all filter parameters previously available in `pb_search_features`? (Same parameters available via `statuses`, `owners`, `parent` filters)
- What happens when listing subfeatures without specifying a parent filter? (Returns all subfeatures, paginated)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove the following type-specific feature tools: `pb_list_features`, `pb_get_feature`, `pb_create_feature`, `pb_update_feature`, `pb_search_features`
- **FR-002**: System MUST remove the following type-specific subfeature tools: `pb_list_subfeatures`, `pb_get_subfeature`, `pb_create_subfeature`, `pb_update_subfeature`
- **FR-003**: System MUST retain all generic entity tools: `pb_entity_create`, `pb_entity_get`, `pb_entity_update`, `pb_entity_list`, `pb_entity_search`, `pb_entity_types`, `pb_refresh_config`
- **FR-004**: System MUST retain relationship tools: `pb_get_relationships`, `pb_create_relationship`, `pb_set_relationship`, `pb_remove_relationship`
- **FR-005**: System MUST retain configuration tools: `pb_get_config`, `pb_list_products`, `pb_list_components`
- **FR-006**: The `pb_entity_create` tool MUST support creating entities with parent relationships via `parent: {id: "..."}` in the fields
- **FR-007**: The `pb_entity_search` tool MUST support filtering by parent ID for subfeature queries
- **FR-008**: System MUST update CLAUDE.md to document only the consolidated tool set
- **FR-009**: System MUST remove unused source files for type-specific tools (features.ts, subfeatures.ts, search.ts)
- **FR-010**: All existing MCP integration tests MUST continue to pass or be updated to use generic tools

### Key Entities

- **MCP Tool**: A callable function exposed by the MCP server with name, description, and parameter schema
- **Tool Registration**: The mapping of tool names to handler functions in the MCP server
- **Tool File**: TypeScript source file containing tool implementations (e.g., entities.ts, features.ts)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Total tool count reduced from 23 to 14 tools (39% reduction, removing 9 tools)
- **SC-002**: All MCP integration tests pass after consolidation
- **SC-003**: CLAUDE.md accurately documents all 14 retained tools with usage examples
- **SC-004**: Source code reduced by removing features.ts (~526 lines), subfeatures.ts (~341 lines), and search.ts
- **SC-005**: Users can perform all feature and subfeature operations using only `pb_entity_*` tools

## Assumptions

- The generic entity tools (`pb_entity_*`) already support all entity types including features and subfeatures
- The `pb_entity_search` tool already supports filtering by status, owner, and parent
- AI assistants using this MCP can easily adapt to using generic tool names
- No external systems depend on the specific tool names being removed

## Out of Scope

- Adding new functionality beyond what currently exists
- Changing the underlying ProductBoard API integration
- Modifying the relationship or configuration tools
- Creating backward compatibility aliases for removed tools
