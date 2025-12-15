# productboard-apiv2-mcp Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-15

## Active Technologies
- N/A (API client only) (002-fix-search-stale-results)
- TypeScript 5.x with Node.js 20 LTS + @modelcontextprotocol/sdk, zod (runtime validation), native fetch (003-dynamic-entity-config)
- In-memory session cache (no persistence) (003-dynamic-entity-config)
- TypeScript 5.4+ with Node.js 20 LTS + @modelcontextprotocol/sdk ^1.0.0, zod ^3.23.0, native fetch (004-generic-entity-support)
- In-memory session cache for entity configuration (no persistence) (004-generic-entity-support)

- TypeScript 5.x with Node.js 20 LTS + @modelcontextprotocol/sdk, zod, native fetch

## Project Structure

```text
src/
  client/       # ProductBoard API client (api.ts, types.ts, errors.ts)
  tools/        # MCP tool implementations (features.ts, entities.ts)
  schemas/      # Zod validation schemas (inputs.ts, responses.ts)
  utils/        # Helper utilities (pagination.ts, richtext.ts, validation.ts)
  index.ts      # MCP server entry point
dist/           # Compiled output (run `npm run build`)
specs/          # Design documentation
```

## MCP Tools Available

### Generic Entity Tools (NEW - 004-generic-entity-support)

| Tool | Description |
|------|-------------|
| `pb_entity_create` | Create any entity (objective, product, component, feature, subfeature, releaseGroup, release, company) |
| `pb_entity_get` | Get entity by ID (auto-detects type) |
| `pb_entity_update` | Update any entity (partial update supported) |
| `pb_entity_list` | List entities of a type with pagination |
| `pb_entity_search` | Search entities (feature, subfeature, objective) |
| `pb_entity_types` | List available entity types and field configurations |
| `pb_refresh_config` | Force refresh of cached configuration |

### Feature-Specific Tools

| Tool | Description |
|------|-------------|
| `pb_list_features` | List features with filters |
| `pb_get_feature` | Get feature by ID or name |
| `pb_create_feature` | Create a new feature |
| `pb_update_feature` | Update feature properties |
| `pb_search_features` | Search features with filters |

### Other Tools

| Tool | Description |
|------|-------------|
| `pb_list_subfeatures` | List subfeatures for a feature |
| `pb_create_subfeature` | Create a subfeature |
| `pb_update_subfeature` | Update subfeature properties |
| `pb_get_config` | Get entity field configuration |
| `pb_list_products` | List products |
| `pb_list_components` | List components |
| `pb_get_relationships` | Get entity relationships |
| `pb_create_relationship` | **Create a relationship (link features to objectives, create dependencies)** |
| `pb_set_relationship` | Set/replace a single-target relationship |
| `pb_remove_relationship` | Remove a relationship |

## Entity Types

ProductBoard API v2 supports 9 entity types (verified 2025-12-15):

| Type | Creatable | Searchable |
|------|-----------|------------|
| objective | Yes | Yes |
| product | Yes | No |
| component | Yes | No |
| feature | Yes | Yes |
| subfeature | Yes | Yes |
| releaseGroup | Yes | No |
| release | Yes | No |
| company | Yes | No |
| user | **No** (read-only) | No |

**NOTE**: `initiative` is NOT supported by ProductBoard API v2 (verified 2025-12-15)

## Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode compilation
npm run lint       # Run ESLint
npm run lint:fix   # Auto-fix linting issues
npm start          # Run the MCP server (requires PRODUCTBOARD_API_TOKEN)
npm test           # Run all tests
npm run test:live  # Run live API integration tests
npm run test:watch # Run tests in watch mode
npm run test:mcp   # Run MCP integration smoke tests
```

## Testing

### Automated Tests

Live integration tests require the `PRODUCTBOARD_API_TOKEN` environment variable.

**Set up for testing:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export PRODUCTBOARD_API_TOKEN="your_api_token_here"
source ~/.zshrc

# Verify token is available
echo $PRODUCTBOARD_API_TOKEN  # Should start with 'eyJ...'

# Run all tests
npm test

# Run live API tests only
npm run test:live
```

### MCP Integration Testing (REQUIRED)

**Unit tests alone are NOT sufficient.** Before merging any changes, you MUST test the MCP by actually using it from Claude Code or another MCP client.

**Quick Setup:**
```bash
# Build the project
npm run build

# Add to Claude Code (terminal)
claude mcp add --transport stdio productboard \
  --env PRODUCTBOARD_API_TOKEN=$PRODUCTBOARD_API_TOKEN \
  -- node /path/to/dist/index.js

# Verify connection
/mcp
```

