# ProductBoard MCP Workflow Patterns

Detailed multi-step workflow patterns for common ProductBoard operations.

## Pattern 1: Feature Discovery Flow

### When to Use

When finding a feature, understanding its details, and exploring its relationships.

### Steps

1. **Search** - Find features matching criteria
2. **Get Details** - Retrieve full entity information
3. **Explore Relationships** - Discover linked entities

### Complete Example

```
Step 1: Search for features
─────────────────────────────────────────────────
pb_entity_search({
  entityType: "feature",
  name: "checkout"
})

Response:
{
  "data": [
    {
      "id": "feat-123",
      "name": "Checkout Flow Redesign",
      "status": {"name": "In progress"},
      "owner": {"email": "sarah@example.com"}
    },
    {
      "id": "feat-456",
      "name": "Express Checkout",
      "status": {"name": "Candidate"}
    }
  ]
}

Step 2: Get full details of selected feature
─────────────────────────────────────────────────
pb_entity_get({
  id: "feat-123"
})

Response:
{
  "id": "feat-123",
  "name": "Checkout Flow Redesign",
  "description": "<p>Redesign the checkout experience...</p>",
  "status": {"id": "status-1", "name": "In progress"},
  "owner": {"id": "user-1", "email": "sarah@example.com"},
  "customFields": {
    "Reach": 85,
    "Impact": 70,
    "Priority": {"name": "High"}
  }
}

Step 3: Discover relationships
─────────────────────────────────────────────────
pb_get_relationships({
  featureId: "feat-123"
})

Response:
{
  "links": [
    {"id": "obj-789", "name": "Improve Conversion Rate"}
  ],
  "parent": null,
  "children": [
    {"id": "sub-001", "name": "Payment Form"},
    {"id": "sub-002", "name": "Order Summary"}
  ],
  "isBlockedBy": [],
  "isBlocking": []
}
```

### Key Points

- Search returns summary data; use `pb_entity_get` for full details
- Custom fields only appear in full entity response
- Relationships reveal the feature's context in the product hierarchy

---

## Pattern 2: Create and Link Feature

### When to Use

When creating a new feature that should be connected to an objective or other entities.

### Steps

1. **Create** - Create the new feature
2. **Link** - Connect to objective or other entities

### Complete Example

```
Step 1: Create the feature
─────────────────────────────────────────────────
pb_entity_create({
  entityType: "feature",
  fields: {
    name: "User Authentication",
    description: {value: "<p>Implement secure user authentication system</p>"},
    status: {name: "Candidate"}
  }
})

Response:
{
  "id": "feat-new-123",
  "name": "User Authentication",
  "status": {"name": "Candidate"}
}

Step 2: Link to objective
─────────────────────────────────────────────────
pb_create_relationship({
  entityId: "feat-new-123",
  relationshipType: "link",
  targetId: "obj-security-initiative"
})

Response:
{
  "success": true,
  "relationship": {
    "type": "link",
    "source": "feat-new-123",
    "target": "obj-security-initiative"
  }
}
```

### Variations

**Link to multiple objectives:**
```
pb_create_relationship({entityId: "feat-123", relationshipType: "link", targetId: "obj-1"})
pb_create_relationship({entityId: "feat-123", relationshipType: "link", targetId: "obj-2"})
```

**Create with owner:**
```
pb_entity_create({
  entityType: "feature",
  fields: {
    name: "User Authentication",
    owner: {email: "developer@example.com"}
  }
})
```

### Key Points

- Features can be linked to multiple objectives
- Use relationship type "link" for feature-to-objective connections
- Always verify the objective ID exists before linking

---

## Pattern 3: Feature Hierarchy Creation

### When to Use

When building a parent feature with multiple subfeatures.

### Steps

1. **Create Parent** - Create the parent feature FIRST
2. **Create Children** - Create subfeatures with parent reference

### Complete Example

```
Step 1: Create parent feature
─────────────────────────────────────────────────
pb_entity_create({
  entityType: "feature",
  fields: {
    name: "Payment System"
  }
})

Response:
{
  "id": "feat-parent-789",
  "name": "Payment System"
}

Step 2: Create first subfeature
─────────────────────────────────────────────────
pb_entity_create({
  entityType: "subfeature",
  fields: {
    name: "Credit Card Processing",
    parent: {id: "feat-parent-789"}
  }
})

Response:
{
  "id": "sub-001",
  "name": "Credit Card Processing",
  "parent": {"id": "feat-parent-789"}
}

Step 3: Create second subfeature
─────────────────────────────────────────────────
pb_entity_create({
  entityType: "subfeature",
  fields: {
    name: "Invoice Generation",
    parent: {id: "feat-parent-789"}
  }
})

Response:
{
  "id": "sub-002",
  "name": "Invoice Generation",
  "parent": {"id": "feat-parent-789"}
}

Step 4: Create third subfeature
─────────────────────────────────────────────────
pb_entity_create({
  entityType: "subfeature",
  fields: {
    name: "Payment History",
    parent: {id: "feat-parent-789"}
  }
})

Response:
{
  "id": "sub-003",
  "name": "Payment History",
  "parent": {"id": "feat-parent-789"}
}
```

