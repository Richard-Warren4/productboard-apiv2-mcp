# productboard-apiv2-mcp Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-09

## Active Technologies
- N/A (API client only) (002-fix-search-stale-results)
- TypeScript 5.x with Node.js 20 LTS + @modelcontextprotocol/sdk, zod (runtime validation), native fetch (003-dynamic-entity-config)
- In-memory session cache (no persistence) (003-dynamic-entity-config)
- TypeScript 5.4+ with Node.js 20 LTS + @modelcontextprotocol/sdk ^1.0.0, zod ^3.23.0, native fetch (004-generic-entity-support)
- In-memory session cache for entity configuration (no persistence) (004-generic-entity-support)
- In-memory session cache for UUID→name mapping (no persistence) (006-custom-fields-support)
- Markdown + JSON (documentation, no code) + Claude Code skill loading system (assumed compatible with n8n-skills format) (007-pb-skills-poc)
- N/A (static files) (007-pb-skills-poc)

- TypeScript 5.x with Node.js 20 LTS + @modelcontextprotocol/sdk, zod, native fetch

## Project Structure

```text
src/
  client/       # ProductBoard API client (api.ts, types.ts, errors.ts)
  tools/        # MCP tool implementations (entities.ts, relationships.ts, config.ts)
  schemas/      # Zod validation schemas (inputs.ts, responses.ts)
  utils/        # Helper utilities (pagination.ts, richtext.ts, validation.ts)
  index.ts      # MCP server entry point
dist/           # Compiled output (run `npm run build`)
specs/          # Design documentation
```

## MCP Tools Available (16 tools)

### Entity Tools (7 tools)

| Tool | Description |
|------|-------------|
| `pb_entity_create` | Create any entity (objective, product, component, feature, subfeature, initiative, keyResult, releaseGroup, release, company) |
| `pb_entity_get` | Get entity by ID (auto-detects type) |
| `pb_entity_update` | Update any entity (partial update supported) |
| `pb_entity_list` | List entities of one or more types with pagination (`entityType` for single, `entityTypes` for multi-type via `type[]`) |
| `pb_entity_search` | Search entities (feature, subfeature, objective, initiative, keyResult) with filters and custom field filtering |
| `pb_entity_types` | List available entity types and field configurations |
| `pb_refresh_config` | Force refresh of cached configuration |

### Relationship Tools (4 tools)

| Tool | Description |
|------|-------------|
| `pb_get_relationships` | Get entity relationships |
| `pb_create_relationship` | Create a relationship (link features to objectives, create dependencies) |
| `pb_set_relationship` | Set/replace a single-target relationship |
| `pb_remove_relationship` | Remove a relationship |

### Configuration Tools (3 tools)

| Tool | Description |
|------|-------------|
| `pb_get_config` | Get entity field configuration |
| `pb_list_products` | List products |
| `pb_list_components` | List components |

### Jira Integration Tools (2 tools)

Read-only. Reads Productboard's native Jira integration link table directly — not a
custom field. See "Jira Integrations" in `.specify/memory/productboard-v2api-ref-urls.md`
for the verified endpoint shapes.

| Tool | Description |
|------|-------------|
| `pb_list_jira_integrations` | List Jira integrations configured in the workspace (a workspace can have more than one) |
| `pb_get_jira_links` | Get every Productboard feature <-> Jira issue link, across all integrations; join `featureId` against `pb_entity_search`/`pb_entity_get` results |

### Migration from Type-Specific Tools

The following type-specific tools have been consolidated into generic entity tools:

| Old Tool | New Tool |
|----------|----------|
| `pb_list_features` | `pb_entity_list({ entityType: "feature" })` |
| `pb_get_feature` | `pb_entity_get({ id })` |
| `pb_create_feature` | `pb_entity_create({ entityType: "feature", fields })` |
| `pb_update_feature` | `pb_entity_update({ id, fields })` |
| `pb_search_features` | `pb_entity_search({ entityType: "feature", ... })` |
| `pb_list_subfeatures` | `pb_entity_search({ entityType: "subfeature", parent: { id } })` |
| `pb_get_subfeature` | `pb_entity_get({ id })` |
| `pb_create_subfeature` | `pb_entity_create({ entityType: "subfeature", fields: { parent: { id } } })` |
| `pb_update_subfeature` | `pb_entity_update({ id, fields })` |

