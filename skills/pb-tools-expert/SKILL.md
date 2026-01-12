---
name: pb-tools-expert
description: This skill should be used when the user asks to "find features in ProductBoard", "create a feature", "search ProductBoard", "link feature to objective", "get ProductBoard relationships", or mentions ProductBoard entities, features, objectives, subfeatures, or MCP tools like pb_entity_search or pb_get_relationships.
---

## Overview

This skill provides expert guidance for using ProductBoard MCP tools effectively. It covers tool selection, common mistakes to avoid, and workflow patterns for multi-step operations.

**ProductBoard API v2 Beta Notice:** The underlying API is in beta. Response formats may change. Always validate against current documentation.

## Quick Tool Selection

### 14 Available Tools

| Category | Tools |
|----------|-------|
| **Entity** (7) | `pb_entity_create`, `pb_entity_get`, `pb_entity_update`, `pb_entity_list`, `pb_entity_search`, `pb_entity_types`, `pb_refresh_config` |
| **Relationship** (4) | `pb_get_relationships`, `pb_create_relationship`, `pb_set_relationship`, `pb_remove_relationship` |
| **Configuration** (3) | `pb_get_config`, `pb_list_products`, `pb_list_components` |

### Tool Selection by Task

| Task | Tool | Key Parameters |
|------|------|----------------|
| Find by name/status/owner | `pb_entity_search` | `entityType`, `name`, `statuses`, `owners` |
| Find by custom field | `pb_entity_search` | `customFieldFilters` |
| Get specific entity | `pb_entity_get` | `id` |
| List all of a type | `pb_entity_list` | `entityType` |
| Create entity | `pb_entity_create` | `entityType`, `fields` |
| Update entity | `pb_entity_update` | `id`, `fields` |
| Link feature to objective | `pb_create_relationship` | `entityId`, `relationshipType: "link"`, `targetId` |
| View relationships | `pb_get_relationships` | `featureId` |
| Discover config | `pb_get_config` | `entityType` |

For detailed tool reference tables, see `references/tool-reference.md`.

## Critical Mistakes to Avoid

### 1. Case-Sensitive Status Names

```
Wrong: {statuses: [{name: "In Progress"}]}
Right: {statuses: [{name: "In progress"}]}
```

Use `pb_get_config` to discover exact status names.

### 2. Missing Parent for Subfeatures

```
Wrong: {entityType: "subfeature", fields: {name: "Sub"}}
Right: {entityType: "subfeature", fields: {name: "Sub", parent: {id: "parent-uuid"}}}
```

Subfeatures require a parent reference.

### 3. Using "initiative" Entity Type

ProductBoard API v2 does NOT support "initiative". Use `objective` instead.

### 4. Using pb_entity_list for Filtered Queries

Use `pb_entity_search` with filters instead of `pb_entity_list` followed by client-side filtering.

### 5. Assuming pageSize Works

The `pageSize` parameter is NOT supported. API returns 100 items per page. Use `pageCursor` for pagination.

### 6. Forgetting archived: false

Search returns both active and archived features by default. Add `archived: false` to filter:

```
{entityType: "feature", statuses: [{name: "In progress"}], archived: false}
```

### 7. Wrong Owner Field Format

Use `{email: "..."}` for create/update operations. Both `{email}` and `{id}` work for search.

### 8. Description Without HTML Tags

**CRITICAL**: Descriptions MUST be HTML-wrapped. Plain text fails with cryptic error.

```
Wrong: {description: "Plain text"}
Wrong: {description: {value: "Plain text"}}
Right: {description: {value: "<p>Your description here</p>"}}
```

### 9. Creating Features Without Parent

Many ProductBoard workspaces require features to have a parent (product or component).

```
Wrong: {entityType: "feature", fields: {name: "Feature"}}
Right: {entityType: "feature", fields: {name: "Feature", parent: {id: "product-uuid"}}}
```

**To find a parent**: Use `pb_list_products` → `pb_entity_get` on each ID to find names.

For detailed explanations, see `references/common-mistakes.md`.

## Core Workflow Patterns

### Pattern 1: Feature Discovery

```
1. pb_entity_search → Find features by criteria
2. pb_entity_get → Get full details
3. pb_get_relationships → Discover linked entities
```

### Pattern 2: Create and Link

```
1. pb_entity_create → Create new feature
2. pb_create_relationship → Link to objective (type: "link")
```

### Pattern 3: Feature Hierarchy

```
1. pb_entity_create → Create parent feature FIRST
2. pb_entity_create → Create subfeatures with parent: {id}
```

For detailed workflow examples, see `references/workflow-patterns.md`.

## Best Practices

### Do

- Run `pb_get_config` first to discover statuses and custom fields
- Use `pb_entity_search` for filtered queries
- Verify entity IDs before linking
- Create parent entities before children
- Handle pagination with `pageCursor`

### Don't

- Assume status name casing
- Create subfeatures without parent references
- Create features without checking if parent is required
- Use plain text descriptions (must be HTML: `<p>text</p>`)
- Use "initiative" entity type
- Expect `pageSize` parameter to work
- Use `pb_entity_list` when filters are needed
- Forget `archived: false` when searching
- Use `pb_set_relationship` to move features (use `pb_entity_update` with `parent`)

## Troubleshooting

**Query doesn't match patterns:** Start with `pb_entity_types` and `pb_get_config` to discover available options.

**Entity not found:** Verify ID with `pb_entity_search` first, check entity type, confirm permissions.

**Rate limiting:** Batch operations, use search filters, paginate properly.

## API Limitations

Some operations have known limitations. Key ones:

| Limitation | Workaround |
|------------|------------|
| Team filtering not supported | Filter client-side after fetch |
| Subfeature teams may not persist | Assign teams to parent feature |
| Name search is partial/case-insensitive | Add other filters to narrow results |
| `initiative` type not supported | Use `objective` instead |
| `pb_list_products` returns IDs only | Use `pb_entity_get` on each ID to get names |
| Features may require parent | Check with `pb_list_products` first |

For full details, see `references/limitations.md`.

## Additional Resources

### Reference Files

For detailed information, consult:
- **`references/tool-reference.md`** - Complete tool documentation with all parameters and examples
- **`references/common-mistakes.md`** - Detailed mistake explanations and solutions
- **`references/workflow-patterns.md`** - Full workflow examples with code
- **`references/limitations.md`** - Known API limitations and workarounds
