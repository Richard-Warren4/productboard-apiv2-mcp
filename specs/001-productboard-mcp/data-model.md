# Data Model: ProductBoard MCP Server

**Date**: 2025-12-14
**Status**: Complete (Updated for API v2 response structure)

## Overview

This document defines the TypeScript interfaces for entities used in the ProductBoard MCP Server. Types follow the ProductBoard API v2 field value system with distinct read (`FieldValue`) and write (`FieldAssign`) variants.

**Important**: ProductBoard API v2 nests entity fields under a `fields` object rather than at the root level. Relationships are also nested under a `relationships` object.

## Core Entities

### Feature

```typescript
/** Feature fields nested in API response */
interface FeatureFields {
  name: string;
  description?: string;              // Plain string in API v2
  status?: StatusFieldValue;
  owner?: MemberFieldValue;
  team?: TeamFieldValue;             // Single team (legacy)
  teams?: TeamFieldValue[];          // Array of teams (API v2 format)
  archived?: boolean;
}

/** Feature entity returned from ProductBoard API v2 (read) */
interface Feature {
  id: string;
  type: "feature";
  fields: FeatureFields;             // Fields are nested, not at root
  relationships?: {
    data: Array<{
      type: string;                  // "parent", "link", "child", etc.
      target: EntityReference;
    }>;
  };
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
  links: {
    self: string;
    html?: string;  // ProductBoard UI link - may not be present
  };
}

/** Input for creating a feature (write) */
interface CreateFeatureInput {
  name: string;
  description?: RichTextFieldAssign;
  status?: StatusFieldAssign;
  owner?: MemberFieldAssign;
  team?: TeamFieldAssign;
  parent?: EntityReferenceAssign;
  product?: EntityReferenceAssign;
}

/** Input for updating a feature (write) */
interface UpdateFeatureInput {
  name?: string;
  description?: RichTextFieldAssign;
  status?: StatusFieldAssign;
  owner?: MemberFieldAssign;
  team?: TeamFieldAssign;
}
```

### Subfeature

```typescript
/** Subfeature fields nested in API response */
interface SubfeatureFields {
  name: string;
  description?: string;
  status?: StatusFieldValue;
  owner?: MemberFieldValue;
  team?: TeamFieldValue;
  teams?: TeamFieldValue[];
  archived?: boolean;
}

/** Subfeature entity returned from ProductBoard API v2 (read) */
interface Subfeature {
  id: string;
  type: "subfeature";
  fields: SubfeatureFields;          // Fields are nested, not at root
  relationships?: {
    data: Array<{
      type: string;
      target: EntityReference;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  links: {
    self: string;
    html?: string;
  };
}

/** Input for creating a subfeature (write) */
interface CreateSubfeatureInput {
  name: string;
  parent: EntityReferenceAssign;  // Required: parent feature ID
  description?: RichTextFieldAssign;
  status?: StatusFieldAssign;
  owner?: MemberFieldAssign;
}

/** Input for updating a subfeature (write) */
interface UpdateSubfeatureInput {
  name?: string;
  description?: RichTextFieldAssign;
  status?: StatusFieldAssign;
  owner?: MemberFieldAssign;
}
```

### Component

```typescript
/** Component entity (read-only for this MCP scope) */
interface Component {
  id: string;
  type: "component";
  name: string;
  description?: RichTextFieldValue;
  product?: EntityReference;
  links: {
    self: string;
    html: string;
  };
}
```

### Product

```typescript
/** Product entity (read-only for this MCP scope) */
interface Product {
  id: string;
  type: "product";
  name: string;
  description?: RichTextFieldValue;
  links: {
    self: string;
    html: string;
  };
}
```

### Member

```typescript
/** Member entity representing a ProductBoard user */
interface Member {
  id: string;
  email: string;
  name: string;
}
```

### Team

```typescript
/** Team entity representing an organizational unit */
interface Team {
  id: string;
  name: string;
}
```

## Field Value Types (Read)

