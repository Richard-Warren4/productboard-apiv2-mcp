# ProductBoard API v2 Known Limitations

Documented limitations of the ProductBoard API v2 that cannot be worked around via the MCP. Understanding these helps avoid frustration and enables appropriate workarounds.

## Team Filtering Not Supported

### Limitation

The `pb_entity_search` endpoint does NOT support filtering by team. Unlike status, owner, and parent filters which work server-side, team filtering is not available.

### Workaround

1. Fetch features using other available filters (status, owner, name)
2. Filter results client-side by team

```
// Server-side filter what you can, then filter client-side
pb_entity_search({
  entityType: "feature",
  statuses: [{name: "In progress"}]
})
→ Then filter the results by team in your application
```

### Why This Matters

- Cannot directly query "all features assigned to Team X"
- Large workspaces may require fetching many pages before filtering
- Consider using other filters to narrow results first

---

## Subfeature Team Assignment

### Limitation

While the API accepts team updates for subfeatures (`pb_entity_update` with `teams` field), the assignment may not persist consistently.

### Observed Behavior

- API returns 200 OK when updating subfeature teams
- Subsequent fetch may not show the team assignment
- Behavior is inconsistent - sometimes persists, sometimes doesn't

### Workaround

Assign teams at the **parent feature level** instead. Subfeatures can inherit team context from their parent.

```
// Instead of assigning team to subfeature:
pb_entity_update({
  id: "subfeature-id",
  fields: {teams: [{id: "team-uuid"}]}  // May not persist
})

// Assign team to parent feature:
pb_entity_update({
  id: "parent-feature-id",
  fields: {teams: [{id: "team-uuid"}]}  // Works reliably
})
```

---

## Name Search Behavior

### Limitation

The `name` filter in `pb_entity_search` uses **partial, case-insensitive** matching. This is by design but can cause unexpected results.

### Behavior

| Search Name | Matches |
|-------------|---------|
| "auth" | "Authentication", "OAuth Flow", "Author Tools" |
| "API" | "API Gateway", "REST API", "api-integration" |
| "checkout" | "Checkout Flow", "Express Checkout", "checkout-v2" |

### Considerations

- Broad searches may return many unrelated results
- Use additional filters (status, owner) to narrow results
- When looking for exact match, verify results manually

### Best Practice

```
// Add filters to narrow results
pb_entity_search({
  entityType: "feature",
  name: "API",
  statuses: [{name: "In progress"}],
  owners: [{email: "developer@example.com"}]
})
```

---

## Suggestion Field Not Writable

### Limitation

The ProductBoard `suggestion` field (for feature suggestions/requests) is **read-only** via the API. It cannot be set or updated.

### Affected Operations

- `pb_entity_create` - Cannot include `suggestion` field
- `pb_entity_update` - Cannot update `suggestion` field

### Workaround

Use the `description` field for additional context. The MCP automatically wraps plain text in HTML tags.

```
pb_entity_create({
  entityType: "feature",
  fields: {
    name: "Feature from Customer Request",
    description: "Customer feedback: They need X because Y..."
  }
})
```

---

## Read-Only Entity Types

### Limitation

The `user` entity type is **read-only**. Users cannot be created, updated, or deleted via the API.

### Supported Operations for Users

- `pb_entity_list({entityType: "user"})` - List users
- `pb_entity_get({id: "user-uuid"})` - Get user details

### User Management

User management must be done through the ProductBoard UI or SSO provisioning.

---

## Fixed Page Size

### Limitation

The API returns a fixed **100 items per page**. The `pageSize` parameter is not supported.

### Implications

- Cannot request smaller pages to reduce response size
- Cannot request larger pages to reduce API calls
- Must use `pageCursor` for pagination

### Pagination Example

```
// First page (100 items max)
pb_entity_search({entityType: "feature"})
→ Returns {data: [...], pageCursor: "abc123"}

// Next page
pb_entity_search({entityType: "feature", pageCursor: "abc123"})
→ Returns {data: [...], pageCursor: "def456"}

// Continue until pageCursor is null
```

