# Quickstart: Custom Fields Support

**Feature**: 006-custom-fields-support
**Date**: 2025-01-09

## What This Feature Does

Transforms UUID-keyed custom field values in ProductBoard responses into human-readable format, and adds client-side filtering capability for custom fields.

**Before** (current):
```json
{
  "name": "Feature X",
  "d4ea8854-c960-458a-bf5d-05fda4b22a24": 80,
  "04e8c2b7-2105-402f-aece-c6ce90d6f336": 70
}
```

**After** (with this feature):
```json
{
  "name": "Feature X",
  "customFields": {
    "Reach": 80,
    "Impact": 70
  }
}
```

---

## Usage Examples

### View Custom Fields in Feature List

```
pb_entity_list({ entityType: "feature" })
```

Response includes `customFields` for each feature:
```json
{
  "entities": [
    {
      "id": "abc123",
      "name": "Dark Mode",
      "status": "In progress",
      "customFields": {
        "Reach": 80,
        "Impact": 70,
        "Confidence": 90,
        "Effort": 30
      }
    }
  ]
}
```

### Filter Features by DRICE Scores

Find features with high Reach AND Impact:
```
pb_entity_search({
  entityType: "feature",
  customFieldFilters: [
    { field: "Reach", operator: ">=", value: 50 },
    { field: "Impact", operator: ">=", value: 70 }
  ]
})
```

### Combine Standard and Custom Filters

Find in-progress features with high priority scores:
```
pb_entity_search({
  entityType: "feature",
  statuses: [{ name: "In progress" }],
  customFieldFilters: [
    { field: "Reach", operator: ">=", value: 60 },
    { field: "Confidence", operator: ">=", value: 70 }
  ]
})
```

### Filter by Select Field Values

Find features marked as "Launched":
```
pb_entity_search({
  entityType: "feature",
  customFieldFilters: [
    { field: "Launch Ready", operator: "=", value: "Launched" }
  ]
})
```

### Get Single Feature with All Custom Fields

```
pb_entity_get({ id: "feature-uuid" })
```

Response includes all custom field values:
```json
{
  "entity": {
    "id": "abc123",
    "name": "Dark Mode",
    "customFields": {
      "Reach": 80,
      "Impact": 70,
      "Confidence": 90,
      "Effort": 30,
      "Revenue Driver": 50,
      "Strategic Multiplier": 1.5,
      "Launch Ready": { "id": "...", "name": "Launched", "color": "green" },
      "Tags": [{ "id": "...", "name": "iOS" }, { "id": "...", "name": "Android" }]
    }
  }
}
```

---

## Available Filter Operators

| Operator | Field Types | Example |
|----------|-------------|---------|
| `=` | All | `{ field: "Reach", operator: "=", value: 100 }` |
| `!=` | All | `{ field: "Status", operator: "!=", value: "Done" }` |
| `<` | Number only | `{ field: "Effort", operator: "<", value: 50 }` |
| `<=` | Number only | `{ field: "Effort", operator: "<=", value: 50 }` |
| `>` | Number only | `{ field: "Impact", operator: ">", value: 70 }` |
| `>=` | Number only | `{ field: "Reach", operator: ">=", value: 80 }` |

---

## Common DRICE Filter Patterns

### High Priority Features (High Reach + Impact)
```
customFieldFilters: [
  { field: "Reach", operator: ">=", value: 70 },
  { field: "Impact", operator: ">=", value: 70 }
]
```

### Quick Wins (High Impact, Low Effort)
```
customFieldFilters: [
  { field: "Impact", operator: ">=", value: 70 },
  { field: "Effort", operator: "<=", value: 30 }
]
```

### High Confidence Bets
```
customFieldFilters: [
  { field: "Confidence", operator: ">=", value: 80 }
]
```

### Revenue Drivers
```
customFieldFilters: [
  { field: "Revenue Driver", operator: ">=", value: 60 }
]
```

---

## Notes

1. **Field names are case-insensitive** when filtering: "reach" matches "Reach"
2. **Multiple filters use AND logic**: All conditions must match
3. **Filtering fetches all API pages first**: May be slower for large datasets
4. **Select field values match by name**: Use the option name, not ID
5. **Empty custom fields**: Shown as `null` or omitted from response
