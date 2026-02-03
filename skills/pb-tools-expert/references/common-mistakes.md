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

## Mistake 3: Using Wrong Entity Type

### Supported Entity Types (API v2)

Per OpenAPI spec, these entity types are supported:

| Type | Creatable | Searchable |
|------|-----------|------------|
| objective | Yes | Yes |
| initiative | Yes | Yes |
| keyResult | Yes | Yes |
| product | Yes | No |
| component | Yes | No |
| feature | Yes | Yes |
| subfeature | Yes | Yes |
| releaseGroup | Yes | No |
| release | Yes | No |
| company | Yes | No |
| user | **No** (read-only) | No |

### How to Avoid

1. Use `pb_entity_types()` to see available types for your workspace
2. Check the supported types list before creating entities

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

## Mistake 6: Forgetting archived: false Filter

### The Problem

By default, `pb_entity_search` returns BOTH active and archived features. Archived features clutter results.

### Wrong

```json
{
  "entityType": "feature",
  "statuses": [{"name": "In progress"}]
}
```

This may return archived features that match the status.

### Right

```json
{
  "entityType": "feature",
  "statuses": [{"name": "In progress"}],
  "archived": false
}
```

### Why This Matters

- Archived features still exist in the system
- Search returns all matching features regardless of archive status
- Users typically want only active features

### Best Practice

Always include `archived: false` unless specifically looking for archived items:

```json
{
  "entityType": "feature",
  "name": "checkout",
  "archived": false
}
```

---

## Mistake 7: Wrong Owner Field Format

### The Problem

The owner field accepts two formats, and using the wrong one for the context causes errors.

### For Creating/Updating Features

Use **email** format:

```json
{
  "entityType": "feature",
  "fields": {
    "name": "New Feature",
    "owner": {"email": "developer@example.com"}
  }
}
```

### For Searching Features

Both formats work, but **email** is more reliable:

```json
{
  "entityType": "feature",
  "owners": [{"email": "developer@example.com"}]
}
```

Or with ID:

```json
{
  "entityType": "feature",
  "owners": [{"id": "user-uuid"}]
}
```

### Common Pitfall

Don't mix formats in the same request:

```json
// Wrong - mixing email and id
{
  "owners": [
    {"email": "user1@example.com"},
    {"id": "user-uuid"}
  ]
}
```

### Best Practice

1. For create/update: Always use `{email: "..."}` format
2. For search: Prefer `{email: "..."}` for consistency
3. Use `{id: "..."}` only when you already have the user UUID

---

## Mistake 8: Description Without HTML Tags

### The Problem

ProductBoard requires descriptions in HTML format. Plain text without tags is rejected.

### Wrong (Pre-MCP Fix)

```json
{
  "fields": {
    "description": "This is my feature description"
  }
}
```

### Right

```json
{
  "fields": {
    "description": {"value": "<p>This is my feature description</p>"}
  }
}
```

### Current MCP Behavior

**The MCP now auto-wraps plain text descriptions** in `<p>` tags. Both formats work:

```json
// Plain text - MCP wraps in <p> tags automatically
{
  "fields": {
    "description": "Plain text description"
  }
}

// HTML - Used as-is
{
  "fields": {
    "description": {"value": "<p>Already formatted</p>"}
  }
}
```

### Supported HTML Tags (Official)

ProductBoard API accepts these richtext tags only (from [official docs](https://developer.productboard.com/v2.0.0/reference/richtext)):

| Category | Tags |
|----------|------|
| Headings | `<h1>`, `<h2>` |
| Text | `<p>`, `<b>`, `<i>`, `<u>`, `<s>`, `<code>` |
| Lists | `<ul>`, `<ol>`, `<li>` |
| Blocks | `<pre>`, `<blockquote>`, `<hr/>` |
| Links | `<a href="...">` |

### Validation Rules

- **All tags must be closed** (self-closing `<hr/>` or paired `<p>...</p>`)
- **Attributes must be quoted** (`<a href="url">` not `<a href=url>`)
- **Entity APIs return 400 errors** for unsupported tags

### Unsupported Tags (Cause 400 Errors)

`<div>`, `<span>`, `<table>`, `<img>`, `<script>`, `<br>` (use `<p>` for line breaks)

### Common Error Message

Plain text without tags causes this cryptic error:
```
"Element 'body' cannot have character [children], because the type's content type is element-only."
```
**Solution**: Wrap your text in `<p>` tags: `<p>Your text here</p>`

---

## Quick Reference: Mistake Prevention Checklist

Before making API calls:

- [ ] Status names use exact casing from `pb_get_config`
- [ ] Subfeatures include `parent: {id: "..."}` field
- [ ] Features include `parent` if workspace requires it
- [ ] Entity type is supported (not "initiative")
- [ ] Using `pb_entity_search` for filtered queries (not `pb_entity_list`)
- [ ] Not relying on `pageSize` parameter
- [ ] Using `pageCursor` for multi-page results
- [ ] Including `archived: false` unless searching for archived items
- [ ] Using `{email: "..."}` format for owner fields
- [ ] Description has HTML tags wrapped in `<p>` or uses `{value: "<p>...</p>"}`