## Entity Types

ProductBoard API v2 (GA as of 2026; v1 is deprecated and sunsets 2026-07-08) supports 11 entity types:

| Type | Creatable | Searchable |
|------|-----------|------------|
| objective | Yes | Yes |
| product | Yes | No |
| component | Yes | No |
| feature | Yes | Yes |
| subfeature | Yes | Yes |
| initiative | Yes | Yes |
| keyResult | Yes | Yes |
| releaseGroup | Yes | No |
| release | Yes | No |
| company | Yes | No |
| user | **No** (read-only) | No |

`initiative` and `keyResult` were added to the official surface as part of the GA release (March 2026 changelog). Earlier notes in this repo claimed `initiative` was unsupported — that is no longer true.

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

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `PRODUCTBOARD_API_TOKEN` | Yes | API token (starts with 'eyJ...') |
| `PRODUCTBOARD_SUBDOMAIN` | No | Workspace subdomain for URLs (default: 'app'). Set to your workspace name (e.g., 'hivenet') for correct ProductBoard links. |

**Set up for testing:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export PRODUCTBOARD_API_TOKEN="your_api_token_here"
export PRODUCTBOARD_SUBDOMAIN="hivenet"  # Your workspace subdomain
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
  --env PRODUCTBOARD_SUBDOMAIN=hivenet \
  -- node /path/to/dist/index.js

