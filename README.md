# ProductBoard MCP Server

[![npm version](https://badge.fury.io/js/productboard-apiv2-mcp.svg)](https://www.npmjs.com/package/productboard-apiv2-mcp)

An MCP (Model Context Protocol) server that enables Claude Desktop and Claude Code to interact with ProductBoard API v2 for feature management.

> **Beta API Notice**: This MCP server uses ProductBoard API v2, which is currently in beta status. API behavior may change without notice. Not recommended for production-critical workflows.

## Features

- **Entity Management**: Full CRUD for features, subfeatures, objectives, products, components, releases, and companies
- **Relationship Management**: View, create, and remove relationships between entities
- **Search & Filter**: Search entities with status, owner, parent, and custom field filters
- **Configuration Discovery**: Explore available fields, products, and components
- **Type Safety**: Full TypeScript with strict mode and Zod validation
- **Rate Limiting**: Automatic exponential backoff for API limits

## Quick Start

### Prerequisites

- Node.js 20+
- ProductBoard API token (Settings > Integrations > Public API)

### Installation

**Via npm (recommended):**

```bash
npm install -g productboard-apiv2-mcp
```

**Or use directly with npx:**

```bash
npx productboard-apiv2-mcp
```

**From source:**

```bash
git clone https://github.com/Richard-Warren4/productboard-apiv2-mcp.git
cd productboard-apiv2-mcp
npm install
npm run build
```

### Claude Code Setup

```bash
claude mcp add productboard \
  --env PRODUCTBOARD_API_TOKEN=your-token-here \
  -- npx productboard-apiv2-mcp
```

Then ask Claude: "List my ProductBoard features"

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "productboard": {
      "command": "npx",
      "args": ["productboard-apiv2-mcp"],
      "env": {
        "PRODUCTBOARD_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

Restart Claude Desktop and ask: "List my ProductBoard features"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRODUCTBOARD_API_TOKEN` | Yes | API token from ProductBoard (starts with 'eyJ...') |
| `PRODUCTBOARD_SUBDOMAIN` | No | Your workspace subdomain for correct URLs (default: 'app') |

## Available Tools

### Entity Tools

| Tool | Description |
|------|-------------|
| `pb_entity_create` | Create any entity (feature, subfeature, objective, product, component, release, company) |
| `pb_entity_get` | Get entity details by ID (auto-detects type) |
| `pb_entity_update` | Update entity properties |
| `pb_entity_list` | List entities of a type with pagination |
| `pb_entity_search` | Search entities with filters (status, owner, parent, custom fields) |
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
│   ├── entities.ts    # Generic entity CRUD
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

## API Notes

- **Search Filters**: Use `statuses`, `owners`, `parent` as direct properties (not a `filter` wrapper)
- **Request Bodies**: All mutations require a `data` wrapper: `{ "data": { ... } }`
- **Error Format**: ProductBoard returns `{ "errors": [{ "code", "title", "detail" }] }`

See [CLAUDE.md](CLAUDE.md) for detailed API request formats and development guidelines.

## License

MIT