### Verify the Hierarchy

```
pb_get_relationships({featureId: "feat-parent-789"})

Response:
{
  "children": [
    {"id": "sub-001", "name": "Credit Card Processing"},
    {"id": "sub-002", "name": "Invoice Generation"},
    {"id": "sub-003", "name": "Payment History"}
  ],
  "parent": null,
  "links": []
}
```

### Key Points

- ALWAYS create parent feature first
- Subfeatures REQUIRE `parent: {id: "..."}` field
- Parent can be linked to objectives, subfeatures inherit the connection
- Use `pb_get_relationships` to verify hierarchy

---

## Pattern 4: Bulk Status Update

### When to Use

When updating multiple features to the same status (e.g., marking sprint items as "In progress").

### Steps

1. **Search** - Find features to update
2. **Update Each** - Apply status change to each

### Complete Example

```
Step 1: Find features to update
─────────────────────────────────────────────────
pb_entity_search({
  entityType: "feature",
  statuses: [{name: "Candidate"}],
  owners: [{email: "sprint-team@example.com"}]
})

Response:
{
  "data": [
    {"id": "feat-1", "name": "Feature A"},
    {"id": "feat-2", "name": "Feature B"},
    {"id": "feat-3", "name": "Feature C"}
  ]
}

Step 2: Update each feature
─────────────────────────────────────────────────
pb_entity_update({id: "feat-1", fields: {status: {name: "In progress"}}})
pb_entity_update({id: "feat-2", fields: {status: {name: "In progress"}}})
pb_entity_update({id: "feat-3", fields: {status: {name: "In progress"}}})
```

### Key Points

- No bulk update API exists; update features individually
- Verify status name casing with `pb_get_config` first
- Consider rate limiting for large batches

---

## Pattern 5: Find and Link to Objective

### When to Use

When finding an existing feature and connecting it to an objective.

### Steps

1. **Search Feature** - Find the feature by name
2. **Search Objective** - Find the objective to link to
3. **Create Link** - Connect them

### Complete Example

```
Step 1: Find the feature
─────────────────────────────────────────────────
pb_entity_search({
  entityType: "feature",
  name: "checkout"
})

Response:
{
  "data": [
    {"id": "feat-123", "name": "Checkout Flow"}
  ]
}

Step 2: Find the objective
─────────────────────────────────────────────────
pb_entity_search({
  entityType: "objective",
  name: "conversion"
})

Response:
{
  "data": [
    {"id": "obj-456", "name": "Improve Conversion Rate"}
  ]
}

Step 3: Create the link
─────────────────────────────────────────────────
pb_create_relationship({
  entityId: "feat-123",
  relationshipType: "link",
  targetId: "obj-456"
})
```

### Key Points

- Always verify both entities exist before linking
- Use `pb_entity_search` with appropriate entity types
- Relationship type "link" is for non-hierarchical connections

---

## Pattern 6: Find Product for Feature Parent

### When to Use

When creating features and you need to find the correct parent product/component.

### The Challenge

`pb_list_products` returns only IDs and descriptions (often empty) - no names. You must fetch each product individually to see its name.

### Steps

1. **List Products** - Get all product IDs
2. **Get Details** - Fetch each product to see name and owner
3. **Select Parent** - Choose appropriate product
4. **Create Feature** - Use product ID as parent

### Complete Example

```
Step 1: List available products
─────────────────────────────────────────────────
pb_list_products()

Response:
{
  "products": [
    {"id": "prod-1", "description": ""},
    {"id": "prod-2", "description": ""},
    {"id": "prod-3", "description": ""}
  ]
}

Step 2: Get details for each product
─────────────────────────────────────────────────
pb_entity_get({id: "prod-1"})
→ {"name": "Mobile App", "owner": "alice@example.com"}

pb_entity_get({id: "prod-2"})
→ {"name": "Desktop App", "owner": "bob@example.com"}

pb_entity_get({id: "prod-3"})
→ {"name": "API Platform", "owner": "alice@example.com"}

Step 3: Create feature under chosen product
─────────────────────────────────────────────────
pb_entity_create({
  entityType: "feature",
  fields: {
    name: "New Feature",
    parent: {id: "prod-2"},
    description: {value: "<p>Feature description</p>"},
    status: {name: "Candidate"}
  }
})
```

### Key Points

- Many workspaces require features to have a parent
- Product list doesn't include names - must fetch each one
- Check owner field to find products you own
- Components can also be used as parents

---

## Pattern 7: Move Feature Between Parents (Reliable Method)

### When to Use

When moving a feature or subfeature from one parent to another.

### Important Note

**Do NOT use `pb_set_relationship`** for moving features. While it may appear to work, results can be inconsistent. Use `pb_entity_update` instead.

