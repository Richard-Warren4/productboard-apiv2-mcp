# productboard-apiv2-mcp Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-14

## Active Technologies
- N/A (API client only) (002-fix-search-stale-results)

- TypeScript 5.x with Node.js 20 LTS + @modelcontextprotocol/sdk, zod, native fetch

## Project Structure

```text
src/
  client/       # ProductBoard API client (api.ts, types.ts, errors.ts)
  tools/        # MCP tool implementations (features.ts)
  schemas/      # Zod validation schemas (inputs.ts, responses.ts)
  utils/        # Helper utilities (pagination.ts, richtext.ts)
  index.ts      # MCP server entry point
dist/           # Compiled output (run `npm run build`)
specs/          # Design documentation
```

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
```

## Testing

Live integration tests require the `PRODUCTBOARD_API_TOKEN` environment variable.

**Set up for testing:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export PRODUCTBOARD_API_TOKEN="your_api_token_here"
source ~/.zshrc

# Verify token is available
echo $PRODUCTBOARD_API_TOKEN  # Should start with 'eyJ...'

# Run live tests
npm run test:live
```

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
```json
{ "data": { "type": "feature", "name": "Search text", "statuses": [{"name": "Released"}], "owners": [{"email": "..."}], "parent": {"id": "..."} } }
```
**Note**: REQUIRES `data` wrapper. Filters (`name`, `statuses`, `owners`, `parent`) are direct properties, NOT a `filter` wrapper.
The official docs show a `filter` property but that does NOT work - use the format above.

**Name Search** (verified 2025-12-14): The `name` parameter enables server-side text filtering with partial, case-insensitive matching.

### Set Relationship (PUT /entities/{id}/relationships/{type})
```json
{ "data": { "target": { "id": "target-id" } } }
```

### Delete Relationship
```
DELETE /entities/{id}/relationships/{type}/{targetId}
```
Path includes `targetId` - no request body.

## Recent Changes
- 002-fix-search-stale-results: Added TypeScript 5.x with Node.js 20 LTS + @modelcontextprotocol/sdk, zod, native fetch

- 2025-12-14: Fixed search filters - use `statuses`, `owners`, `parent` as direct properties (NOT `filter` wrapper)
- 2025-12-14: Fixed error handling to parse ProductBoard's `{ errors: [...] }` format

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