---

## Entity Type: Initiative Not Supported

### Limitation

The `initiative` entity type does NOT exist in ProductBoard API v2.

### Use Instead

For strategic goals and initiatives, use the `objective` entity type:

```
pb_entity_create({
  entityType: "objective",
  fields: {
    name: "Q1 Strategic Initiative"
  }
})
```

---

## API Beta Status

### Notice

ProductBoard API v2 is in **beta**. Response formats, field availability, and behavior may change without notice.

### Recommendations

- Validate entity structure with `pb_entity_types()` and `pb_get_config()`
- Don't rely on undocumented fields
- Check ProductBoard changelog for API updates

---

## pb_list_products Returns Minimal Data

### Limitation

The `pb_list_products` tool returns only product IDs and descriptions (often empty). Product names are not included in the list response.

### Observed Behavior

```
pb_list_products()
→ {products: [{id: "uuid-1", description: ""}, {id: "uuid-2", description: ""}]}
```

### Workaround

Fetch each product individually to get names:

```
pb_list_products()
→ Get list of IDs

pb_entity_get({id: "uuid-1"})
→ {"name": "Mobile App", "owner": "alice@example.com"}

pb_entity_get({id: "uuid-2"})
→ {"name": "Desktop App", "owner": "bob@example.com"}
```

### Why This Matters

- Cannot quickly identify products by name
- Requires N+1 API calls to build a product list with names
- Check `owner` field to find products you own

---

## Features May Require Parent Entity

### Limitation

Many ProductBoard workspaces are configured to require features to have a parent (product or component). This is a workspace-level setting.

### Error Message

```
"Entity of type features cannot be without a parent"
```

### Workaround

Always include a parent when creating features:

```
pb_entity_create({
  entityType: "feature",
  fields: {
    name: "New Feature",
    parent: {id: "product-uuid"},  // Required in many workspaces
    description: {value: "<p>Description</p>"}
  }
})
```

### Finding a Parent

See Pattern 6 in `workflow-patterns.md` for the complete flow.

---

## Custom Field Select Options Not in Config

### Limitation

The configuration endpoint does NOT return available option values for single-select and multi-select custom fields. You won't see what values are valid until you look at existing entities or the ProductBoard UI.

### Observed Behavior

```
pb_get_config({entityType: "feature"})
→ { "Platform Area": { type: "multi_select", options: [] } }
```

### Good News: Option Names Work

Despite the config not listing options, the API accepts option **names** directly - you don't need IDs:

```
pb_entity_update({
  id: "feature-to-update",
  fields: {
    "Platform Area": [{"name": "Desktop"}, {"name": "Mobile"}]
  }
})
```

### Discovering Valid Option Names

If you don't know the valid option names, find them from:
1. **ProductBoard UI** - Look at the field in any feature
2. **Existing entities** - Search features that have the field set

```
pb_entity_search({entityType: "feature", name: "anything"})
→ {
    "customFields": {
      "Platform Area": [
        {"id": "uuid-1", "name": "Desktop"},
        {"id": "uuid-2", "name": "Mobile"}
      ]
    }
  }
```

### Why This Matters

- Config doesn't tell you what values are valid
- But option names work for updates (not just IDs)
- See Pattern 8 in `workflow-patterns.md` for complete workflow

---

## Quick Reference: Limitations Summary

| Area | Limitation | Workaround |
|------|------------|------------|
| Team filtering | Not supported in search | Filter client-side after fetch |
| Subfeature teams | May not persist | Assign teams to parent feature |
| Name search | Partial/case-insensitive | Add other filters to narrow |
| Suggestion field | Read-only | Use description field |
| User entities | Read-only | Manage via UI/SSO |
| Page size | Fixed at 100 | Use pageCursor for pagination |
| Initiative type | Not supported | Use objective type |
| pb_list_products | Returns IDs only, no names | Use pb_entity_get on each |
| Feature parent | May be required | Check workspace config |
| Custom field options | Config doesn't list valid options | Use option names directly, or discover from existing entities |
