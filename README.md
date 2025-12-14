# ProductBoard MCP Server

An MCP (Model Context Protocol) server that enables Claude Desktop and Claude Code to interact with ProductBoard API v2 for feature management.

> **Beta API Notice**: This MCP server uses ProductBoard API v2, which is currently in beta status. API behavior may change without notice. Not recommended for production-critical workflows.

## Features

- **Feature Management**: List, view, create, update, and search features
- **Subfeature Support**: Full CRUD operations for subfeatures
- **Relationship Management**: View, create, and remove relationships between entities
- **Configuration Discovery**: Explore available fields, products, and components
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

## Available Tools

| Tool | Description |
|------|-------------|
| `pb_list_features` | List features with team/status/component filtering |
| `pb_get_feature` | Get feature details by ID or name |
| `pb_create_feature` | Create a new feature |
| `pb_update_feature` | Update feature properties |
| `pb_search_features` | Search features with advanced filters |
| `pb_list_subfeatures` | List subfeatures for a parent feature |
| `pb_get_subfeature` | Get subfeature details |
| `pb_create_subfeature` | Create a new subfeature |
| `pb_update_subfeature` | Update subfeature properties |
| `pb_get_relationships` | View feature relationships |
| `pb_set_relationship` | Create/update a relationship |
| `pb_remove_relationship` | Remove a relationship |
| `pb_get_config` | Get available fields and options |
| `pb_list_products` | List available products |
| `pb_list_components` | List available components |

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
│   ├── features.ts    # Feature CRUD
│   ├── subfeatures.ts # Subfeature CRUD
│   ├── search.ts      # Search functionality
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