```typescript
/** Rich text content returned from API */
interface RichTextFieldValue {
  value: string;  // HTML string with allowed tags
}

/** Status field value */
interface StatusFieldValue {
  id: string;
  name: string;
}

/** Member field value (owner) */
interface MemberFieldValue {
  id: string;
  email: string;
  name?: string;
}

/** Team field value */
interface TeamFieldValue {
  id: string;
  name: string;
}

/** Reference to another entity */
interface EntityReference {
  id: string;
  type: EntityType;
  links?: {
    self: string;
  };
}

type EntityType =
  | "product"
  | "component"
  | "feature"
  | "subfeature"
  | "initiative"
  | "objective"
  | "keyResult"
  | "release"
  | "releaseGroup";
```

## Field Assign Types (Write)

```typescript
/** Rich text assignment (write) */
interface RichTextFieldAssign {
  value: string;  // HTML string - validated before submission
}

/** Status assignment - by ID or name */
type StatusFieldAssign =
  | { id: string }
  | { name: string };

/** Member assignment - by ID or email */
type MemberFieldAssign =
  | { id: string }
  | { email: string };

/** Team assignment - by ID or name */
type TeamFieldAssign =
  | { id: string }
  | { name: string };

/** Entity reference assignment */
interface EntityReferenceAssign {
  id: string;
}
```

## API Response Types

```typescript
/** Paginated list response */
interface PaginatedResponse<T> {
  data: T[];
  links: {
    next?: string;  // URL with cursor for next page
  };
}

/** Single entity response */
interface EntityResponse<T> {
  data: T;
}

/** Search response */
interface SearchResponse<T> {
  data: T[];
  totalCount: number;
  links: {
    next?: string;
  };
}

/** Error response from ProductBoard API */
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

## Configuration Types

```typescript
/** Entity configuration from discovery endpoint */
interface EntityConfiguration {
  type: EntityType;
  fields: FieldConfiguration[];
}

/** Field configuration */
interface FieldConfiguration {
  id: string;
  name: string;
  displayName: string;
  type: FieldType;
  required: boolean;
  readOnly: boolean;
  options?: FieldOption[];  // For select fields
}

type FieldType =
  | "text"
  | "richtext"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "status"
  | "member"
  | "team"
  | "singleSelect"
  | "multiSelect"
  | "entityReference";

/** Option for select fields */
interface FieldOption {
  id: string;
  name: string;
  color?: string;
}
```

## Relationship Types

```typescript
/** Relationship between entities */
interface Relationship {
  id: string;
  sourceEntity: EntityReference;
  targetEntity: EntityReference;
  relationshipType: RelationshipType;
}

type RelationshipType =
  | "parent"
  | "component"
  | "product"
  | "initiative"
  | "objective"
  | "release";

/** Input for creating a relationship */
interface CreateRelationshipInput {
  targetEntity: EntityReferenceAssign;
  relationshipType: RelationshipType;
}
```

## MCP Tool Input/Output Types

```typescript
/** Standard MCP tool result */
interface McpToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

/** Feature list tool input */
interface ListFeaturesInput {
  teamId?: string;
  teamName?: string;
  status?: string;
  componentId?: string;
  pageCursor?: string;
}

/** Feature detail tool input */
interface GetFeatureInput {
  featureId?: string;
  featureName?: string;
}

/** Search features tool input */
interface SearchFeaturesInput {
  query?: string;
  teamId?: string;
  teamName?: string;
  status?: string;
  componentId?: string;
  pageCursor?: string;
}
```

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| Feature | name | Required, non-empty string |
| Feature | description | Optional, valid HTML with allowed tags only |
| Feature | status | Must match workspace configuration |
| Subfeature | parent | Required, must be valid feature ID |
| Relationship | targetEntity | Must be valid entity ID of compatible type |

## State Transitions

Status values are workspace-specific and discovered via configuration endpoint. The MCP does not enforce state machine rules; ProductBoard API handles validation.

Common status patterns (example, varies by workspace):
- `New` → `In Progress` → `Done`
- `Backlog` → `Planned` → `In Development` → `Released`
