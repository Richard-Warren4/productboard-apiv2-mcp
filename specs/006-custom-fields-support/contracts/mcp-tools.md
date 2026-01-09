# MCP Tool Contracts: Custom Fields Support

**Feature**: 006-custom-fields-support
**Date**: 2025-01-09

## Tool Changes Overview

| Tool | Change Type | Description |
|------|-------------|-------------|
| `pb_entity_list` | Response enhancement | Add `customFields` to each entity |
| `pb_entity_search` | Response + Input enhancement | Add `customFields` to response, add `customFieldFilters` input |
| `pb_entity_get` | Response enhancement | Add `customFields` to entity |
| `pb_get_config` | No changes | Already returns custom field definitions |

---

## pb_entity_list

### Input Schema (unchanged)

```typescript
{
  entityType: "feature" | "subfeature" | "objective" | ...,
  pageCursor?: string
}
```

### Output Schema (enhanced)

```typescript
{
  entityType: string,
  entities: Array<{
    id: string,
    type: string,
    name: string,
    status: string,
    owner: string,
    archived: boolean,
    customFields: Record<string, CustomFieldValue>  // NEW
  }>,
  totalReturned: number,
  nextCursor: string | null,
  hasMoreResults: boolean
}
```

### Example Response

```json
{
  "entityType": "feature",
  "entities": [
    {
      "id": "7906db79-dec4-4fb5-b964-ae171ec5276d",
      "type": "feature",
      "name": "Dark Mode Support",
      "status": "In progress",
      "owner": "richard.warren@hivenet.com",
      "archived": false,
      "customFields": {
        "Reach": 80,
        "Impact": 70,
        "Confidence": 90,
        "Launch Ready": { "id": "2ed5af62-...", "name": "Launched", "color": "green" }
      }
    }
  ],
  "totalReturned": 1,
  "nextCursor": null,
  "hasMoreResults": false
}
```

---

## pb_entity_search

### Input Schema (enhanced)

```typescript
{
  entityType: "feature" | "subfeature" | "objective",
  name?: string,
  statuses?: Array<{ name?: string, id?: string }>,
  owners?: Array<{ email?: string, id?: string }>,
  parent?: { id: string },
  archived?: boolean,
  ids?: string[],
  pageCursor?: string,

  // NEW: Custom field filters (client-side)
  customFieldFilters?: Array<{
    field: string,           // Field name (not UUID)
    operator: "=" | "!=" | "<" | "<=" | ">" | ">=",
    value: number | string | boolean
  }>
}
```

### Input Validation

- `field` must exist in workspace configuration (case-insensitive match)
- Numeric operators (`<`, `<=`, `>`, `>=`) only valid for number fields
- Error if field not found: `"Field 'X' not found. Did you mean 'Y'?"`
- Error if invalid operator: `"Operator '>=' not valid for select field 'X'. Use '=' or '!='"`

### Output Schema (enhanced)

```typescript
{
  entityType: string,
  entities: Array<{
    id: string,
    type: string,
    name: string,
    status: string,
    owner: string,
    archived: boolean,
    customFields: Record<string, CustomFieldValue>  // NEW
  }>,
  totalReturned: number,
  nextCursor: string | null,
  hasMoreResults: boolean,
  appliedFilters?: {
    // Existing filters
    name?: string,
    statuses?: Array<{ name?: string }>,
    // ...

    // NEW
    customFieldFilters?: Array<{
      field: string,
      operator: string,
      value: number | string | boolean
    }>
  },

  // NEW: Filtering metadata
  filteringInfo?: {
    totalBeforeFiltering: number,   // Total from API before client-side filter
    totalAfterFiltering: number,    // After custom field filter applied
    pagesFetched: number            // Number of API pages fetched
  }
}
```

### Example Request

```json
{
  "entityType": "feature",
  "statuses": [{ "name": "In progress" }],
  "customFieldFilters": [
    { "field": "Reach", "operator": ">=", "value": 50 },
    { "field": "Impact", "operator": ">=", "value": 70 }
  ]
}
```

### Example Response

