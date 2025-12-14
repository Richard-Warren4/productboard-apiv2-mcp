# MCP Tool Contracts: ProductBoard MCP Server

**Date**: 2025-12-14
**Status**: Complete (Updated for API v2 response structure)

## Overview

This document defines the MCP tools exposed by the ProductBoard MCP Server. Each tool maps to one or more ProductBoard API v2 operations.

## Naming Convention

All tools use the `pb_` prefix to indicate ProductBoard operations:
- `pb_<action>_<entity>` for single-entity operations
- `pb_<action>_<entity>_<modifier>` for specialized operations

---

## Feature Tools

### pb_list_features

List features with optional filtering by team, status, or component.

**Inputs**:
```json
{
  "teamId": { "type": "string", "optional": true, "description": "Filter by team ID" },
  "teamName": { "type": "string", "optional": true, "description": "Filter by team name" },
  "status": { "type": "string", "optional": true, "description": "Filter by status name" },
  "componentId": { "type": "string", "optional": true, "description": "Filter by component ID" },
  "pageCursor": { "type": "string", "optional": true, "description": "Cursor for pagination" }
}
```

**Output**: JSON array of features with pagination info
```json
{
  "features": [
    {
      "id": "b39760ba-7e30-4844-a871-ee2d9a7f2904",
      "name": "Offline access to files and folders",
      "status": "In progress",
      "team": "H4C Desktop, H4C Mobile",
      "owner": "richard.warren@hivenet.com",
      "archived": false
    }
  ],
  "totalReturned": 100,
  "nextCursor": "d_sJLYI2SICc...",
  "hasMoreResults": true,
  "appliedFilters": { "teamName": "H4C Desktop" }
}
```

**Errors**:
- Invalid team/status: Lists available options
- Rate limited: Includes retry timing

---

### pb_get_feature

Get detailed information about a specific feature.

**Inputs**:
```json
{
  "featureId": { "type": "string", "optional": true, "description": "Feature ID (UUID)" },
  "featureName": { "type": "string", "optional": true, "description": "Feature name (exact match)" }
}
```
*Note*: At least one of `featureId` or `featureName` required.

**Output**: Full feature details
```json
{
  "id": "b39760ba-7e30-4844-a871-ee2d9a7f2904",
  "name": "Offline access to files and folders",
  "status": "In progress",
  "team": "Unassigned",
  "owner": "richard.warren@hivenet.com",
  "description": "<p>Feature description with <b>HTML</b> formatting</p>",
  "archived": true,
  "parent": "58bf31dc-be3a-48a2-b370-e73bb7b97e32",
  "createdAt": "2023-04-13T10:49:52.163776Z",
  "updatedAt": "2025-08-02T08:22:35.420293Z",
  "productboardUrl": "https://api.productboard.com/v2/entities/b39760ba-7e30-4844-a871-ee2d9a7f2904",
  "relationships": {
    "product": null,
    "component": null,
    "parent": null,
    "children": []
  }
}
```

**Notes**:
- `team` is a comma-separated string if multiple teams are assigned
- `owner` shows email (name may not always be available)
- `parent` is the ID of the parent component/feature from relationships
- `archived` indicates if the feature has been archived in ProductBoard

**Errors**:
- Feature not found: Clear message with search suggestions

---

### pb_create_feature

Create a new feature in ProductBoard.

**Inputs**:
```json
{
  "name": { "type": "string", "required": true, "description": "Feature name" },
  "description": { "type": "string", "optional": true, "description": "Feature description (HTML)" },
  "teamId": { "type": "string", "optional": true, "description": "Team ID to assign" },
  "teamName": { "type": "string", "optional": true, "description": "Team name to assign" },
  "status": { "type": "string", "optional": true, "description": "Initial status name" },
  "componentId": { "type": "string", "optional": true, "description": "Component to assign" },
  "productId": { "type": "string", "optional": true, "description": "Product to assign" }
}
```

**Output**: Created feature details
```json
{
  "id": "...",
  "name": "...",
  "status": "...",
  "team": "...",
  "owner": "...",
  "productboardUrl": "...",
  "message": "Feature created successfully"
}
```

**Errors**:
- Invalid richtext: Lists invalid tags found
- Invalid team/status: Lists available options
- Missing required fields: Specifies which fields

