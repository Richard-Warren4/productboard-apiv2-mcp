# Research: Generic Entity Support

**Date**: 2025-12-15
**Feature**: 004-generic-entity-support

## Research Questions

### 1. Generic Entity API Patterns

**Question**: How does ProductBoard API v2 handle different entity types uniformly?

**Findings**:
- All entities share the same base endpoint pattern: `/entities` (create/search) and `/entities/{id}` (get/update)
- Entity type is specified in the request body `data.type` field
- Response structure is consistent: `{ data: { id, type, fields, relationships, links } }`
- Configuration endpoint `/entities/configurations` returns field definitions per entity type

**Decision**: Use a single generic handler that routes by entity type, with entity-specific validation based on configuration.

**Rationale**: The API is designed for uniform entity handling. A generic approach aligns with API design and reduces code duplication.

**Alternatives Considered**:
- Separate handlers per entity type: Rejected due to code duplication and maintenance burden
- Dynamic code generation: Rejected as overly complex for 9 entity types

### 2. Field Validation Strategy

**Question**: How should we validate fields before API submission?

**Findings** (from live testing):
- Configuration API returns fields as an object keyed by field ID, not an array
- Each field has: `id`, `name` (display name), `type`, `required`, `readOnly`, `options` (for select types)
- Field IDs are lowercase (e.g., `teams`, `owner`, `status`)
- Display names are title case (e.g., "Teams", "Owner", "Status")
- API accepts field IDs in request, not display names

**Decision**:
1. Cache configuration on first access
2. Normalize field inputs: accept both field IDs and display names, map to IDs
3. Validate against config before API call: warn on read-only, warn on missing required
4. Filter out read-only fields from create/update requests

**Rationale**: Proactive validation prevents API errors and provides better user feedback.

**Alternatives Considered**:
- No validation (pass-through): Rejected as it leads to confusing API error messages
- Strict validation (block on any warning): Rejected as too restrictive; warnings allow user to proceed

### 3. Richtext HTML Validation

**Question**: What HTML tags are allowed in description fields?

**Findings** (from live testing 2025-12-15):
- ProductBoard Entity API returns HTTP 400 for unsupported tags
- Allowed tags: `<b>`, `<i>`, `<s>`, `<u>`, `<br>`, `<a>`, `<code>`, `<img>`, `<p>`
- Rejected tags: `<strong>`, `<em>`, `<div>`, `<span>`, `<h1>`-`<h6>`
- The `<p>` tag works as a wrapper but is not in the official list

**Decision**: Validate HTML before submission, reject `<strong>` (suggest `<b>`), reject `<em>` (suggest `<i>`).

**Rationale**: Prevents API rejection and provides helpful suggestions.

**Alternatives Considered**:
- Auto-convert tags: Rejected as it modifies user content without consent
- No validation: Rejected as it leads to API errors

### 4. Entity-Specific Behaviors

**Question**: Are there entity-specific requirements that break the generic pattern?

**Findings** (from live testing):
| Entity Type | Parent Required | Status Field | Notes |
|-------------|-----------------|--------------|-------|
| objective | No | Yes | Top-level planning entity |
| product | No | No | Top-level container |
| component | Yes (product) | No | Must have product parent |
| feature | Maybe (workspace) | Yes | Some workspaces require parent |
| subfeature | Yes (feature) | Yes | Must have feature parent |
| releaseGroup | No | No | Contains releases |
| release | Yes (releaseGroup) | No | Must have releaseGroup parent |
| company | No | No | Customer data |
| user | N/A | N/A | Read-only |

**Decision**:
1. Check parent requirements from configuration
2. Validate parent type matches expected hierarchy
3. Return clear error if parent missing when required

**Rationale**: Parent requirements vary by entity type and workspace; dynamic validation handles all cases.

### 5. Caching Strategy

**Question**: How should entity configuration be cached?

**Findings**:
- Configuration rarely changes during a session
- Fetching config on every operation would be wasteful
- Configuration is ~20KB for all 9 entity types

**Decision**:
1. Cache configuration in memory for session duration
2. Expose `pb_refresh_config` tool for manual cache invalidation
3. Cache is per-process (MCP server instance)

**Rationale**: Session-based caching balances freshness with performance.

**Alternatives Considered**:
- No caching: Rejected due to API rate limit concerns and latency
- Persistent caching (file/redis): Rejected as overkill for session-based MCP usage

### 6. Error Handling for Rate Limits

