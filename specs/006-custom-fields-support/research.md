# Research: Custom Fields Support

**Feature**: 006-custom-fields-support
**Date**: 2025-01-09
**Status**: Complete

## Research Tasks Completed

### 1. API Capability Verification

**Question**: Does ProductBoard API v2 return custom field values in bulk operations?

**Finding**: YES - Verified via live API testing 2025-01-09

**Evidence**:
```json
{
  "fields": {
    "name": "Feature name",
    "status": { "id": "...", "name": "Released" },
    "d4ea8854-c960-458a-bf5d-05fda4b22a24": 80,
    "04e8c2b7-2105-402f-aece-c6ce90d6f336": 70
  }
}
```

Custom fields appear as UUID keys directly in the `fields` object. All three operations (list, search, get) return custom field values.

---

### 2. Custom Field Configuration Structure

**Question**: How does the configuration endpoint expose custom field metadata?

**Finding**: Config returns fields as an object keyed by field ID with name, schema, and constraints.

**Evidence**:
```json
{
  "d4ea8854-c960-458a-bf5d-05fda4b22a24": {
    "id": "d4ea8854-c960-458a-bf5d-05fda4b22a24",
    "name": "Reach",
    "schema": "NumberFieldValue",
    "lifecycle": { "create": { "set": true }, "update": { "set": true } }
  }
}
```

**Existing Code**: `config.ts` already has `normalizeFields()` and `SCHEMA_TO_TYPE` mapping to process this.

---

### 3. Server-Side Filtering Capability

**Question**: Can we filter by custom field values via the API?

**Finding**: NO - Not supported. All attempts rejected.

**Tested Approaches**:
| Approach | Error |
|----------|-------|
| UUID key in search body | "properties not allowed by schema" |
| `customFields` array | "properties not allowed by schema" |
| `filter` query param | "unexpected on path" |

**Decision**: Implement client-side filtering.

---

### 4. Field Type Distribution (Hivenet Workspace)

**Question**: What custom field types exist and need support?

**Finding**: 25+ custom fields across multiple types:

| Type | Count | Examples |
|------|-------|----------|
| NumberFieldValue | 12 | Reach, Impact, Confidence, Effort, Revenue Driver, Strategic Multiplier |
| SingleSelectFieldValue | 8 | Launch Ready, Design, Development, Driver |
| MultiSelectFieldValue | 4 | Tags, Eng Team, Platform Area |
| TextFieldValue | 1 | Design (notes) |
| MemberFieldValue | 1 | Designer |

**Decision**: Support all field types in transformation. Only numeric and select fields need filter operators.

---

## Design Decisions

### Decision 1: UUID→Name Transformation Approach

**Decision**: Build mapping on first config fetch, cache for session, transform at response formatting time.

**Rationale**:
- Config already cached via `getSessionCached()` in config.ts
- Transformation is cheap (O(n) object key lookup)
- No additional API calls after first config fetch

**Alternatives Rejected**:
- Real-time lookup per field: Too slow, unnecessary API calls
- Store mapping in external cache: Overkill for session-scoped data

---

### Decision 2: Custom Fields Output Format

**Decision**: Add `customFields` object with field names as keys to entity responses.

**Format**:
```json
{
  "id": "...",
  "name": "Feature name",
  "status": "In progress",
  "customFields": {
    "Reach": 80,
    "Impact": 70,
    "Launch Ready": { "id": "...", "name": "Launched", "color": "green" }
  }
}
```

**Rationale**:
- Human-readable without UUID lookup
- Preserves full value structure for select fields (id, name, color)
- Separate from standard fields for clarity

**Alternatives Rejected**:
- Inline with standard fields: Could conflict with future ProductBoard field names
- UUID keys with name annotation: Still requires users to understand UUIDs

---

### Decision 3: Where to Add Custom Fields in Responses

**Decision**: Add to `formatEntityList()` AND `formatEntity()`.

**Current State**:
- `formatEntity()` (single entity) already includes non-standard fields with UUID keys
- `formatEntityList()` (list/search) only has id, name, status, owner, archived

**Implementation**:
1. Create `transformCustomFields()` utility function
2. Call from both `formatEntity()` and `formatEntityList()`
3. Pass config mapping (cached) to transformation function

---

### Decision 4: Client-Side Filtering Architecture

**Decision**: Add optional `customFieldFilters` parameter to `pb_entity_search`, filter after API response.

**Schema**:
```typescript
customFieldFilters: [
  { field: "Reach", operator: ">=", value: 50 },
  { field: "Impact", operator: ">=", value: 70 }
]
```

**Supported Operators**:
- Numeric: `=`, `!=`, `<`, `<=`, `>`, `>=`
- Select: `=`, `!=` (match by name)

**Rationale**:
- Server-side filtering not available
- Client-side allows complex queries
- Filter uses field names (not UUIDs) for consistency with output format

**Implementation Notes**:
- Fetch all pages first (API returns max 100/page)
- Apply filters in memory
- Return filtered results with pagination reset

**Alternatives Rejected**:
- Single-page filtering only: Would miss results on later pages
- Filter by UUID: Inconsistent with human-readable output format

---

### Decision 5: Pagination with Client-Side Filtering

**Decision**: Fetch all matching server results first, then apply client-side filter.

**Rationale**:
- Cannot know which pages contain matching results without fetching all
- Custom field filter may match sparse results across many pages
- Total result count after filtering is valuable for user

**Trade-offs**:
- Slower for large datasets (must fetch all pages)
- Memory usage for large result sets
- Acceptable given typical feature counts (<1000)

**Mitigation**:
- Add warning if fetching >5 pages
- Document performance implications in tool description

---

### Decision 6: Error Handling for Invalid Filters

**Decision**: Validate filter field names against config before fetching.

**Validation**:
1. Field name must exist in config
2. Operator must be valid for field type (numeric vs select)
3. Return clear error if validation fails

**Error Messages**:
```
"Field 'Rach' not found. Did you mean 'Reach'?"
"Operator '>=' not valid for select field 'Launch Ready'. Use '=' or '!='."
```

---

## Implementation Order

Based on spec priorities and dependencies:

1. **P1: UUID→Name transformation** (enables viewing custom fields)
   - Create `src/utils/custom-fields.ts`
   - Add `buildCustomFieldMapping()` using config cache
   - Add `transformCustomFields()` for entity responses
   - Modify `formatEntity()` and `formatEntityList()` to include custom fields

2. **P2: Client-side filtering** (enables filtering by custom fields)
   - Add `customFieldFilters` schema to search input
   - Add `applyCustomFieldFilters()` function
   - Modify `pb_entity_search` to fetch all pages when filtering
   - Add filter validation against config

3. **P3: Reliable individual fetch** (already works, just add transformation)
   - Verify `pb_entity_get` returns all custom fields
   - Ensure transformation applies to single entity responses

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/custom-fields.ts` | NEW: Transformation and filtering utilities |
| `src/tools/entities.ts` | MODIFY: Add customFields to formatEntity/formatEntityList |
| `src/schemas/inputs.ts` | ADD: CustomFieldFilter schema |
| `src/client/types.ts` | ADD: CustomFieldMapping, CustomFieldFilter types |
| `tests/unit/custom-fields.test.ts` | NEW: Unit tests |
| `tests/live/custom-fields.test.ts` | NEW: Integration tests |
