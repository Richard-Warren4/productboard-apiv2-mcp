# Feature Specification: Custom Fields Support

**Feature Branch**: `006-custom-fields-support`
**Created**: 18 December 2025
**Status**: Draft
**Input**: ProductBoard MCP Usage Report - Critical gap identified: custom field values not accessible in bulk operations

## Clarifications

### Session 2025-12-18

- Q: Should custom fields always be included or require an opt-in parameter? → A: Always include custom fields in list/search/get responses (no opt-in parameter needed)
- Q: How should custom field values appear in API responses? → A: Nested object with field names as keys: `customFields: { "Reach": 80, "Impact": 70, ... }`
- Research: Are custom field descriptions available via API? → No. ProductBoard API v2 only returns id, name, schema, constraints, lifecycle, path, links. No description/help text property is exposed.

### Session 2025-01-09 - API Verification

**VERIFIED**: ProductBoard API v2 **does** return custom field values in bulk operations (list, search, get).

**Key Finding**: Custom fields are returned as **UUID keys directly in the `fields` object**, not as a nested `customFields` object:

```json
{
  "fields": {
    "name": "Feature name",
    "status": { "name": "In progress" },
    "d4ea8854-c960-458a-bf5d-05fda4b22a24": 80,
    "04e8c2b7-2105-402f-aece-c6ce90d6f336": 70
  }
}
```

**DRICE Field UUIDs** (Hivenet workspace):
| Field | UUID | Schema |
|-------|------|--------|
| Reach | `d4ea8854-c960-458a-bf5d-05fda4b22a24` | NumberFieldValue |
| Impact | `04e8c2b7-2105-402f-aece-c6ce90d6f336` | NumberFieldValue |
| Confidence | `c7196b26-9935-4974-9a0a-19da00e569f9` | NumberFieldValue |
| Revenue Driver | `930b95d5-b9a6-4b8c-815a-53aa10e03dea` | NumberFieldValue |
| Strategic Multiplier | `b33d2ed4-f992-46c1-bf0b-25a733df0584` | NumberFieldValue |

**Implementation Implication**: Feature 006 is primarily a **data transformation layer** that:
1. Uses `pb_get_config` to build UUID → field name mapping
2. Transforms UUID-keyed values into human-readable `customFields: { "FieldName": value }` format
3. The API capability is already present; this is UX/presentation work

**Server-side filtering NOT SUPPORTED** (tested 2025-01-09):
- Tried: UUID key in search body → "properties not allowed by schema"
- Tried: `customFields` array → "properties not allowed by schema"
- Tried: `filter` query param on list endpoint → "unexpected on path"
- **Conclusion**: P2 (filter by custom fields) requires **client-side filtering** - fetch all results then filter in code

## Problem Statement

The ProductBoard MCP server returns custom field values in API responses, but they are **keyed by UUID** (e.g., `"d4ea8854-c960-458a-bf5d-05fda4b22a24": 80`) rather than human-readable field names. This makes the data difficult for PMs to interpret without manually cross-referencing the field configuration.

**Current Limitations**:
- Custom field values appear as UUID keys, not readable names like "Reach" or "Impact"
- PMs cannot quickly assess DRICE scores without UUID lookup
- Cannot filter by custom field values (server-side or client-side)
- No transformation layer to present custom fields in a user-friendly format

## User Scenarios & Testing

### User Story 1 - View Custom Fields in Feature Lists (Priority: P1)

As a product manager, I want to see custom field values (DRICE scores) when listing or searching features, so that I can quickly assess feature priorities without opening each one individually.

**Why this priority**: This is the primary reason PMs use ProductBoard - prioritisation. Without bulk access to DRICE scores, the most important PM workflows require falling back to the UI.

**Independent Test**: Can be fully tested by calling `pb_entity_list` or `pb_entity_search` and verifying custom field values appear in the response. Delivers immediate value by enabling priority assessment at a glance.

**Acceptance Scenarios**:

1. **Given** a ProductBoard workspace with features that have DRICE scores populated, **When** the PM calls `pb_entity_list({ entityType: "feature" })`, **Then** each returned feature includes its custom field values (numeric scores and dropdown values)

2. **Given** a search for features by status, **When** the PM calls `pb_entity_search({ entityType: "feature", statuses: [{name: "In progress"}] })`, **Then** the results include custom field values for each matching feature

3. **Given** features with empty/unset custom fields, **When** the PM retrieves them via list or search, **Then** empty fields are represented as null or omitted (not errors)

---

### User Story 2 - Filter Features by Custom Field Values (Priority: P2)

As a product manager, I want to filter features by custom field values (e.g., "Reach >= 50" or "Impact >= 70"), so that I can find high-priority features directly without fetching and sorting all features manually.

**Why this priority**: Enables efficient prioritisation workflows. Currently requires fetching all features and filtering client-side, which is slow and inefficient.

**Independent Test**: Can be fully tested by calling `pb_entity_search` with custom field filters and verifying only matching features are returned.

**Acceptance Scenarios**:

1. **Given** features with varying Reach scores (10, 30, 50, 80), **When** the PM searches with `customFields: [{id: 'reach-uuid', operator: '>=', value: 50}]`, **Then** only features with Reach >= 50 are returned (50, 80)

