# Feature Specification: Generic Entity Support

**Feature Branch**: `004-generic-entity-support`
**Created**: 2025-12-15
**Status**: Draft
**Input**: User description: "Support CRUD operations for all ProductBoard entity types using dynamic configuration discovery"

## Context

Live API testing and entity discovery revealed:

1. **9 Entity Types Available**: objective, product, component, feature, subfeature, releaseGroup, release, company, user
2. **Shared Field Patterns**: All entities share name, description, owner, archived fields
3. **Planning Entity Extensions**: objective, product, component, feature, subfeature add status, teams, timeframe, health, workProgress
4. **Field Naming**: Config returns display names ("Teams") but API expects lowercase IDs ("teams")
5. **Richtext HTML Restrictions**: Only `<b>`, `<i>`, `<s>`, `<u>`, `<br>`, `<a>`, `<code>`, `<img>`, `<p>` allowed (not `<strong>`/`<em>`)
6. **Workspace Variations**: Some workspaces require parent components for features

### Out of Scope

- **Delete operations**: Excluded due to risk of irreversible data loss from automated agents. May be added in future with explicit confirmation workflows.

### Entity Type Summary (from discovery)

| Entity Type   | Fields | Settable | Required | Notes |
|---------------|--------|----------|----------|-------|
| objective     | 22     | 9        | 1        | Planning entity with timeframe |
| product       | 21     | 8        | 1        | Top-level container |
| component     | 22     | 9        | 1        | Product subdivision |
| feature       | 42     | 13       | 1        | Core planning item |
| subfeature    | 41     | 12       | 1        | Feature breakdown |
| releaseGroup  | 4      | 4        | 1        | Release organization |
| release       | 10     | 10       | 1        | Delivery planning |
| company       | 5      | 4        | 1        | Customer data |
| user          | 5      | 0        | 0        | Read-only user info |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generic Entity CRUD Operations (Priority: P1)

Users need to create, read, update, and list any entity type in ProductBoard using a consistent interface that leverages dynamic configuration for field validation.

**Why this priority**: P1 because this unlocks full ProductBoard management capability through the MCP, beyond just features.

**Independent Test**: Create an objective with name, description, owner, and status using `pb_entity_create`, then retrieve it with `pb_entity_get`.

**Acceptance Scenarios**:

1. **Given** entity type "objective" and valid fields, **When** user calls `pb_entity_create`, **Then** an objective is created in ProductBoard and returned with its ID
2. **Given** any valid entity ID, **When** user calls `pb_entity_get`, **Then** the full entity with all fields is returned
3. **Given** entity type and updated fields, **When** user calls `pb_entity_update`, **Then** only the specified fields are modified
4. **Given** entity type "component", **When** user calls `pb_entity_list`, **Then** all components are returned with pagination support

---

### User Story 2 - Entity-Specific Tool Aliases (Priority: P1)

While generic tools provide flexibility, users commonly work with features and subfeatures and expect dedicated tools with tailored documentation and validation.

**Why this priority**: P1 because features are the most common entity type and specific tools improve discoverability and UX.

**Independent Test**: Create a feature using `pb_create_feature` and verify it works identically to `pb_entity_create` with type="feature".

**Acceptance Scenarios**:

1. **Given** feature fields with description containing `<b>` tags, **When** user calls `pb_create_feature`, **Then** the feature is created with HTML preserved
2. **Given** feature fields with description containing `<strong>` tags, **When** user calls `pb_create_feature`, **Then** a validation error is returned listing allowed tags
3. **Given** existing tools `pb_create_feature`, `pb_get_feature`, etc., **When** implementation is refactored, **Then** all tools continue to work with identical behavior

---

### User Story 3 - Configuration-Driven Field Validation (Priority: P2)

When creating or updating entities, users receive meaningful validation warnings about field types, required fields, and read-only restrictions based on live configuration data.

**Why this priority**: P2 because validation prevents API errors but users can still succeed through trial and error.

**Independent Test**: Attempt to set a read-only field on a feature and verify a warning is returned before the API call.

**Acceptance Scenarios**:

1. **Given** user provides a field marked as `readOnly` in config, **When** calling create/update, **Then** a warning is returned and the field is excluded from the API request
2. **Given** entity type with required field missing, **When** calling create, **Then** a warning lists the required fields
3. **Given** user provides field with incorrect type, **When** calling create/update, **Then** a warning suggests the correct format

---

### User Story 4 - Entity Search Across Types (Priority: P2)

Users need to search for entities by name, status, owner, or other filters across any entity type that supports search.

**Why this priority**: P2 because search enhances productivity but basic CRUD is sufficient for MVP.

**Independent Test**: Search for objectives by status using `pb_entity_search` with type="objective" and status filter.

**Acceptance Scenarios**:

1. **Given** search criteria with type and name filter, **When** user calls `pb_entity_search`, **Then** matching entities are returned
2. **Given** search by status, **When** entity type supports status field, **Then** results are filtered correctly
3. **Given** search on entity type that doesn't support search, **When** API returns error, **Then** a helpful message indicates search isn't available for this type

---

