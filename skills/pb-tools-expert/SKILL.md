---
name: pb-tools-expert
description: This skill should be used when the user asks to "find features in ProductBoard", "create a feature", "search ProductBoard", "link feature to objective", "get ProductBoard relationships", or mentions ProductBoard entities, features, objectives, subfeatures, or MCP tools like pb_entity_search or pb_get_relationships.
---

# ProductBoard MCP Tools

## Quick Reference

| Task | Tool | Example |
|------|------|---------|
| Find by name/status | `pb_entity_search` | `{entityType: "feature", name: "auth", statuses: [{name: "In progress"}]}` |
| Get entity details | `pb_entity_get` | `{id: "uuid"}` |
| Create entity | `pb_entity_create` | `{entityType: "feature", fields: {name: "...", parent: {id: "..."}}}` |
| Update entity | `pb_entity_update` | `{id: "uuid", fields: {status: {name: "Planned"}}}` |
| Link to objective | `pb_create_relationship` | `{entityId: "...", relationshipType: "link", targetId: "..."}` |
| View relationships | `pb_get_relationships` | `{featureId: "uuid"}` |
| Discover config | `pb_get_config` | `{entityType: "feature"}` |

## Essential Rules

**Always do first:** Run `pb_get_config` to discover exact status names (case-sensitive).

**Entity types:** `product`, `component`, `feature`, `subfeature`, `initiative`, `objective`, `keyResult`, `release`, `releaseGroup`
- `keyResult` may require higher licence tier
- `company` and `user` use separate endpoints

**Parent requirements:**
- Subfeatures MUST have `parent: {id: "feature-uuid"}`
- Features often require `parent: {id: "product-or-component-uuid"}` (workspace-dependent)

**Search defaults:** Returns archived items. Add `archived: false` to filter.

**Pagination:** Fixed 100 items/page. Use `pageCursor` for more.

## Field Formats

**Custom fields** — Use display names (auto-translated to UUIDs):
```
{fields: {"Reach": 500, "Impact": 3}}
```

**Teams** — Flexible formats accepted:
```
{teams: "Team Name"}           // string
{teams: ["Team A", "Team B"]}  // array of strings
{teams: [{name: "Team A"}]}    // array of objects
```

**Timeframe** — Set planning periods:
```
{timeframe: {startDate: "2026-04-01", endDate: "2026-06-30", granularity: "quarter"}}
```
Granularity: `day` | `month` | `quarter` | `year`

**Description** — HTML required (plain text auto-wrapped in `<p>`):
```
{description: "<p>Your description</p>"}
```
Supported tags: `h1`, `h2`, `p`, `b`, `i`, `u`, `s`, `code`, `pre`, `blockquote`, `ul`, `ol`, `li`, `a`, `hr`, `br`

## Common Workflows

**Find and update:**
1. `pb_entity_search` → find by criteria
2. `pb_entity_get` → get full details
3. `pb_entity_update` → make changes

**Create with relationship:**
1. `pb_entity_create` → create feature (with parent)
2. `pb_create_relationship` → link to objective

**Create hierarchy:**
1. `pb_entity_create` → parent feature first
2. `pb_entity_create` → subfeatures with `parent: {id}`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Status not found | Check exact casing with `pb_get_config` |
| Feature creation fails | May need parent - use `pb_list_products` to find one |
| Entity not found | Verify ID with `pb_entity_search` |
| Teams not persisting on subfeature | Assign to parent feature instead |

## References (load when needed)

- `references/tool-reference.md` — Full tool documentation with all parameters
- `references/common-mistakes.md` — Detailed mistake explanations
- `references/workflow-patterns.md` — Extended workflow examples
- `references/limitations.md` — API limitations and workarounds