---

### pb_update_feature

Update properties of an existing feature.

**Inputs**:
```json
{
  "featureId": { "type": "string", "required": true, "description": "Feature ID to update" },
  "name": { "type": "string", "optional": true, "description": "New name" },
  "description": { "type": "string", "optional": true, "description": "New description (HTML)" },
  "status": { "type": "string", "optional": true, "description": "New status name" },
  "teamId": { "type": "string", "optional": true, "description": "New team ID" },
  "teamName": { "type": "string", "optional": true, "description": "New team name" },
  "ownerId": { "type": "string", "optional": true, "description": "New owner ID" },
  "ownerEmail": { "type": "string", "optional": true, "description": "New owner email" }
}
```

**Output**: Updated feature details
```json
{
  "id": "...",
  "name": "...",
  "status": "...",
  "team": "...",
  "owner": "...",
  "updatedFields": ["status", "team"],
  "message": "Feature updated successfully"
}
```

**Errors**:
- Feature not found
- Invalid field values with available options

---

### pb_search_features

Search features by name and filter criteria.

**Inputs**:
```json
{
  "query": { "type": "string", "optional": true, "description": "Search query (name contains)" },
  "teamId": { "type": "string", "optional": true, "description": "Filter by team ID" },
  "teamName": { "type": "string", "optional": true, "description": "Filter by team name" },
  "status": { "type": "string", "optional": true, "description": "Filter by status" },
  "componentId": { "type": "string", "optional": true, "description": "Filter by component" },
  "pageCursor": { "type": "string", "optional": true, "description": "Cursor for pagination" }
}
```

**Output**: Search results
```json
{
  "features": [...],
  "totalCount": 42,
  "nextCursor": "..." | null,
  "query": "...",
  "filters": { "team": "...", "status": "..." }
}
```

---

## Subfeature Tools

### pb_list_subfeatures

List subfeatures for a parent feature.

**Inputs**:
```json
{
  "featureId": { "type": "string", "required": true, "description": "Parent feature ID" },
  "pageCursor": { "type": "string", "optional": true, "description": "Cursor for pagination" }
}
```

**Output**: Array of subfeatures
```json
{
  "subfeatures": [
    { "id": "...", "name": "...", "status": "...", "owner": "..." }
  ],
  "parentFeature": { "id": "...", "name": "..." },
  "nextCursor": "..." | null
}
```

---

### pb_get_subfeature

Get detailed information about a specific subfeature.

**Inputs**:
```json
{
  "subfeatureId": { "type": "string", "required": true, "description": "Subfeature ID" }
}
```

**Output**: Full subfeature details (similar to feature)

---

### pb_create_subfeature

Create a new subfeature under a parent feature.

**Inputs**:
```json
{
  "name": { "type": "string", "required": true, "description": "Subfeature name" },
  "featureId": { "type": "string", "required": true, "description": "Parent feature ID" },
  "description": { "type": "string", "optional": true, "description": "Description (HTML)" },
  "status": { "type": "string", "optional": true, "description": "Initial status" }
}
```

**Output**: Created subfeature details

---

### pb_update_subfeature

Update properties of an existing subfeature.

**Inputs**:
```json
{
  "subfeatureId": { "type": "string", "required": true, "description": "Subfeature ID" },
  "name": { "type": "string", "optional": true, "description": "New name" },
  "description": { "type": "string", "optional": true, "description": "New description" },
  "status": { "type": "string", "optional": true, "description": "New status" }
}
```

**Output**: Updated subfeature details

---

## Relationship Tools

### pb_get_relationships

Get relationships for a feature.

**Inputs**:
```json
{
  "featureId": { "type": "string", "required": true, "description": "Feature ID" }
}
```

**Output**: Feature relationships
```json
{
  "feature": { "id": "...", "name": "..." },
  "product": { "id": "...", "name": "..." } | null,
  "component": { "id": "...", "name": "..." } | null,
  "initiative": { "id": "...", "name": "..." } | null,
  "parent": { "id": "...", "name": "...", "type": "..." } | null,
  "children": [{ "id": "...", "name": "...", "type": "..." }]
}
```

---

### pb_set_relationship

