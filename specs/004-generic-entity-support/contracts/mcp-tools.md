# MCP Tool Contracts: Generic Entity Support

**Date**: 2025-12-15
**Feature**: 004-generic-entity-support

## New Generic Tools

### pb_entity_create

Create a new entity of any supported type.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "entityType": {
      "type": "string",
      "enum": ["objective", "product", "component", "feature", "subfeature", "releaseGroup", "release", "company"],
      "description": "The type of entity to create"
    },
    "fields": {
      "type": "object",
      "properties": {
        "name": { "type": "string", "description": "Entity name (required)" },
        "description": {
          "type": "object",
          "properties": { "value": { "type": "string" } },
          "description": "HTML description"
        },
        "status": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" }
          },
          "description": "Status (provide id OR name)"
        },
        "owner": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "email": { "type": "string" }
          },
          "description": "Owner (provide id OR email)"
        },
        "teams": {
          "type": "array",
          "items": { "type": "object", "properties": { "id": { "type": "string" } } },
          "description": "Team assignments"
        },
        "parent": {
          "type": "object",
          "properties": { "id": { "type": "string" } },
          "description": "Parent entity reference"
        }
      },
      "required": ["name"],
      "additionalProperties": true
    }
  },
  "required": ["entityType", "fields"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "entity": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "type": { "type": "string" },
        "fields": { "type": "object" },
        "links": { "type": "object" }
      }
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": { "type": "string" },
          "message": { "type": "string" }
        }
      }
    }
  }
}
```

---

### pb_entity_get

Get an entity by ID.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Entity UUID"
    }
  },
  "required": ["id"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "entity": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "type": { "type": "string" },
        "fields": { "type": "object" },
        "relationships": { "type": "array" },
        "createdAt": { "type": "string" },
        "updatedAt": { "type": "string" },
        "links": { "type": "object" }
      }
    }
  }
}
```

---

### pb_entity_update

Update an existing entity.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Entity UUID"
    },
    "fields": {
      "type": "object",
      "description": "Fields to update (partial update supported)",
      "additionalProperties": true
    }
  },
  "required": ["id", "fields"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "entity": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "type": { "type": "string" },
        "fields": { "type": "object" },
        "links": { "type": "object" }
      }
    },
    "warnings": {
      "type": "array",
      "items": { "type": "object" }
    }
  }
}
```

---

### pb_entity_list

List entities of a specific type with pagination.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "entityType": {
      "type": "string",
      "enum": ["objective", "product", "component", "feature", "subfeature", "releaseGroup", "release", "company", "user"],
      "description": "The type of entities to list"
    },
    "pageSize": {
      "type": "number",
      "default": 100,
      "description": "Number of items per page (default: 100)"
    },
    "pageCursor": {
      "type": "string",
      "description": "Cursor for pagination (from previous response)"
    }
  },
  "required": ["entityType"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "entities": {
      "type": "array",
      "items": { "type": "object" }
    },
    "pagination": {
      "type": "object",
      "properties": {
        "nextCursor": { "type": "string" },
        "hasMore": { "type": "boolean" }
      }
    }
  }
}
```

---

### pb_entity_search

Search for entities with filters.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "entityType": {
      "type": "string",
      "enum": ["objective", "feature", "subfeature"],
      "description": "Entity type to search (limited types support search)"
    },
    "name": {
      "type": "string",
      "description": "Filter by name (partial, case-insensitive)"
    },
    "statuses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": { "name": { "type": "string" } }
      },
      "description": "Filter by status names"
    },
    "owners": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": { "email": { "type": "string" } }
      },
      "description": "Filter by owner emails"
    },
    "parent": {
      "type": "object",
      "properties": { "id": { "type": "string" } },
      "description": "Filter by parent entity"
    },
    "pageSize": {
      "type": "number",
      "default": 100
    },
    "pageCursor": {
      "type": "string"
    }
  },
  "required": ["entityType"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "entities": {
      "type": "array",
      "items": { "type": "object" }
    },
    "pagination": {
      "type": "object",
      "properties": {
        "nextCursor": { "type": "string" },
        "hasMore": { "type": "boolean" }
      }
    }
  }
}
```

---

### pb_entity_types

List available entity types and their field configurations.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "entityType": {
      "type": "string",
      "description": "Optional: Get configuration for specific type only"
    },
    "includeFields": {
      "type": "boolean",
      "default": false,
      "description": "Include full field definitions"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "entityTypes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "type": "string" },
          "fieldCount": { "type": "number" },
          "settableFieldCount": { "type": "number" },
          "requiredFieldCount": { "type": "number" },
          "fields": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "name": { "type": "string" },
                "type": { "type": "string" },
                "required": { "type": "boolean" },
                "readOnly": { "type": "boolean" }
              }
            }
          }
        }
      }
    }
  }
}
```

---

### pb_refresh_config

Force refresh of cached entity configuration.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "message": { "type": "string" },
    "entityTypes": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

## Existing Tools (Retained as Aliases)

These tools continue to work unchanged, internally delegating to the generic handler:

| Tool | Behavior |
|------|----------|
| pb_create_feature | Alias for `pb_entity_create` with `entityType: "feature"` |
| pb_get_feature | Alias for `pb_entity_get` |
| pb_update_feature | Alias for `pb_entity_update` |
| pb_list_features | Alias for `pb_entity_list` with `entityType: "feature"` |
| pb_search_features | Alias for `pb_entity_search` with `entityType: "feature"` |
| pb_create_subfeature | Alias for `pb_entity_create` with `entityType: "subfeature"` |
| pb_get_subfeature | Alias for `pb_entity_get` |
| pb_update_subfeature | Alias for `pb_entity_update` |
| pb_list_subfeatures | Alias for `pb_entity_list` with `entityType: "subfeature"` |
| pb_list_components | Alias for `pb_entity_list` with `entityType: "component"` |

---

## Error Responses

All tools return errors in consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR | API_ERROR | RATE_LIMIT | NOT_FOUND",
    "message": "Human-readable error message",
    "details": {
      "field": "optional field name",
      "retryAfter": "optional seconds for rate limit"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | N/A | Local validation failed before API call |
| API_ERROR | 4xx/5xx | ProductBoard API returned error |
| RATE_LIMIT | 429 | Rate limit exceeded, includes retry-after |
| NOT_FOUND | 404 | Entity not found |
| UNSUPPORTED_TYPE | N/A | Entity type not supported for operation |