### User Story 5 - List Available Entity Types (Priority: P3)

Users need to discover what entity types are available in their workspace and what fields each type supports.

**Why this priority**: P3 because power users need this but casual users can work with known entity types.

**Independent Test**: Call `pb_entity_types` and verify all 9 entity types are listed with field summaries.

**Acceptance Scenarios**:

1. **Given** user calls `pb_entity_types`, **Then** all available entity types are listed with field counts
2. **Given** user calls `pb_entity_types` with includeFields=true, **Then** full field configurations are included
3. **Given** entity configuration is cached, **When** user calls within session, **Then** cached data is returned without API call

---

### Edge Cases

- What happens when creating an entity type that requires a parent but none is provided?
  - Return validation error listing valid parent types for this entity
- How does the system handle entity types not supported by the API?
  - Return error indicating unsupported entity type with list of valid types
- What happens when workspace configuration changes mid-session?
  - Cached config is used; provide `pb_refresh_config` tool to force refresh
- What happens when ProductBoard API returns rate limit error (HTTP 429)?
  - Return clear error to caller including retry-after duration; no automatic retry

## Requirements *(mandatory)*

### Functional Requirements

**Generic Entity Operations**:
- **FR-001**: System MUST support create operation for entity types: objective, product, component, feature, subfeature, releaseGroup, release, company
- **FR-002**: System MUST support get/read operation for all entity types including user
- **FR-003**: System MUST support update operation for entity types with settable fields
- **FR-004**: System MUST support list operation with pagination for all entity types (default: 100 items per page)
- **FR-005**: System MUST support search operation for entity types that support search (features, subfeatures, objectives)

**Configuration-Based Validation**:
- **FR-006**: System MUST fetch entity configuration on first use and cache for session duration
- **FR-007**: System MUST validate fields against configuration before API calls
- **FR-008**: System MUST warn when read-only fields are provided and exclude them from request
- **FR-009**: System MUST warn when required fields are missing
- **FR-010**: System MUST map field display names to API IDs (e.g., "Teams" → "teams")

**Richtext Validation** (from live test learnings):
- **FR-011**: System MUST reject richtext with `<strong>` tags, suggesting `<b>` instead
- **FR-012**: System MUST reject richtext with `<em>` tags, suggesting `<i>` instead
- **FR-013**: System MUST accept only: `<b>`, `<i>`, `<s>`, `<u>`, `<br>`, `<a>`, `<code>`, `<img>`, `<p>`
- **FR-014**: Validation errors MUST list all allowed tags

**Backward Compatibility**:
- **FR-015**: Existing feature/subfeature tools MUST continue to work unchanged
- **FR-016**: Existing tool schemas MUST remain compatible

### Key Entities

- **EntityType**: One of the 9 supported ProductBoard entity types
- **EntityConfiguration**: Field definitions including type, required, readOnly, options
- **EntityReference**: Object with `id` or other identifier (e.g., `email` for owner)
- **Richtext**: HTML content with restricted tag set for description fields

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 8 writable entity types can be created through generic tools
- **SC-002**: All 9 entity types can be retrieved through generic tools
- **SC-003**: Zero API rejections due to invalid HTML when using MCP validation
- **SC-004**: Zero API rejections due to read-only field assignment when using MCP validation
- **SC-005**: Existing feature/subfeature tests continue to pass
- **SC-006**: Live tests successfully create objective, component, and release entities

## Clarifications

### Session 2025-12-15

- Q: Should MCP support delete operations for entities? → A: No, delete excluded from scope (too risky for automated agents)
- Q: How should MCP handle API rate limit errors (HTTP 429)? → A: Return clear error to caller with retry-after guidance
- Q: What should be the default page size for list operations? → A: 100 items (balanced efficiency)

## Assumptions

- Entity configuration API (`/entities/configurations`) returns all available entity types for the workspace
- Field IDs use lowercase convention consistently across all entity types
- Richtext HTML restrictions apply to all description fields across all entity types
- Search API supports feature, subfeature, and objective types (may vary by workspace)
- User entity type is read-only (no settable fields per discovery)

## Technical Notes

### Tool Structure (Proposed)

**Generic Tools**:
- `pb_entity_create` - Create any entity type
- `pb_entity_get` - Get any entity by ID
- `pb_entity_update` - Update any entity by ID
- `pb_entity_list` - List entities of a type
- `pb_entity_search` - Search entities with filters
- `pb_entity_types` - List available entity types and fields

**Retained Specific Tools** (for discoverability):
- `pb_create_feature` - Alias for pb_entity_create with type="feature"
- `pb_get_feature` - Alias for pb_entity_get
- `pb_update_feature` - Alias for pb_entity_update
- `pb_list_features` - Alias for pb_entity_list with type="feature"
- `pb_search_features` - Alias for pb_entity_search with type="feature"
- (Similarly for subfeatures and components)

### Implementation Approach

1. Create generic entity handler that routes by entity type
2. Refactor existing feature/subfeature tools to use generic handler
3. Add new generic tools that expose the handler directly
4. Cache entity configuration per session
5. Add field validation layer using cached configuration
