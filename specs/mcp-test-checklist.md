# MCP Integration Test Checklist

This checklist MUST be executed before merging any changes to the ProductBoard MCP server.
Tests are run by actually invoking MCP tools from Claude Code or another MCP client.

## Prerequisites

1. Build the project: `npm run build`
2. Ensure `PRODUCTBOARD_API_TOKEN` is set in your environment
3. Configure the MCP in Claude Code:
   ```bash
   claude mcp add --transport stdio productboard \
     --env PRODUCTBOARD_API_TOKEN=$PRODUCTBOARD_API_TOKEN \
     -- node /path/to/productboard-apiv2-mcp/dist/index.js
   ```
4. Verify MCP is connected: `/mcp` in Claude Code

## Test Scenarios

### 1. Configuration Operations

| Test | User Prompt | Expected Result |
|------|-------------|-----------------|
| 1.1 | "Get ProductBoard configuration for features" | Returns feature config with fields, no errors |
| 1.2 | "Get ProductBoard configuration for all entity types" | Returns array of all entity type configs |
| 1.3 | "What entity types are available in ProductBoard?" | Lists all 9 entity types with field counts |
| 1.4 | "Refresh the ProductBoard configuration cache" | Successfully clears and refreshes cache |

**Edge Cases Discovered**:
- Single entity type returns object, not array (fixed 2025-12-15)

### 2. Feature Operations (via Generic Entity Tools)

| Test | User Prompt | Expected Result |
|------|-------------|-----------------|
| 2.1 | "List features in ProductBoard" | Uses `pb_entity_list(entityType: "feature")`, returns paginated list |
| 2.2 | "Get feature by ID [use valid ID]" | Uses `pb_entity_get(id)`, returns feature with all fields |
| 2.3 | "Search for features with status 'In progress'" | Uses `pb_entity_search`, returns matching features (note: case-sensitive!) |
| 2.4 | "Search for features owned by [email]" | Uses `pb_entity_search(owners)`, returns features owned by that user |
| 2.5 | "Create a test feature named 'MCP Test Feature'" | Uses `pb_entity_create`, creates feature, returns ID |
| 2.6 | "Update feature [ID] status to 'Candidate'" | Uses `pb_entity_update`, updates feature successfully |

**Edge Cases Discovered**:
- Status names are case-sensitive: "In progress" works, "In Progress" fails (discovered 2025-12-15)
- Status name must match exactly what's configured in workspace

### 3. Entity Operations (Generic)

| Test | User Prompt | Expected Result |
|------|-------------|-----------------|
| 3.1 | "List all objectives in ProductBoard" | Returns objectives |
| 3.2 | "Create an objective named 'MCP Test Objective'" | Creates objective, returns ID |
| 3.3 | "Get entity [ID] from ProductBoard" | Returns entity with type auto-detected |
| 3.4 | "Search for objectives" | Returns searchable objectives |
| 3.5 | "List products in ProductBoard" | Returns products |
| 3.6 | "List components in ProductBoard" | Returns components |

**Edge Cases Discovered**:
- `initiative` entity type is NOT supported by API v2 (verified 2025-12-15)
- `pageSize` parameter is not supported, API returns 100 items per page

### 4. Relationship Operations

| Test | User Prompt | Expected Result |
|------|-------------|-----------------|
| 4.1 | "Get relationships for feature [ID]" | Returns parent, child, link relationships |
| 4.2 | "Link feature [ID] to objective [ID]" | Creates 'link' relationship successfully |
| 4.3 | "What objectives is feature [ID] linked to?" | Shows link relationships to objectives |
| 4.4 | "Remove the link between feature [ID] and objective [ID]" | Removes relationship |

**Edge Cases Discovered**:
- Use POST for creating relationships (not PUT)
- PUT only works for single-target relationships like 'parent'
- 'link' type is for non-hierarchical connections (feature to objective)

### 5. Subfeature Operations (via Generic Entity Tools)

| Test | User Prompt | Expected Result |
|------|-------------|-----------------|
| 5.1 | "List subfeatures for feature [ID]" | Uses `pb_entity_search(entityType: "subfeature", parent: {id})`, returns subfeatures |
| 5.2 | "Create a subfeature under feature [ID]" | Uses `pb_entity_create(entityType: "subfeature", fields: {parent: {id}})` |
| 5.3 | "Update subfeature [ID] description" | Uses `pb_entity_update(id, fields)` |

### 6. Error Handling

| Test | User Prompt | Expected Result |
|------|-------------|-----------------|
| 6.1 | "Get feature with ID 'invalid-uuid'" | Returns clear error: entity not found |
| 6.2 | "Search features with status 'NonExistentStatus'" | Returns error: status not found |
| 6.3 | "Create a feature without a name" | Returns validation error |
| 6.4 | "Create a feature without a parent" | May error if workspace requires parent |

### 7. Pagination

| Test | User Prompt | Expected Result |
|------|-------------|-----------------|
| 7.1 | "List all features (there are more than 100)" | Returns first page with cursor |
| 7.2 | "Get the next page of features" | Uses cursor to get next page |

## Recording Test Results

When executing this checklist, record:
- Date of test execution
- Which tests passed/failed
- Any new edge cases discovered
- Build/commit hash tested

### Test Execution Log

| Date | Tester | Commit | Result | Notes |
|------|--------|--------|--------|-------|
| 2025-12-15 | Claude | 0ea175a | PASS | Fixed config single entity type bug |
| 2025-12-15 | Claude | a608c4d | PASS | 10/10 tests pass, added npm run test:mcp script |

## Adding New Test Cases

When a bug is discovered in production:
1. Add the scenario to the appropriate section above
2. Add it to "Edge Cases Discovered" with the date
3. Ensure the fix is tested with the new scenario
4. Update CLAUDE.md if it's an API limitation

## Quick Smoke Test

For rapid validation, run the automated MCP test script:

```bash
npm run test:mcp
```

This runs 10 automated tests covering:
1. `pb_get_config(entityType: "feature")` - Config works for single type
2. `pb_entity_search(entityType: "feature", statuses: [{name: "In progress"}])` - Search with exact status name
3. `pb_entity_types()` - Lists all entity types
4. `pb_get_relationships(featureId)` - Gets relationships
5. `pb_entity_list(entityType: "feature")` - Lists features with pagination
6. Error handling for invalid status names
7. Case sensitivity verification
8. `pb_list_products()` - Lists products
9. `pb_entity_search(entityType: "objective")` - Searches objectives
10. `pb_entity_get(id)` - Auto-detects entity type

If all 10 pass, the core functionality is working.