```json
{
  "entityType": "feature",
  "entities": [
    {
      "id": "abc123",
      "name": "High Priority Feature",
      "status": "In progress",
      "owner": "pm@example.com",
      "archived": false,
      "customFields": {
        "Reach": 80,
        "Impact": 90,
        "Confidence": 70
      }
    }
  ],
  "totalReturned": 1,
  "nextCursor": null,
  "hasMoreResults": false,
  "appliedFilters": {
    "statuses": [{ "name": "In progress" }],
    "customFieldFilters": [
      { "field": "Reach", "operator": ">=", "value": 50 },
      { "field": "Impact", "operator": ">=", "value": 70 }
    ]
  },
  "filteringInfo": {
    "totalBeforeFiltering": 45,
    "totalAfterFiltering": 1,
    "pagesFetched": 1
  }
}
```

---

## pb_entity_get

### Input Schema (unchanged)

```typescript
{
  id: string
}
```

### Output Schema (enhanced)

```typescript
{
  entity: {
    id: string,
    type: string,
    name: string,
    description?: string,
    status?: string,
    owner?: string,
    teams?: string,
    archived?: boolean,
    createdAt: string,
    updatedAt: string,
    productboardUrl: string,
    customFields: Record<string, CustomFieldValue>,  // NEW
    // ... other fields
  },
  relationships: Record<string, Array<{ id: string, type: string }>>,
  summary: {
    totalRelationships: number,
    types: string[]
  }
}
```

### Example Response

```json
{
  "entity": {
    "id": "7906db79-dec4-4fb5-b964-ae171ec5276d",
    "type": "feature",
    "name": "Dark Mode Support",
    "description": "Add dark mode theme option",
    "status": "In progress",
    "owner": "richard.warren@hivenet.com",
    "archived": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2025-01-09T14:22:00Z",
    "productboardUrl": "https://app.productboard.com/feature-board/id/7906db79-...",
    "customFields": {
      "Reach": 80,
      "Impact": 70,
      "Confidence": 90,
      "Effort": 30,
      "Revenue Driver": 50,
      "Strategic Multiplier": 1.5,
      "Launch Ready": { "id": "2ed5af62-...", "name": "Launched", "color": "green" },
      "Tags": [
        { "id": "02ef336d-...", "name": "iOS" },
        { "id": "534176e8-...", "name": "Android" }
      ],
      "Designer": { "id": "f965bfef-...", "email": "designer@hivenet.com" }
    }
  },
  "relationships": {
    "parent": [{ "id": "parent-uuid", "type": "component" }],
    "child": [{ "id": "child-uuid", "type": "subfeature" }]
  },
  "summary": {
    "totalRelationships": 2,
    "types": ["parent", "child"]
  }
}
```

---

## Type Definitions

### CustomFieldValue

```typescript
type CustomFieldValue =
  | number                               // NumberFieldValue
  | string                               // TextFieldValue
  | boolean                              // BooleanFieldValue
  | { id: string; name: string; color?: string }  // SingleSelectFieldValue
  | Array<{ id: string; name: string }>  // MultiSelectFieldValue
  | { id: string; email?: string; name?: string } // MemberFieldValue
  | null;                                // Empty/unset
```

### CustomFieldFilter

```typescript
interface CustomFieldFilter {
  field: string;
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=';
  value: number | string | boolean;
}
```

---

## Error Responses

### Invalid Field Name

```json
{
  "error": {
    "code": "INVALID_CUSTOM_FIELD",
    "message": "Custom field 'Rach' not found",
    "suggestion": "Did you mean 'Reach'? Available custom fields: Reach, Impact, Confidence, Effort, ...",
    "availableFields": ["Reach", "Impact", "Confidence", "Effort", "Revenue Driver", "Strategic Multiplier"]
  }
}
```

### Invalid Operator for Field Type

```json
{
  "error": {
    "code": "INVALID_FILTER_OPERATOR",
    "message": "Operator '>=' not valid for select field 'Launch Ready'",
    "suggestion": "Use '=' or '!=' for select fields",
    "fieldType": "single_select",
    "validOperators": ["=", "!="]
  }
}
```

### Type Mismatch

```json
{
  "error": {
    "code": "FILTER_TYPE_MISMATCH",
    "message": "Filter value must be a number for field 'Reach'",
    "fieldType": "number",
    "providedValue": "high",
    "providedType": "string"
  }
}
```