Create or update a relationship for a feature.

**Inputs**:
```json
{
  "featureId": { "type": "string", "required": true, "description": "Feature ID" },
  "relationshipType": {
    "type": "string",
    "required": true,
    "enum": ["component", "product", "initiative", "parent"],
    "description": "Type of relationship to set"
  },
  "targetId": { "type": "string", "required": true, "description": "Target entity ID" }
}
```

**Output**: Updated relationship
```json
{
  "feature": { "id": "...", "name": "..." },
  "relationshipType": "component",
  "target": { "id": "...", "name": "...", "type": "component" },
  "message": "Relationship created successfully"
}
```

---

### pb_remove_relationship

Remove a relationship from a feature.

**Inputs**:
```json
{
  "featureId": { "type": "string", "required": true, "description": "Feature ID" },
  "relationshipType": {
    "type": "string",
    "required": true,
    "enum": ["component", "product", "initiative", "parent"],
    "description": "Type of relationship to remove"
  }
}
```

**Output**: Confirmation
```json
{
  "feature": { "id": "...", "name": "..." },
  "relationshipType": "component",
  "message": "Relationship removed successfully"
}
```

---

## Configuration Tools

### pb_get_config

Get workspace configuration including available statuses, teams, and fields.

**Inputs**:
```json
{
  "entityType": {
    "type": "string",
    "optional": true,
    "enum": ["feature", "subfeature"],
    "description": "Entity type to get config for (default: all)"
  }
}
```

**Output**: Configuration data
```json
{
  "statuses": [
    { "id": "...", "name": "New" },
    { "id": "...", "name": "In Progress" }
  ],
  "teams": [
    { "id": "...", "name": "Front-end Team" },
    { "id": "...", "name": "Desktop Team" }
  ],
  "fields": [
    { "id": "...", "name": "priority", "type": "singleSelect", "options": [...] }
  ]
}
```

---

### pb_list_components

List available components in the workspace.

**Inputs**:
```json
{
  "productId": { "type": "string", "optional": true, "description": "Filter by product" },
  "pageCursor": { "type": "string", "optional": true, "description": "Cursor for pagination" }
}
```

**Output**: Array of components
```json
{
  "components": [
    { "id": "...", "name": "...", "product": { "id": "...", "name": "..." } }
  ],
  "nextCursor": "..." | null
}
```

---

### pb_list_products

List available products in the workspace.

**Inputs**:
```json
{
  "pageCursor": { "type": "string", "optional": true, "description": "Cursor for pagination" }
}
```

**Output**: Array of products
```json
{
  "products": [
    { "id": "...", "name": "..." }
  ],
  "nextCursor": "..." | null
}
```

---

## Error Response Format

All tools return errors in a consistent format:

```json
{
  "error": true,
  "code": "FEATURE_NOT_FOUND",
  "message": "Feature with ID 'abc123' was not found",
  "suggestion": "Try searching for features with pb_search_features",
  "details": {
    "featureId": "abc123"
  }
}
```

**Error Codes**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input parameters |
| `INVALID_RICHTEXT` | 400 | Richtext contains unsupported tags |
| `AUTH_FAILED` | 401 | Invalid or expired API token |
| `NOT_FOUND` | 404 | Entity not found |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `API_ERROR` | 5xx | ProductBoard API error |

---

## Tool Summary

| Tool | Operation | FR Reference |
|------|-----------|--------------|
| pb_list_features | List features with filters | FR-006 |
| pb_get_feature | Get feature details | FR-007 |
| pb_create_feature | Create new feature | FR-008 |
| pb_update_feature | Update feature | FR-009 |
| pb_search_features | Search features | FR-010 |
| pb_list_subfeatures | List subfeatures | FR-010a |
| pb_get_subfeature | Get subfeature details | FR-010b |
| pb_create_subfeature | Create subfeature | FR-010c |
| pb_update_subfeature | Update subfeature | FR-010d |
| pb_get_relationships | View relationships | FR-011 |
| pb_set_relationship | Create relationship | FR-012 |
| pb_remove_relationship | Remove relationship | FR-013 |
| pb_get_config | Get configuration | FR-014 |
| pb_list_components | List components | Supporting |
| pb_list_products | List products | Supporting |
