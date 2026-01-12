# Common Mistakes with ProductBoard MCP Tools

Detailed explanations of common mistakes and how to avoid them.

## Mistake 1: Case-Sensitive Status Names

### The Problem

ProductBoard status names are case-sensitive. Using incorrect casing returns no results.

### Wrong

```json
{
  "entityType": "feature",
  "statuses": [{"name": "In Progress"}]
}
```

### Right

```json
{
  "entityType": "feature",
  "statuses": [{"name": "In progress"}]
}
```

### Why This Happens

The API performs exact string matching on status names. "In Progress" (uppercase P) is different from "In progress" (lowercase p).

### How to Avoid

1. Always run `pb_get_config({entityType: "feature"})` first
2. Look at the status field configuration for exact names
3. Copy status names exactly as shown
4. Remember: most ProductBoard workspaces use "In progress" with lowercase 'p'

### Common Status Name Formats

| Likely Wrong | Likely Correct |
|--------------|----------------|
| In Progress | In progress |
| At Risk | At risk |
| On Hold | On hold |
| Not Started | Not started |

---

## Mistake 2: Missing Parent ID for Subfeatures

### The Problem

Subfeatures MUST have a parent feature. Creating one without a parent reference fails.

### Wrong

```json
{
  "entityType": "subfeature",
  "fields": {
    "name": "My Subfeature"
  }
}
```

### Right

```json
{
  "entityType": "subfeature",
  "fields": {
    "name": "My Subfeature",
    "parent": {"id": "parent-feature-uuid"}
  }
}
```

### Why This Happens

ProductBoard's data model requires subfeatures to belong to a parent feature. Orphan subfeatures are not allowed.

### How to Avoid

1. Always include `parent: {id: "..."}` when creating subfeatures
2. If unsure of parent ID, use `pb_entity_search` to find the parent feature first
3. Create parent features before their subfeatures

### Workflow for Creating Subfeatures

```
1. pb_entity_search({entityType: "feature", name: "Parent Name"})
   → Get parent feature ID

2. pb_entity_create({
     entityType: "subfeature",
     fields: {
       name: "Subfeature Name",
       parent: {id: "parent-id-from-step-1"}
     }
   })
```

---

## Mistake 3: Using Unsupported "initiative" Entity Type

### The Problem

ProductBoard API v2 does NOT support the "initiative" entity type. Attempting to use it fails.

### Wrong

```json
{
  "entityType": "initiative",
  "name": "Q1 Strategic Initiative"
}
```

### Right

```json
{
  "entityType": "objective",
  "fields": {
    "name": "Q1 Strategic Initiative"
  }
}
```

### Why This Happens

ProductBoard's API v2 has a specific set of supported entity types. While "initiative" might exist in the UI or older API versions, it's not available in v2.

### Supported Entity Types (API v2)

| Type | Creatable | Searchable |
|------|-----------|------------|
| objective | Yes | Yes |
| product | Yes | No |
| component | Yes | No |
| feature | Yes | Yes |
| subfeature | Yes | Yes |
| releaseGroup | Yes | No |
| release | Yes | No |
| company | Yes | No |
| user | **No** (read-only) | No |

### How to Avoid

1. Use `pb_entity_types()` to see available types
2. For strategic goals/initiatives, use `objective`
3. Check the supported types list before creating entities

---

## Mistake 4: Using pb_entity_list for Filtered Queries

### The Problem

Using `pb_entity_list` and filtering results client-side is inefficient and may miss results due to pagination.

### Wrong

```javascript
// Inefficient: fetches all features, then filters
const allFeatures = await pb_entity_list({entityType: "feature"})
const filtered = allFeatures.filter(f => f.owner?.email === "sarah@example.com")
```

### Right

```json
{
  "entityType": "feature",
  "owners": [{"email": "sarah@example.com"}]
}
```

### Why This Matters

- `pb_entity_list` returns ALL entities without filtering
- API returns max 100 items per page
- Client-side filtering may miss items on other pages
- Server-side filtering with `pb_entity_search` is more efficient

### How to Avoid

| If You Need | Use This |
|-------------|----------|
| Features by owner | `pb_entity_search` with `owners` |
| Features by status | `pb_entity_search` with `statuses` |
| Features by name | `pb_entity_search` with `name` |
| Features by parent | `pb_entity_search` with `parent` |
| ALL features (no filter) | `pb_entity_list` |

---

## Mistake 5: Assuming pageSize Parameter Works

### The Problem

The `pageSize` parameter is NOT supported. Trying to use it has no effect.

### Wrong

```json
{
  "entityType": "feature",
  "pageSize": 50
}
```

### Right

```json
{
  "entityType": "feature"
}
```

Then use `pageCursor` from the response for pagination.

### Why This Happens

ProductBoard API v2 has a fixed page size of 100 items. This is not configurable.

### How Pagination Actually Works

1. First request returns up to 100 items + `pageCursor` if more exist
2. Use `pageCursor` value in next request to get next page
3. Continue until no `pageCursor` is returned

### Example Pagination Flow

```
// First page
pb_entity_search({entityType: "feature", statuses: [{name: "In progress"}]})
→ Returns {data: [...100 items...], pageCursor: "abc123"}

// Second page
pb_entity_search({
  entityType: "feature",
  statuses: [{name: "In progress"}],
  pageCursor: "abc123"
})
→ Returns {data: [...more items...], pageCursor: "def456"}

// Continue until pageCursor is null/undefined
```

---

## Quick Reference: Mistake Prevention Checklist

Before making API calls:

- [ ] Status names use exact casing from `pb_get_config`
- [ ] Subfeatures include `parent: {id: "..."}` field
- [ ] Entity type is supported (not "initiative")
- [ ] Using `pb_entity_search` for filtered queries (not `pb_entity_list`)
- [ ] Not relying on `pageSize` parameter
- [ ] Using `pageCursor` for multi-page results
