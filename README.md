# ProductBoard MCP Server

An MCP (Model Context Protocol) server that enables Claude Desktop and Claude Code to interact with ProductBoard API v2 for feature management.

> **Beta API Notice**: This MCP server uses ProductBoard API v2, which is currently in beta status. API behavior may change without notice. Not recommended for production-critical workflows.

## Features

- **Generic Entity Support**: Unified CRUD for all ProductBoard entity types (features, subfeatures, objectives, products, components, releases, companies)
- **Relationship Management**: View, create, and remove relationships between entities
- **Configuration Discovery**: Explore available fields, entity types, products, and components
- **Type Safety**: Full TypeScript with strict mode and Zod validation
- **Rate Limiting**: Automatic exponential backoff for API limits

## Quick Start

### Prerequisites

- Node.js 20+
- ProductBoard API token (Settings > Integrations > Public API)

### Installation

```bash
git clone https://github.com/Richard-Warren4/productboard-apiv2-mcp.git
cd productboard-apiv2-mcp
npm install
npm run build
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "productboard": {
      "command": "node",
      "args": ["/path/to/productboard-apiv2-mcp/dist/index.js"],
      "env": {
        "PRODUCTBOARD_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

Restart Claude Desktop and ask: "List my ProductBoard features"

## Available Tools (14 tools)

### Entity Tools

| Tool | Description |
|------|-------------|
| `pb_entity_create` | Create any entity (feature, subfeature, objective, product, component, etc.) |
| `pb_entity_get` | Get entity by ID (auto-detects type) |
| `pb_entity_update` | Update any entity (partial update supported) |
| `pb_entity_list` | List entities of a type with pagination |
| `pb_entity_search` | Search entities with filters (name, status, owner, parent) |
| `pb_entity_types` | List available entity types and field configurations |
| `pb_refresh_config` | Force refresh of cached configuration |

### Relationship Tools

| Tool | Description |
|------|-------------|
| `pb_get_relationships` | Get entity relationships |
| `pb_create_relationship` | Create a relationship (link features to objectives, dependencies) |
| `pb_set_relationship` | Set/replace a single-target relationship |
| `pb_remove_relationship` | Remove a relationship |

### Configuration Tools

| Tool | Description |
|------|-------------|
| `pb_get_config` | Get entity field configuration |
| `pb_list_products` | List products |
| `pb_list_components` | List components |

## Development

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode
npm run lint       # Run ESLint
npm test           # Run unit tests
npm run test:live  # Run live API tests (requires token)
```

### Project Structure

```
src/
├── index.ts           # MCP server entry point
├── tools/             # MCP tool implementations
│   ├── entities.ts    # Generic entity CRUD & search
│   ├── relationships.ts # Relationship management
│   └── config.ts      # Configuration discovery
├── client/            # ProductBoard API client
│   ├── api.ts         # HTTP client
│   ├── types.ts       # TypeScript types
│   └── errors.ts      # Error handling
├── schemas/           # Zod validation schemas
└── utils/             # Helper utilities
```

## Documentation

- [Claude Desktop Setup](docs/claude-desktop.md)
- [Claude Code Setup](docs/claude-code.md)
- [Workflow Skills](docs/skills/productboard.md)

## API Notes

- **Search Filters**: Use `statuses`, `owners`, `parent` as direct properties (not a `filter` wrapper)
- **Request Bodies**: All mutations require a `data` wrapper: `{ "data": { ... } }`
- **Error Format**: ProductBoard returns `{ "errors": [{ "code", "title", "detail" }] }`

See [constitution.md](.specify/memory/constitution.md) for detailed API request formats.

## License

MIT
