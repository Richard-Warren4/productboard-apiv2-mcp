# Quickstart: Using Consolidated MCP Tools

After tool consolidation, use these 14 tools for all ProductBoard operations.

## Entity Operations

```typescript
// List features
pb_entity_list({ entityType: "feature" })

// Get a specific entity (type auto-detected)
pb_entity_get({ id: "feature-uuid" })

// Create a feature
pb_entity_create({
  entityType: "feature",
  fields: {
    name: "New Feature",
    description: "<p>Description here</p>",
    status: { name: "New" }
  }
})

// Create a subfeature with parent
pb_entity_create({
  entityType: "subfeature",
  fields: {
    name: "New Subfeature",
    parent: { id: "parent-feature-uuid" }
  }
})

// Update any entity
pb_entity_update({
  id: "entity-uuid",
  fields: {
    name: "Updated Name",
    status: { name: "In progress" }
  }
})

// Search features by status
pb_entity_search({
  entityType: "feature",
  statuses: [{ name: "In progress" }]
})

// Search subfeatures by parent
pb_entity_search({
  entityType: "subfeature",
  parent: { id: "parent-feature-uuid" }
})
```

## Configuration Discovery

```typescript
// Get field configuration for features
pb_entity_types({ entityType: "feature", includeFields: true })

// List all entity types
pb_entity_types()

// Force refresh cached config
pb_refresh_config()

// List products
pb_list_products()

// List components
pb_list_components()
```

## Relationship Operations

```typescript
// Get all relationships for an entity
pb_get_relationships({ featureId: "entity-uuid" })

// Link a feature to an objective
pb_create_relationship({
  entityId: "feature-uuid",
  relationshipType: "link",
  targetId: "objective-uuid"
})

// Set parent relationship (replaces existing)
pb_set_relationship({
  featureId: "entity-uuid",
  relationshipType: "parent",
  targetId: "new-parent-uuid"
})

// Remove a relationship
pb_remove_relationship({
  featureId: "entity-uuid",
  relationshipType: "link",
  targetId: "objective-uuid"
})
```

## Migration from Old Tools

| Old Tool | New Tool |
|----------|----------|
| `pb_list_features` | `pb_entity_list({ entityType: "feature" })` |
| `pb_get_feature` | `pb_entity_get({ id })` |
| `pb_create_feature` | `pb_entity_create({ entityType: "feature", fields })` |
| `pb_update_feature` | `pb_entity_update({ id, fields })` |
| `pb_search_features` | `pb_entity_search({ entityType: "feature", ... })` |
| `pb_list_subfeatures` | `pb_entity_search({ entityType: "subfeature", parent: { id } })` |
| `pb_get_subfeature` | `pb_entity_get({ id })` |
| `pb_create_subfeature` | `pb_entity_create({ entityType: "subfeature", fields })` |
| `pb_update_subfeature` | `pb_entity_update({ id, fields })` |
