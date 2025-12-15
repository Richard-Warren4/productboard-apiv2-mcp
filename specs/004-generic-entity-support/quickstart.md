# Quickstart: Generic Entity Support

**Date**: 2025-12-15
**Feature**: 004-generic-entity-support

## Overview

This feature extends the ProductBoard MCP server to support CRUD operations for all 9 entity types using generic tools while maintaining backward compatibility with existing feature-specific tools.

## Prerequisites

- Node.js 20+
- ProductBoard API token with appropriate permissions
- MCP-compatible client (Claude Desktop, etc.)

## Quick Examples

### List Available Entity Types

```json
// Tool: pb_entity_types
{}
// Response: List of 9 entity types with field counts
```

### Create an Objective

```json
// Tool: pb_entity_create
{
  "entityType": "objective",
  "fields": {
    "name": "Q1 2025 Goals",
    "description": { "value": "<p>Strategic objectives for Q1</p>" },
    "status": { "name": "New idea" }
  }
}
```

### Create a Component

```json
// Tool: pb_entity_create
{
  "entityType": "component",
  "fields": {
    "name": "Mobile App",
    "parent": { "id": "product-uuid-here" }
  }
}
```

### Create a Feature with Parent

```json
// Tool: pb_entity_create
{
  "entityType": "feature",
  "fields": {
    "name": "User Authentication",
    "description": { "value": "<p>Implement <b>OAuth</b> login flow</p>" },
    "status": { "name": "New idea" },
    "parent": { "id": "component-uuid-here" }
  }
}
```

### Get Any Entity by ID

```json
// Tool: pb_entity_get
{
  "id": "entity-uuid-here"
}
// Works for any entity type - type is auto-detected
```

### Update Entity Fields

```json
// Tool: pb_entity_update
{
  "id": "entity-uuid-here",
  "fields": {
    "status": { "name": "In Progress" },
    "owner": { "email": "developer@example.com" }
  }
}
```

### List All Objectives

```json
// Tool: pb_entity_list
{
  "entityType": "objective",
  "pageSize": 50
}
```

### Search Features by Name

```json
// Tool: pb_entity_search
{
  "entityType": "feature",
  "name": "Authentication"
}
// Returns features matching "Authentication" (partial, case-insensitive)
```

### Search by Status and Owner

```json
// Tool: pb_entity_search
{
  "entityType": "feature",
  "statuses": [{ "name": "In Progress" }],
  "owners": [{ "email": "developer@example.com" }]
}
```

## Existing Tools Still Work

All existing tools continue to work unchanged:

```json
// Tool: pb_create_feature (unchanged)
{
  "name": "My Feature",
  "description": { "value": "<p>Description</p>" }
}

// Tool: pb_list_features (unchanged)
{}

// Tool: pb_search_features (unchanged)
{
  "name": "search term"
}
```

## Common Patterns

### Discover Available Fields

Before creating entities, discover what fields are available:

```json
// Tool: pb_entity_types
{
  "entityType": "objective",
  "includeFields": true
}
```

### Handle Parent Requirements

Some entity types require a parent. Check configuration:

| Entity Type | Parent Required | Parent Type |
|-------------|-----------------|-------------|
| component | Yes | product |
| feature | Maybe (workspace) | product or component |
| subfeature | Yes | feature |
| release | Yes | releaseGroup |

### HTML Description Guidelines

Use only these tags in descriptions:
- `<b>` (not `<strong>`)
- `<i>` (not `<em>`)
- `<s>`, `<u>`, `<br>`, `<a>`, `<code>`, `<img>`, `<p>`

```json
// Good
{ "value": "<p>This is <b>bold</b> and <i>italic</i></p>" }

// Bad (will be rejected)
{ "value": "<p>This is <strong>bold</strong></p>" }
```

## Error Handling

### Validation Warnings

The tools return warnings for potential issues:

```json
{
  "entity": { ... },
  "warnings": [
    { "field": "customField", "message": "Field is read-only, was ignored" }
  ]
}
```

### Rate Limit Errors

When rate limited, the error includes retry guidance:

```json
{
  "error": {
    "code": "RATE_LIMIT",
    "message": "Rate limit exceeded",
    "details": { "retryAfter": 5 }
  }
}
```

## Testing Your Setup

1. Check entity types are accessible:
   ```json
   // Tool: pb_entity_types
   {}
   ```

2. List a few features to verify connection:
   ```json
   // Tool: pb_entity_list
   { "entityType": "feature", "pageSize": 5 }
   ```

3. Create a test objective:
   ```json
   // Tool: pb_entity_create
   {
     "entityType": "objective",
     "fields": { "name": "MCP Test Objective" }
   }
   ```
