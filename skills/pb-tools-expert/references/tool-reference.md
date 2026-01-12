# ProductBoard MCP Tools Reference

Complete documentation for all 14 ProductBoard MCP tools.

## Entity Tools (7 tools)

### pb_entity_create

Create any entity type.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityType` | string | Yes | One of: objective, product, component, feature, subfeature, releaseGroup, release, company |
| `fields` | object | Yes | Entity fields including name (required) |

**Example - Create feature:**
```json
{
  "entityType": "feature",
  "fields": {
    "name": "User Authentication",
    "status": {"name": "Candidate"}
  }
}
```

**Example - Create subfeature (requires parent):**
```json
{
  "entityType": "subfeature",
  "fields": {
    "name": "OAuth Integration",
    "parent": {"id": "parent-feature-uuid"}
  }
}
```

### pb_entity_get

Get entity by ID with auto-detected type.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Entity UUID |

**Example:**
```json
{"id": "550e8400-e29b-41d4-a716-446655440000"}
```

### pb_entity_update

Update entity fields (partial update supported).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Entity UUID |
| `fields` | object | Yes | Fields to update |

**Example:**
```json
{
  "id": "feature-uuid",
  "fields": {
    "name": "Updated Name",
    "status": {"name": "In progress"}
  }
}
```

### pb_entity_list

List all entities of a type with pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityType` | string | Yes | Entity type to list |
| `pageCursor` | string | No | Cursor for pagination |

**Example:**
```json
{"entityType": "product"}
```

### pb_entity_search

Search entities with filters. Supports feature, subfeature, objective.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityType` | string | Yes | feature, subfeature, or objective |
| `name` | string | No | Partial name match (case-insensitive) |
| `statuses` | array | No | Filter by status: `[{name: "In progress"}]` |
| `owners` | array | No | Filter by owner: `[{email: "user@example.com"}]` |
| `parent` | object | No | Filter by parent: `{id: "uuid"}` |
| `archived` | boolean | No | Filter by archived state |
| `ids` | array | No | Filter by specific IDs |
| `customFieldFilters` | array | No | Client-side custom field filters |

**Example - Search by owner:**
```json
{
  "entityType": "feature",
  "owners": [{"email": "sarah@example.com"}]
}
```

**Example - Search by status:**
```json
{
  "entityType": "feature",
  "statuses": [{"name": "In progress"}]
}
```

**Example - Custom field filter:**
```json
{
  "entityType": "feature",
  "customFieldFilters": [
    {"field": "Reach", "operator": ">=", "value": 50}
  ]
}
```

### pb_entity_types

List available entity types and field configurations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityType` | string | No | Specific type to get config for |
| `includeFields` | boolean | No | Include field definitions |

**Example:**
```json
{}
```

### pb_refresh_config

Force refresh of cached configuration.

No parameters required.

---

## Relationship Tools (4 tools)

### pb_get_relationships

Get all relationships for an entity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `featureId` | string | Yes | Entity UUID |

**Returns:** parent, child, link, isBlockedBy, isBlocking relationships.

### pb_create_relationship

Create a relationship between entities.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityId` | string | Yes | Source entity UUID |
| `relationshipType` | string | Yes | parent, child, link, isBlockedBy, isBlocking |
| `targetId` | string | Yes | Target entity UUID |

**Example - Link feature to objective:**
```json
{
  "entityId": "feature-uuid",
  "relationshipType": "link",
  "targetId": "objective-uuid"
}
```

### pb_set_relationship

Replace a single-target relationship (e.g., parent).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `featureId` | string | Yes | Entity UUID |
| `relationshipType` | string | Yes | Relationship type |
| `targetId` | string | Yes | New target UUID |

**Example:**
```json
{
  "featureId": "feature-uuid",
  "relationshipType": "parent",
  "targetId": "new-parent-uuid"
}
```

### pb_remove_relationship

Remove a relationship.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `featureId` | string | Yes | Entity UUID |
| `relationshipType` | string | Yes | Relationship type |
| `targetId` | string | Yes | Target to unlink |

---

## Configuration Tools (3 tools)

### pb_get_config

Get field configuration for entity types.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityType` | string | No | Specific type (default: all) |

**Returns:** Available fields, statuses, custom fields with options.

### pb_list_products

List all products.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageCursor` | string | No | Cursor for pagination |

### pb_list_components

List components within a product.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `productId` | string | No | Filter by product |
| `pageCursor` | string | No | Cursor for pagination |

---

## Tool Selection by Goal

### Finding Entities

| Goal | Tool | Example |
|------|------|---------|
| Find by name | `pb_entity_search` | `{entityType: "feature", name: "auth"}` |
| Find by owner | `pb_entity_search` | `{entityType: "feature", owners: [{email: "user@example.com"}]}` |
| Find by status | `pb_entity_search` | `{entityType: "feature", statuses: [{name: "In progress"}]}` |
| Find by custom field | `pb_entity_search` | `{entityType: "feature", customFieldFilters: [{field: "Reach", operator: ">=", value: 50}]}` |
| Get specific entity | `pb_entity_get` | `{id: "uuid"}` |
| List all of type | `pb_entity_list` | `{entityType: "product"}` |
| Find subfeatures of parent | `pb_entity_search` | `{entityType: "subfeature", parent: {id: "parent-uuid"}}` |

### Creating Entities

| Goal | Tool | Example |
|------|------|---------|
| Create feature | `pb_entity_create` | `{entityType: "feature", fields: {name: "New Feature"}}` |
| Create subfeature | `pb_entity_create` | `{entityType: "subfeature", fields: {name: "Sub", parent: {id: "parent-uuid"}}}` |
| Create objective | `pb_entity_create` | `{entityType: "objective", fields: {name: "Q1 Goal"}}` |

### Updating Entities

| Goal | Tool | Example |
|------|------|---------|
| Update any field | `pb_entity_update` | `{id: "uuid", fields: {name: "Updated Name"}}` |
| Change status | `pb_entity_update` | `{id: "uuid", fields: {status: {name: "Released"}}}` |
| Assign owner | `pb_entity_update` | `{id: "uuid", fields: {owner: {email: "user@example.com"}}}` |

### Linking Entities

| Goal | Tool | Example |
|------|------|---------|
| Link to objective | `pb_create_relationship` | `{entityId: "feature-uuid", relationshipType: "link", targetId: "objective-uuid"}` |
| Set parent | `pb_set_relationship` | `{featureId: "uuid", relationshipType: "parent", targetId: "parent-uuid"}` |
| Create dependency | `pb_create_relationship` | `{entityId: "uuid", relationshipType: "isBlockedBy", targetId: "blocker-uuid"}` |
| Remove link | `pb_remove_relationship` | `{featureId: "uuid", relationshipType: "link", targetId: "target-uuid"}` |

### Configuration Discovery

| Goal | Tool | Example |
|------|------|---------|
| Available statuses | `pb_get_config` | `{entityType: "feature"}` |
| Custom field names | `pb_get_config` | `{entityType: "feature"}` |
| Entity types | `pb_entity_types` | `{}` |
| All products | `pb_list_products` | `{}` |
| Components in product | `pb_list_components` | `{productId: "uuid"}` |