**Question**: How should the MCP handle ProductBoard rate limits?

**Findings**:
- ProductBoard API: 50 requests/second per token
- Returns HTTP 429 with `Retry-After` header
- MCP protocol doesn't have built-in retry mechanism

**Decision**: Return clear error to caller with retry-after duration. No automatic retry.

**Rationale**: MCP tools should be transparent; let the calling agent decide retry strategy.

**Alternatives Considered**:
- Automatic retry with backoff: Rejected as it hides failures and complicates tool semantics
- Request queuing: Rejected as overkill for typical MCP usage patterns

## API Endpoint Reference

From official ProductBoard documentation (verified 2025-12-14):

| Operation | Method | Endpoint | Notes |
|-----------|--------|----------|-------|
| List entities | GET | `/entities?type={type}` | Paginated, supports filters |
| Get entity | GET | `/entities/{id}` | Returns single entity |
| Create entity | POST | `/entities` | Body: `{ data: { type, fields, relationships } }` |
| Update entity | PATCH | `/entities/{id}` | Body: `{ data: { fields } }` |
| Search entities | POST | `/entities/search` | Body: `{ data: { type, name?, statuses?, ... } }` |
| Get configuration | GET | `/entities/configurations` | Returns all entity type configs |
| Get type config | GET | `/entities/configurations?type={type}` | Returns single type config |

## Key Learnings Summary

1. **Fields object vs array**: Configuration returns fields as object, need `Object.values()` to iterate
2. **Field ID casing**: API uses lowercase IDs (`teams`), config shows display names ("Teams")
3. **Parent requirements**: Vary by entity type and workspace; must check config
4. **HTML validation**: Entity API is strict; validate before submission
5. **Status discovery**: Status values come from config options or existing entities
6. **Search filters**: Use `statuses`, `owners`, `parent` as direct properties (not `filter` wrapper)
7. **Team filtering**: NOT supported by search endpoint - must use client-side filtering

---

## Search Endpoint Reference (CRITICAL)

**Verified 2025-12-15**: Official ProductBoard documentation is INCORRECT about the search endpoint.

### What DOES NOT Work
The official docs show a `filter` wrapper property - **this does NOT work**:
```json
// WRONG - do not use
{ "data": { "type": "feature", "filter": { "statuses": [...] } } }
```

### What DOES Work
All filter parameters must be direct properties under `data`:

```json
// CORRECT - use this format
{
  "data": {
    "type": "feature",
    "statuses": [{"name": "In Progress"}],
    "owners": [{"email": "john@doe.com"}]
  }
}
```

### Complete Filter Reference

| Parameter | Type | Supported Types | Description |
|-----------|------|-----------------|-------------|
| `type` | string | Required | `feature`, `subfeature`, `objective` |
| `name` | string | All | Partial, case-insensitive text match |
| `statuses` | array | All | `[{"name": "..."}, {"id": "..."}]` |
| `owners` | array | All | `[{"email": "..."}, {"id": "..."}]` |
| `parent` | object | All | `{"id": "parent-uuid"}` |
| `archived` | boolean | All | `true` or `false` |
| `ids` | array | All | `["uuid1", "uuid2"]` - filter to specific IDs |

### NOT Supported

| Parameter | Notes |
|-----------|-------|
| `teams` | Not available as server-side filter. Use client-side filtering. |
| `filter` wrapper | Despite docs, this property is not recognized. |
| `pageSize` | Not supported - API always returns 100 items per page. Use `pageCursor` for pagination. |
| `initiative` type | Entity type not supported by search endpoint (verified 2025-12-15). |
| `timeframe` | Only documented for initiative which isn't supported. |

### Verified Examples

**Feature search with multiple filters**:
```bash
curl -X POST https://api.productboard.com/v2/entities/search \
  -H "content-type: application/json" \
  -d '{
    "data": {
      "type": "feature",
      "parent": {"id": "318de52f-4e38-4c94-a550-a0d47a1f212e"},
      "owners": [{"email": "john@doe.com"}, {"email": "jane@doe.com"}],
      "statuses": [{"name": "Upcoming"}]
    }
  }'
```

**Objective search with status**:
```bash
curl -X POST https://api.productboard.com/v2/entities/search \
  -H "content-type: application/json" \
  -d '{
    "data": {
      "type": "objective",
      "archived": false,
      "statuses": [{"name": "In Progress"}, {"name": "At Risk"}]
    }
  }'
```