2. **Given** features with different Impact scores (20, 50, 80), **When** the PM searches with `customFields: [{id: 'impact-uuid', operator: '>=', value: 70}]`, **Then** only features with Impact >= 70 are returned (80)

3. **Given** a search combining status filter AND custom field filter, **When** the PM searches with both, **Then** results match ALL criteria (AND logic)

---

### User Story 3 - Retrieve Individual Feature with All Custom Fields (Priority: P3)

As a product manager, I want to reliably retrieve a single feature with all its custom field values, so that I can see the complete picture of a feature's prioritisation scores.

**Why this priority**: Foundation capability. Individual fetch should always return complete custom field data reliably.

**Independent Test**: Can be fully tested by calling `pb_entity_get` for a feature with known custom field values and verifying all values are returned.

**Acceptance Scenarios**:

1. **Given** a feature with all DRICE fields populated, **When** the PM calls `pb_entity_get({ id: "feature-uuid" })`, **Then** the response includes all custom field values (Reach, Impact, Confidence, Effort, Revenue Driver, Strategic Multiplier)

2. **Given** a feature with some custom fields empty, **When** the PM retrieves it, **Then** populated fields show values, empty fields show null

---

### Edge Cases

- What happens when a custom field is deleted from ProductBoard but features still have data for it?
  - System should gracefully omit the field (no errors)
- What happens when filtering by a custom field that doesn't exist?
  - System should return a clear error message indicating the field ID is invalid
- What happens when the operator is invalid for the field type (e.g., ">=" on a dropdown)?
  - System should return a clear error message indicating incompatible operator
- What happens when custom field values exceed normal ranges?
  - System should return the values as-is (no validation on read)

## Requirements

### Functional Requirements

- **FR-001**: System MUST always include custom field values in `pb_entity_list` responses (no opt-in parameter required)
- **FR-002**: System MUST always include custom field values in `pb_entity_search` responses (no opt-in parameter required)
- **FR-003**: System MUST always include all custom field values in `pb_entity_get` responses
- **FR-004**: System MUST support filtering by numeric custom field values with operators: `=`, `!=`, `<`, `<=`, `>`, `>=`
- **FR-005**: System MUST support filtering by dropdown/select custom field values with operators: `=`, `!=`
- **FR-006**: System MUST handle empty/null custom field values gracefully (no errors)
- **FR-007**: System MUST provide clear error messages when filtering by invalid field IDs or incompatible operators
- **FR-008**: System MUST support combining custom field filters with existing filters (status, owner, name, parent)
- **FR-009**: System MUST document which custom field types support which filter operators

### Key Entities

- **Custom Field**: A user-defined field in ProductBoard with a UUID, name, type (numeric, dropdown, text), and value. Custom fields are configured at the workspace level and can be applied to features/subfeatures. In responses, custom fields appear as a nested object keyed by field name: `customFields: { "FieldName": value, ... }`
- **DRICE Score**: A prioritisation framework used by Hivenet consisting of: Reach (numeric), Impact (numeric), Confidence (numeric), Effort (numeric), Revenue Driver (numeric), Strategic Multiplier (numeric). Note: All DRICE fields in Hivenet's workspace are numeric type (verified via API).
- **Feature**: A ProductBoard entity that can have custom field values attached

## Success Criteria

### Measurable Outcomes

- **SC-001**: PMs can retrieve the top 10 features by DRICE score in a single query (currently impossible)
- **SC-002**: Feature list/search operations return complete custom field data within the same response time as current operations (under 2 seconds)
- **SC-003**: 100% of populated custom field values are returned for features in list/search results
- **SC-004**: Filtering by custom field values returns accurate results (zero false positives/negatives)
- **SC-005**: PM workflow "find highest priority features" reduces from N individual fetches to 1 bulk query

## Assumptions

1. ~~ProductBoard API v2 supports retrieving custom field values in bulk operations~~ **VERIFIED 2025-01-09**: API returns custom fields as UUID keys in the `fields` object for list, search, and get operations
2. Custom field UUIDs are stable and can be obtained via `pb_get_config` - **VERIFIED**: Config endpoint returns field definitions with UUIDs and names
3. The current `pb_get_config` tool already exposes custom field definitions correctly - **VERIFIED**: Returns all custom fields with UUID, name, and schema type
4. ~~ProductBoard API supports server-side filtering by custom field values~~ **NOT SUPPORTED 2025-01-09**: API rejects all attempts to filter by custom fields (tested UUID in body, customFields array, filter query param). **Client-side filtering required.**
5. All numeric custom fields in use are standard numeric types (not formulas or calculated fields) - **VERIFIED**: All DRICE fields use `NumberFieldValue` schema

## Dependencies

- ~~ProductBoard API v2 must support custom field data in list/search endpoints~~ **VERIFIED**: API returns custom fields in all entity operations
- Existing `pb_get_config` tool provides custom field UUIDs needed for filtering - **VERIFIED**
- No breaking changes to existing tool interfaces (additive changes only)

## Out of Scope

- Calculated/formula field values (noted as "nice to have" in evaluation)
- Writing/updating custom field values (separate feature)
- Team assignment for subfeatures (separate issue identified in evaluation)
- Batch create capability (separate feature request)
- Description field format documentation (separate documentation task)
- Custom field descriptions/help text (not available via ProductBoard API v2)