**Quick Smoke Test (minimum 5 tests):**
1. `pb_get_config(entityType: "feature")` - Single entity config works
2. `pb_search_features(statusNames: ["In progress"])` - Search with exact status
3. `pb_entity_types()` - Lists all entity types
4. `pb_get_relationships(featureId: "[id]")` - Gets relationships
5. `pb_create_relationship(entityId, "link", targetId)` - Creates link

**Full Test Checklist:** See `specs/mcp-test-checklist.md` for comprehensive test scenarios.

**Known Edge Cases:**
- Status names are **case-sensitive**: "In progress" works, "In Progress" fails
- Config for single entity type returns object, not array
- `initiative` entity type is NOT supported by API v2
- `pageSize` parameter is not supported (API returns 100 items/page)

## Code Style

TypeScript 5.x with Node.js 20 LTS: Follow standard conventions

## API v2 Response Structure

ProductBoard API v2 nests entity data under a `fields` object:

```typescript
// API Response structure
{
  id: string;
  type: "feature";
  fields: {
    name: string;
    status?: { id: string; name: string };
    owner?: { id: string; email: string };
    teams?: Array<{ id: string; name: string }>;
    // ...
  };
  relationships?: { data: Array<{ type: string; target: EntityReference }> };
  createdAt: string;
  updatedAt: string;
  links: { self: string };
}
```

## API v2 Request Body Structures

**IMPORTANT**: All request body structures have been verified against official ProductBoard documentation.
See `.specify/memory/constitution.md` for the authoritative reference.

### Create Entity (POST /entities)
```json
{ "data": { "type": "feature", "fields": {...}, "relationships": [...] } }
```

### Update Entity (PATCH /entities/{id})
```json
{ "data": { "fields": {...} } }
```

### Search Entities (POST /entities/search)

**CRITICAL** (verified 2025-12-15):
- The official ProductBoard docs show a `filter` property but that does NOT work
- All filters must be direct properties under `data`
- `pageSize` query parameter is NOT supported - API always returns 100 items per page
- `initiative` entity type is NOT supported by the search endpoint

**Supported filter parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | **Required**. Entity type to search (feature, subfeature, objective) |
| `name` | string | Text search (partial, case-insensitive) |
| `statuses` | array | Filter by status: `[{"name": "In Progress"}, {"name": "At Risk"}]` |
| `owners` | array | Filter by owner: `[{"email": "john@doe.com"}]` or `[{"id": "..."}]` |
| `parent` | object | Filter by parent: `{"id": "uuid"}` |
| `archived` | boolean | Filter by archived state |
| `ids` | array | Filter by specific entity IDs: `["uuid1", "uuid2"]` |

**Pagination**: Use `pageCursor` query parameter for pagination. API returns 100 items per page.

**Example - Search features by status and owner**:
```json
{
  "data": {
    "type": "feature",
    "statuses": [{"name": "Upcoming"}],
    "owners": [{"email": "john@doe.com"}, {"email": "jane@doe.com"}],
    "parent": {"id": "318de52f-4e38-4c94-a550-a0d47a1f212e"}
  }
}
```

**Note**: Team filtering is NOT supported by the search endpoint. Use client-side filtering after fetching results.

### Create Relationship (POST /entities/{id}/relationships)

**Use this to link features to objectives, create dependencies, etc.**

```json
{ "data": { "target": { "id": "target-id" }, "type": "link" } }
```

**Supported relationship types**:
| Type | Description |
|------|-------------|
| `parent` | Target is parent of source entity |
| `child` | Target is child of source entity |
| `link` | Non-hierarchical connection (e.g., feature to objective) |
| `isBlockedBy` | Source is blocked by target |
| `isBlocking` | Source blocks target |

**Example - Link a feature to an objective**:
```bash
curl -X POST "https://api.productboard.com/v2/entities/{featureId}/relationships" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": {"target": {"id": "objective-uuid"}, "type": "link"}}'
```

### Set/Replace Relationship (PUT /entities/{id}/relationships/{type})

Use this for single-target relationships like `parent`:
```json
{ "data": { "target": { "id": "target-id" } } }
```

### Delete Relationship
```
DELETE /entities/{id}/relationships/{type}/{targetId}
```
Path includes `targetId` - no request body.

## Recent Changes
- 004-generic-entity-support: Added TypeScript 5.4+ with Node.js 20 LTS + @modelcontextprotocol/sdk ^1.0.0, zod ^3.23.0, native fetch
- 003-dynamic-entity-config: Added TypeScript 5.x with Node.js 20 LTS + @modelcontextprotocol/sdk, zod (runtime validation), native fetch
- 002-fix-search-stale-results: Added TypeScript 5.x with Node.js 20 LTS + @modelcontextprotocol/sdk, zod, native fetch


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
