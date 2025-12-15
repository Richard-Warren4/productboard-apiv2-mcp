# Quickstart: Dynamic Entity Configuration Discovery

**Feature**: 003-dynamic-entity-config
**Date**: 2025-12-14

## Overview

This enhancement adds dynamic field discovery and validation to the ProductBoard MCP server. Users can discover workspace-specific field configurations and receive helpful validation warnings when creating or updating features.

---

## Usage

### 1. Discover Field Configuration

Use `pb_get_config` to see available fields for your workspace:

```json
{
  "tool": "pb_get_config",
  "parameters": {
    "entityType": "feature"
  }
}
```

**Response includes**:
- All available fields with names and types
- Required fields for creation
- Available options for status and select fields
- Validation constraints (max length, etc.)

### 2. Create Feature with Validation

When creating a feature, you'll receive warnings if inputs don't match configuration:

```json
{
  "tool": "pb_create_feature",
  "parameters": {
    "name": "My Feature",
    "status": "InvalidStatus"
  }
}
```

**Response with warning**:
```json
{
  "message": "Feature created successfully",
  "warnings": [
    {
      "field": "status",
      "issue": "invalid_value",
      "message": "Status 'InvalidStatus' not found",
      "suggestion": "Available statuses: Backlog, In Progress, Done"
    }
  ],
  "feature": { ... }
}
```

### 3. Subfeature Configuration

Same pattern works for subfeatures:

```json
{
  "tool": "pb_get_config",
  "parameters": {
    "entityType": "subfeature"
  }
}
```

---

## Key Behaviors

| Scenario | Behavior |
|----------|----------|
| Invalid status/select value | Warning with available options; operation proceeds |
| Missing required field | Warning identifying the field; operation proceeds |
| Unknown custom field | Accepted silently; passed to API |
| Configuration fetch fails | Operations proceed without validation |
| Field type unrecognized | Silently skipped in config display |

---

## Caching

Configuration is cached for the session:
- **First call**: Fetches from ProductBoard API
- **Subsequent calls**: Returns cached data instantly
- **Refresh**: Restart MCP server to refresh cache

---

## Example: Full Workflow

```typescript
// 1. Discover configuration
const config = await mcp.callTool('pb_get_config', { entityType: 'feature' });
// Shows: name (required), description, status (options: Backlog, In Progress, Done), ...

// 2. Create with validation
const result = await mcp.callTool('pb_create_feature', {
  name: 'New Feature',
  status: 'In Progress',
  description: '<p>Feature description</p>'
});
// Creates feature; no warnings if all inputs valid

// 3. Handle warnings
if (result.warnings?.length > 0) {
  console.log('Validation warnings:', result.warnings);
  // Feature was still created, but inputs may not match config
}
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/tools/config.ts` | Enhanced `pb_get_config` output, session caching |
| `src/tools/features.ts` | Added validation warnings to create/update |
| `src/tools/subfeatures.ts` | Added validation warnings to create/update |
| `src/utils/validation.ts` | New validation utility |
| `src/client/types.ts` | New configuration types |

---

## Testing

```bash
# Run live tests (requires PRODUCTBOARD_API_TOKEN)
npm run test:live

# Run unit tests for validation
npm run test:unit
```
