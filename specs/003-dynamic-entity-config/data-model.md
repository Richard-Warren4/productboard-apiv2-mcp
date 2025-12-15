# Data Model: Dynamic Entity Configuration Discovery

**Feature**: 003-dynamic-entity-config
**Date**: 2025-12-14

## Overview

This document defines the data structures for entity configuration discovery and validation. All types are TypeScript interfaces to be added to `src/client/types.ts`.

---

## Entity Configuration Types

### EntityConfiguration

Represents the configuration for a single entity type (feature or subfeature).

```typescript
/** Configuration metadata for an entity type */
interface EntityConfiguration {
  /** Entity type identifier (e.g., 'feature', 'subfeature') */
  type: string;

  /** Available fields for this entity type */
  fields: FieldDefinition[];

  /** Supported lifecycle operations */
  lifecycle?: {
    create?: LifecycleOperation;
    update?: LifecycleOperation;
    delete?: LifecycleOperation;
  };
}
```

### FieldDefinition

Represents a single field's configuration.

```typescript
/** Definition of a configurable field */
interface FieldDefinition {
  /** Internal field identifier */
  id: string;

  /** API field name (used in requests) */
  name: string;

  /** Human-readable display name */
  displayName: string;

  /** Field value type */
  type: FieldType;

  /** Whether field is required for creation */
  required: boolean;

  /** Whether field is read-only (cannot be set) */
  readOnly: boolean;

  /** Available options for select-type fields */
  options?: FieldOption[];

  /** Validation constraints */
  validation?: FieldValidation;
}
```

### FieldType

Enumeration of known field types.

```typescript
/** Known field value types */
type FieldType =
  | 'text'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'status'
  | 'member'
  | 'team'
  | 'single_select'
  | 'multi_select'
  | 'health'
  | 'progress'
  | 'timeframe'
  | 'unknown'; // For forward compatibility
```

### FieldOption

Represents an option for select-type fields.

```typescript
/** Option for select-type fields */
interface FieldOption {
  /** Option identifier */
  id: string;

  /** Option display name */
  name: string;

  /** Optional color code (for status fields) */
  color?: string;
}
```

### FieldValidation

Validation constraints for a field.

```typescript
/** Validation rules for a field */
interface FieldValidation {
  /** Maximum length for text fields */
  maxLength?: number;

  /** Minimum value for number fields */
  minValue?: number;

  /** Maximum value for number fields */
  maxValue?: number;

  /** Regex pattern for text fields */
  pattern?: string;
}
```

### LifecycleOperation

Configuration for a lifecycle operation.

```typescript
/** Lifecycle operation configuration */
interface LifecycleOperation {
  /** Fields that can be set during this operation */
  settableFields: string[];

  /** Fields that are required for this operation */
  requiredFields: string[];
}
```

---

## Validation Types

### ValidationResult

Result of validating fields against configuration.

```typescript
/** Result of field validation */
interface ValidationResult {
  /** Whether all validations passed (no warnings) */
  valid: boolean;

  /** List of validation warnings */
  warnings: ValidationWarning[];
}
```

### ValidationWarning

A single validation warning.

```typescript
/** A validation warning (non-blocking) */
interface ValidationWarning {
  /** Field that triggered the warning */
  field: string;

  /** Type of validation issue */
  issue: ValidationIssue;

  /** Human-readable warning message */
  message: string;

  /** Suggested fix or available options */
  suggestion?: string;
}

/** Types of validation issues */
type ValidationIssue =
  | 'missing_required'   // Required field not provided
  | 'invalid_value'      // Value doesn't match options
  | 'type_mismatch'      // Value type doesn't match field type
  | 'constraint_violation'; // Value violates validation constraint
```

---

## Cache Types

### ConfigCache

Session-scoped configuration cache.

```typescript
/** Session cache for configuration data */
interface ConfigCache {
  /** Cached configurations by entity type */
  configs: Map<string, EntityConfiguration[]>;

  /** Track if initial fetch has been done */
  initialized: boolean;
}
```

---

## API Response Mapping

### ProductBoard API Response → Internal Types

The ProductBoard API returns configuration in this format:

```typescript
// API Response (from getEntityConfiguration)
interface ApiConfigResponse {
  data: Array<{
    type: string;
    fields: Array<{
      id: string;
      name: string;
      displayName: string;
      type: string;
      required: boolean;
      readOnly: boolean;
      options?: Array<{ id: string; name: string }>;
    }>;
  }>;
}
```

Mapping to internal types:

| API Field | Internal Type | Notes |
|-----------|---------------|-------|
| `data[].type` | `EntityConfiguration.type` | Direct mapping |
| `data[].fields` | `EntityConfiguration.fields` | Map each to FieldDefinition |
| `fields[].type` | `FieldDefinition.type` | Map string to FieldType enum |
| `fields[].options` | `FieldDefinition.options` | Direct mapping |

---

## Relationships

```
EntityConfiguration (1) ─────────── (*) FieldDefinition
                                          │
                                          ├── (*) FieldOption (for select types)
                                          │
                                          └── (0..1) FieldValidation

ValidationResult (1) ─────────── (*) ValidationWarning
```

---

## State Transitions

### Configuration Cache States

```
[Empty] ──fetch──> [Loaded] ──error──> [Failed]
   │                  │                    │
   │                  │<──────retry────────┘
   │                  │
   └──────────────────┴──────server restart──> [Empty]
```

### Validation Flow

```
[Input Received]
      │
      ▼
[Get Config from Cache]
      │
      ├─(config exists)──> [Validate Against Config] ──> [Return Warnings]
      │
      └─(no config)──────> [Skip Validation] ──> [Return Empty Warnings]
```

---

## Notes

- All types use strict TypeScript (no `any`)
- FieldType includes `'unknown'` for forward compatibility with new API types
- ValidationWarning is advisory; does not block operations
- Cache has no TTL; cleared only on server restart (per clarification)