# Verify connection
/mcp
```

**Quick Smoke Test (minimum 5 tests):**
1. `pb_get_config(entityType: "feature")` - Single entity config works
2. `pb_entity_search({ entityType: "feature", statuses: [{name: "In progress"}] })` - Search with exact status
3. `pb_entity_types()` - Lists all entity types
4. `pb_get_relationships(featureId: "[id]")` - Gets relationships
5. `pb_create_relationship(entityId, "link", targetId)` - Creates link

**Full Test Checklist:** See `specs/mcp-test-checklist.md` for comprehensive test scenarios.

**Known Edge Cases:**
- Status names are **case-sensitive**: "In progress" works, "In Progress" fails
- Config for single entity type returns object, not array
- `pageSize` parameter is not supported (API returns 100 items/page)
- Entity types per OpenAPI: product, component, feature, subfeature, initiative, objective, keyResult, release, releaseGroup
- `GET /entities` accepts `type` as a single value (`?type=feature`) or as an array via repeated `type[]` params (`?type[]=feature&type[]=initiative`)

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

**CRITICAL** (re-verified live 2026-07-30 — the API changed):
- The request body now REQUIRES the structured `filter` wrapper from the official docs/OpenAPI spec
- The old flat-properties body (`{"data": {"type": ..., "statuses": ...}}`) is rejected with
  `Property is not allowed` validation errors
- `pageSize` query parameter is NOT supported - API always returns 100 items per page

**Body format**: `{ "data": { "filter": { ... }, "return": { "fields": [...] } } }`

**Supported filter properties**:
| Property | Type | Description |
|----------|------|-------------|
| `type` | array | Entity types to search, e.g. `["feature"]`. Required for custom-field filters. |
| `id` | array | Filter by specific entity IDs |
| `fields.name` | string | Text search on name |
| `fields.archived` | boolean | Filter by archived state |
| `fields.status` | array | `[{"name": "In Progress"}, {"name": "At Risk"}]` (note: singular `status`) |
| `fields.owner` | array | `[{"email": "john@doe.com"}]` or `[{"id": "..."}]` (singular `owner`) |
| `fields.teams` | array | Native workspace teams, `[{"name": "H4C Mobile"}]` or by `id`. OR semantics. |
| `fields.<fieldId>` | object | Custom field filter by field UUID — see below |
| `relationships.parent` | array | `[{"id": "uuid"}]` |
| `createdAt`/`updatedAt` | object | `{"from": ISO, "to": ISO}` date range |

**Pagination**: Use `pageCursor` query parameter for pagination. API returns 100 items per page.

**Example - Search features by status, owner and parent**:
```json
{
  "data": {
    "filter": {
      "type": ["feature"],
      "fields": {
        "archived": false,
        "status": [{"name": "Upcoming"}],
        "owner": [{"email": "john@doe.com"}, {"email": "jane@doe.com"}]
      },
      "relationships": {"parent": [{"id": "318de52f-4e38-4c94-a550-a0d47a1f212e"}]}
    },
    "return": {"fields": ["name", "status", "owner"]}
  }
}
```

### Team Filtering (Server-Side)

`pb_entity_search` passes `teams` server-side via `filter.fields.teams`:

| Parameter | Type | Description |
|-----------|------|-------------|
| `teams` | array | Native workspace team names. Matches entities in **any** of them (OR). Unknown names get a 422 `referenceNotFound` from the API. |
| `hasTeam` | boolean | Client-side: `true` = has at least one team, `false` = none. Triggers the multi-page fetch. Useful for finding coverage gaps. |

Note: native workspace teams (Settings → Teams) are distinct from any team-like custom field
(e.g. a multi-select named "Eng Team") — filter the latter with `customFieldFilters`.

```json
{
  "entityType": "feature",
  "teams": ["H4C Mobile", "H4C Desktop"],
  "statuses": [{"name": "In Progress"}]
}
```

If a client-side filter triggers the multi-page fetch and the 50-page safety limit is hit,
`filteringInfo.truncated` is `true` with a `warning` — results are incomplete and the search
needs narrowing. Never report a truncated sweep as a full backlog.

### Custom Field Filtering (Client-Side)

Custom fields (e.g., DRICE scores: Reach, Impact, Confidence, Effort) are returned in entity responses under `customFields` with human-readable field names.

**Custom fields in responses**:
```json
{
  "id": "feature-uuid",
  "name": "My Feature",
  "customFields": {
    "Reach": 75,
    "Impact": 50,
    "Confidence": 80,
    "Effort": 30,
    "Priority": { "id": "opt-123", "name": "High" }
  }
}
```

**Filtering by custom fields** (via `pb_entity_search`):
```json
{
  "entityType": "feature",
  "customFieldFilters": [
    { "field": "Reach", "operator": ">=", "value": 50 },
    { "field": "Priority", "operator": "=", "value": "High" }
  ]
}
```

**Supported operators**:
| Operator | Valid For | Description | Where it runs |
|----------|-----------|-------------|---------------|
| `=` | All types | Equal to value | **Server-side** for single-select (`{name}`), multi-select (`{any: [{name}]}`), number (`{eq}`) and date (`{eq}`); client-side for text/boolean |
| `!=` | All types | Not equal to value | Client-side |
| `<` | Number only | Less than | Client-side |
| `<=` | Number only | Less than or equal | Client-side |
| `>` | Number only | Greater than | Client-side |
| `>=` | Number only | Greater than or equal | Client-side |

The API also supports `{all: [...]}` (AND) on multi-selects, `{contains}` on text and
`{isSet}` presence checks — the raw formats are documented in the OpenAPI spec
(`EntitySearchCustomFieldFilterValue`) if the tool ever needs to expose them.

**Important notes**:
- Field names are **case-insensitive** (e.g., "reach" matches "Reach")
- Select fields match by **option name** (case-insensitive client-side; the server match is exact)
- Server-side filters are translated to `filter.fields.<fieldId>` in the search body
- Only filters with a client-side residue (or `hasTeam`) trigger the multi-page fetch (up to 50 pages/5000 results)
- When the multi-page fetch runs, the response includes `filteringInfo` with `totalBeforeFiltering`, `totalAfterFiltering`, `pagesFetched`
- Invalid field names return error with "Did you mean?" suggestions

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
- 007-pb-skills-poc: Added Markdown + JSON (documentation, no code) + Claude Code skill loading system (assumed compatible with n8n-skills format)
- 006-custom-fields-support: Added TypeScript 5.4+ with Node.js 20 LTS + @modelcontextprotocol/sdk ^1.0.0, zod ^3.23.0, native fetch
- 005-consolidate-tools: Added TypeScript 5.4+ with Node.js 20 LTS + @modelcontextprotocol/sdk ^1.0.0, zod ^3.23.0, native fetch


<!-- MANUAL ADDITIONS START -->

## Development Principles

### API Documentation Reference
**ALWAYS** use `.specify/memory/productboard-v2api-ref-urls.md` to find correct ProductBoard API v2 documentation URLs. Do not guess or search for API docs - use the reference file which contains verified URLs.

<!-- MANUAL ADDITIONS END -->
