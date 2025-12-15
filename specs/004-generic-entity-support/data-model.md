# Data Model: Generic Entity Support

**Date**: 2025-12-15
**Feature**: 004-generic-entity-support

## Entity Types

### EntityType (Enumeration)

Valid entity types supported by ProductBoard API v2:

```typescript
type EntityType =
  | 'objective'
  | 'product'
  | 'component'
  | 'feature'
  | 'subfeature'
  | 'releaseGroup'
  | 'release'
  | 'company'
  | 'user';
```

**Constraints**:
- `user` is read-only (no create/update operations)
- 8 writable types, 9 total

### Entity (Core Model)

Represents any ProductBoard entity:

```typescript
interface Entity {
  id: string;                    // UUID, read-only
  type: EntityType;              // Entity type
  fields: EntityFields;          // Dynamic fields based on type
  relationships?: EntityRelationship[];
  createdAt: string;             // ISO 8601, read-only
  updatedAt: string;             // ISO 8601, read-only
  links: {
    self: string;                // API URL
    html?: string;               // ProductBoard UI URL
  };
}
```

**Validation Rules**:
- `id`: System-generated UUID
- `type`: Must be valid EntityType
- `fields.name`: Required for all entity types (except user)

### EntityFields (Dynamic)

Fields vary by entity type. Common fields:

| Field | Type | Applies To | Required | ReadOnly |
|-------|------|------------|----------|----------|
| name | TextFieldValue | All except user | Yes | No |
| description | RichTextFieldValue | All except user | No | No |
| owner | MemberFieldValue | Planning entities | No | No |
| archived | BooleanFieldValue | All except user | No | Yes |
| status | StatusFieldValue | objective, feature, subfeature | No | No |
| teams | TeamFieldValue[] | Planning entities | No | Varies |
| parent | EntityReference | component, feature, subfeature, release | Varies | No |
| timeframe | TimeframeFieldValue | objective | No | No |
| health | HealthFieldValue | Planning entities | No | Yes |

### EntityConfiguration (Metadata)

Configuration for a single entity type:

```typescript
interface EntityConfiguration {
  type: EntityType;
  fields: Record<string, FieldConfig>;  // Keyed by field ID
}

interface FieldConfig {
  id: string;           // API field name (lowercase)
  name: string;         // Display name (title case)
  type: FieldType;      // text, richtext, number, member, status, etc.
  required: boolean;
  readOnly: boolean;
  options?: SelectOption[];  // For status, single/multi-select fields
}

interface SelectOption {
  id: string;
  name: string;
}
```

**Constraints**:
- Field IDs are lowercase (e.g., `teams`, `owner`)
- Display names are title case (e.g., "Teams", "Owner")
- Options array present for select-type fields

### EntityReference

Reference to another entity:

```typescript
interface EntityReference {
  id: string;      // Entity UUID
  type?: EntityType;  // Optional type hint
}
```

Used for:
- Parent relationships
- Team assignments
- Owner assignments (uses `email` instead of `id`)

### OwnerReference

Special reference for owner field:

```typescript
interface OwnerReference {
  id?: string;     // User UUID
  email?: string;  // User email (alternative identifier)
}
```

**Validation**: At least one of `id` or `email` must be provided.

### RichtextValue

HTML content for description fields:

```typescript
interface RichtextValue {
  value: string;  // HTML content
}
```

**Validation Rules**:
- Allowed tags: `<b>`, `<i>`, `<s>`, `<u>`, `<br>`, `<a>`, `<code>`, `<img>`, `<p>`
- `<strong>` must be converted to `<b>` (or rejected with suggestion)
- `<em>` must be converted to `<i>` (or rejected with suggestion)
- All tags must be properly closed

### ValidationResult

Result of field validation:

```typescript
interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  sanitizedFields: Record<string, unknown>;  // Fields with read-only removed
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

interface ValidationError {
  field: string;
  message: string;
}
```

**State Transitions**: None - entities don't have formal state machines in this feature.

## Relationships

### Parent-Child Hierarchy

```
product
  └── component
        └── feature
              └── subfeature

releaseGroup
  └── release
```

**Constraints**:
- `component` requires `product` parent
- `subfeature` requires `feature` parent
- `release` requires `releaseGroup` parent
- `feature` parent requirement varies by workspace

### Entity Configuration Cache

```
MCP Server Instance
  └── ConfigurationCache (in-memory)
        ├── lastFetched: Date
        └── configurations: Map<EntityType, EntityConfiguration>
```

**Lifecycle**:
1. Empty on server start
2. Populated on first entity operation
3. Cleared via `pb_refresh_config` tool
4. Lost on server restart

## Field Type Mappings

### Read Types (API Response)

| FieldType | TypeScript | Example |
|-----------|------------|---------|
| text | string | "Feature name" |
| richtext | { value: string } | { value: "<p>Description</p>" } |
| number | number | 42 |
| boolean | boolean | true |
| date | string (ISO) | "2025-01-15" |
| datetime | string (ISO) | "2025-01-15T10:30:00Z" |
| status | { id: string, name: string } | { id: "abc", name: "In Progress" } |
| member | { id: string, email: string } | { id: "xyz", email: "user@example.com" } |
| team | { id: string, name: string }[] | [{ id: "t1", name: "Platform" }] |
| singleSelect | { id: string, name: string } | { id: "opt1", name: "High" } |
| multiSelect | { id: string, name: string }[] | [{ id: "opt1", name: "Tag1" }] |

### Write Types (API Request)

| FieldType | TypeScript | Example |
|-----------|------------|---------|
| text | string | "New name" |
| richtext | { value: string } | { value: "<p>New description</p>" } |
| number | number | 100 |
| boolean | boolean | false |
| status | { id?: string, name?: string } | { name: "Done" } |
| member | { id?: string, email?: string } | { email: "user@example.com" } |
| team | { id: string }[] | [{ id: "team-uuid" }] |
| parent | { id: string } | { id: "parent-uuid" } |