### Steps

1. **Identify Target** - Find the new parent ID
2. **Update Parent** - Use pb_entity_update to set new parent

### Complete Example

```
Step 1: Find the new parent feature
─────────────────────────────────────────────────
pb_entity_search({
  entityType: "feature",
  name: "Payment System"
})

Response:
{
  "data": [
    {"id": "feat-new-parent", "name": "Payment System v2"}
  ]
}

Step 2: Move the subfeature to new parent
─────────────────────────────────────────────────
pb_entity_update({
  id: "sub-to-move",
  fields: {
    parent: {id: "feat-new-parent"}
  }
})

Response:
{
  "id": "sub-to-move",
  "parent": {"id": "feat-new-parent"}
}
```

### Why This Works Better

- `pb_entity_update` with `parent` field is the authoritative way to change hierarchy
- `pb_set_relationship` is designed for relationships, not hierarchy changes
- Update operation guarantees the change is persisted

### Verification

After moving, verify the change:

```
pb_entity_get({id: "sub-to-move"})
→ Confirm parent.id matches new parent

pb_get_relationships({featureId: "feat-new-parent"})
→ Confirm children includes the moved feature
```

---

## Pattern 8: Update Custom Fields (e.g., Platform Area)

### When to Use

When updating custom field values on features or subfeatures (e.g., DRICE scores, Platform Area, Driver, etc.).

### Key Discovery

**Option names work!** The API accepts `{"name": "Desktop"}` format - you don't need to look up option IDs first. This is documented in the [ProductBoard API Field Value Types](https://developer.productboard.com/v2.0.0/reference/field-value-types).

### Steps (Simple Method)

1. **Know Option Names** - Use option names you see in the ProductBoard UI
2. **Update Feature** - Use pb_entity_update with field name and option names

### Complete Example (Recommended)

```
Simple update with option names:
─────────────────────────────────────────────────
pb_entity_update({
  id: "feat-123",
  fields: {
    "Platform Area": [
      {"name": "Desktop"},
      {"name": "Mobile"}
    ]
  }
})

Response:
{
  "message": "feature updated successfully",
  "updatedFields": ["Platform Area"],
  "entity": {
    "id": "feat-123",
    "type": "feature",
    "productboardUrl": "https://app.productboard.com/..."
  }
}
```

### Alternative: Using Option IDs

If you prefer IDs (they're stable even if names change), discover them from existing entities:

```
Step 1: Find option IDs from existing features
─────────────────────────────────────────────────
pb_entity_search({
  entityType: "feature",
  name: "Send"
})

Response (showing Platform Area values):
{
  "customFields": {
    "Platform Area": [
      {"id": "46691e69-...", "name": "Desktop", "color": "pink"},
      {"id": "05c8c7ac-...", "name": "Mobile", "color": "purple"}
    ]
  }
}

Step 2: Update using IDs
─────────────────────────────────────────────────
pb_entity_update({
  id: "feat-123",
  fields: {
    "Platform Area": [
      {"id": "46691e69-..."},
      {"id": "05c8c7ac-..."}
    ]
  }
})
```

### Supported Custom Field Types

| Field Type | Value Format (by name) | Value Format (by ID) |
|------------|------------------------|----------------------|
| Number | `{"Reach": 85}` | N/A |
| Text | `{"Notes": "text value"}` | N/A |
| Single Select | `{"Driver": {"name": "Revenue"}}` | `{"Driver": {"id": "uuid"}}` |
| Multi Select | `{"Platform Area": [{"name": "Desktop"}]}` | `{"Platform Area": [{"id": "uuid"}]}` |
| Member | `{"Designer": {"email": "user@example.com"}}` | `{"Designer": {"id": "uuid"}}` |

### Key Points

- **Option names work** - Use `{"name": "Desktop"}` format for select fields
- Custom field names are case-insensitive ("Platform Area" = "platform area")
- The MCP automatically transforms field names to UUIDs for the API
- IDs are more stable if option names might change
- To clear a field, set it to `null`

---

## Workflow Decision Tree

```
What do you need to do?
│
├─ Find something?
│  ├─ By name/status/owner → pb_entity_search
│  ├─ Specific ID → pb_entity_get
│  └─ All items → pb_entity_list
│
├─ Create something?
│  ├─ Feature → pb_entity_create (type: feature)
│  ├─ Subfeature → pb_entity_create (type: subfeature + parent)
│  └─ Other entity → pb_entity_create
│
├─ Update something?
│  └─ Any entity → pb_entity_update
│
├─ Move to different parent?
│  └─ pb_entity_update with parent: {id: "..."}
│
├─ Connect things?
│  ├─ Feature to objective → pb_create_relationship (type: link)
│  ├─ Set parent → pb_set_relationship (type: parent)
│  └─ Create dependency → pb_create_relationship (type: isBlockedBy)
│
└─ Explore relationships?
   └─ Any entity → pb_get_relationships
```
