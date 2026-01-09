# Data Model: Custom Fields Support

**Feature**: 006-custom-fields-support
**Date**: 2025-01-09

## Entities

### CustomFieldConfig

Configuration metadata for a single custom field from ProductBoard API.

```typescript
interface CustomFieldConfig {
  id: string;           // UUID (e.g., "d4ea8854-c960-458a-bf5d-05fda4b22a24")
  name: string;         // Display name (e.g., "Reach")
  type: CustomFieldType;
  options?: SelectOption[];  // For single_select/multi_select only
}

type CustomFieldType =
  | 'number'
  | 'text'
  | 'richtext'
  | 'single_select'
  | 'multi_select'
  | 'member'
  | 'boolean'
  | 'date'
  | 'datetime';

interface SelectOption {
  id: string;
  name: string;
  color?: string;
}
```

**Source**: Derived from ProductBoard `/entities/configuration` endpoint response.

**Validation**:
- `id` must be valid UUID format
- `name` must be non-empty string
- `type` must be one of supported CustomFieldType values

---

### CustomFieldMapping

In-memory mapping from UUID to field name for transformation.

```typescript
interface CustomFieldMapping {
  byId: Map<string, CustomFieldConfig>;   // UUID → config
  byName: Map<string, CustomFieldConfig>; // Name → config (for filtering)
}
```

**Lifecycle**:
- Built on first entity list/search/get call
- Cached for entire session via existing `getSessionCached()`
- Refreshed via `pb_refresh_config` tool

---

### CustomFieldValue

A custom field value as it appears in transformed entity responses.

```typescript
type CustomFieldValue =
  | number                           // For number fields
  | string                           // For text fields
  | boolean                          // For boolean fields
  | SelectFieldValue                 // For single_select fields
  | SelectFieldValue[]               // For multi_select fields
  | MemberFieldValue                 // For member fields
  | null;                            // Empty/unset fields

interface SelectFieldValue {
  id: string;
  name: string;
  color?: string;
}

interface MemberFieldValue {
  id: string;
  email?: string;
  name?: string;
}
```

---

### TransformedEntity

Entity with custom fields transformed to human-readable format.

```typescript
interface TransformedEntity {
  id: string;
  type: string;
  name: string;
  status?: string;
  owner?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
  productboardUrl: string;
  customFields: Record<string, CustomFieldValue>;  // NEW
  // ... other standard fields
}
```

**Example Output**:
```json
{
  "id": "7906db79-dec4-4fb5-b964-ae171ec5276d",
  "type": "feature",
  "name": "Dark Mode Support",
  "status": "In progress",
  "owner": "richard.warren@hivenet.com",
  "customFields": {
    "Reach": 80,
    "Impact": 70,
    "Confidence": 90,
    "Effort": 30,
    "Launch Ready": { "id": "2ed5af62-...", "name": "Launched", "color": "green" },
    "Tags": [
      { "id": "02ef336d-...", "name": "iOS" },
      { "id": "534176e8-...", "name": "Android" }
    ]
  }
}
```

---

### CustomFieldFilter

Filter specification for client-side custom field filtering.

```typescript
interface CustomFieldFilter {
  field: string;                    // Field name (not UUID)
  operator: FilterOperator;
  value: FilterValue;
}

type FilterOperator =
  | '='    // Equals (all types)
  | '!='   // Not equals (all types)
  | '<'    // Less than (numeric only)
  | '<='   // Less than or equal (numeric only)
  | '>'    // Greater than (numeric only)
  | '>='   // Greater than or equal (numeric only)

type FilterValue = number | string | boolean;
```

**Validation Rules**:
| Field Type | Allowed Operators | Value Type |
|------------|-------------------|------------|
| number | `=`, `!=`, `<`, `<=`, `>`, `>=` | number |
| single_select | `=`, `!=` | string (option name) |
| multi_select | `=`, `!=` | string (option name - matches if any) |
| text | `=`, `!=` | string |
| boolean | `=`, `!=` | boolean |

---

## Relationships

```
CustomFieldConfig ─────── 1:N ───────> SelectOption
      │                                    (for select types only)
      │
      └── cached in ──> CustomFieldMapping
                              │
                              │
                              v
            EntityResponse ──uses──> customFields transformation
                              │
                              │
                              v
            CustomFieldFilter ──validates against──> CustomFieldMapping
```

---

## State Transitions

### Configuration Cache State

```
┌─────────────┐    First entity    ┌─────────────┐
│   Empty     │ ───operation────> │   Cached    │
└─────────────┘                    └─────────────┘
                                         │
                     pb_refresh_config   │
                ┌────────────────────────┘
                │
                v
┌─────────────┐    Re-fetch config  ┌─────────────┐
│   Cleared   │ ─────────────────> │   Cached    │
└─────────────┘                     └─────────────┘
```

### Filter Application Flow

```
pb_entity_search(customFieldFilters)
         │
         v
┌──────────────────┐
│ Validate filters │──invalid──> Return error
│ against config   │
└────────┬─────────┘
         │ valid
         v
┌──────────────────┐
│ Fetch all pages  │
│ from API         │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Transform custom │
│ fields (UUID→name│
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Apply client-side│
│ filters          │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Return filtered  │
│ results          │
└──────────────────┘
```

---

## Storage

No persistent storage required. All data is:
1. **Custom field config**: Fetched from ProductBoard API, cached in memory for session
2. **Custom field mapping**: Built from config, stored in session cache
3. **Filter state**: Stateless, applied per-request

Existing `sessionCache` Map in `config.ts` is sufficient.
