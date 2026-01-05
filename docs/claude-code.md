# Claude Code Setup

Configure the ProductBoard MCP server to work with Claude Code CLI.

## Prerequisites

- Node.js 20+ installed
- Claude Code CLI installed
- ProductBoard API token

## Installation

1. Clone and build:

```bash
git clone https://github.com/Richard-Warren4/productboard-apiv2-mcp.git
cd productboard-apiv2-mcp
npm install
npm run build
```

2. Set your API token:

```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export PRODUCTBOARD_API_TOKEN="your-token-here"
```

3. Add MCP server to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "productboard": {
      "command": "node",
      "args": ["/path/to/productboard-apiv2-mcp/dist/index.js"]
    }
  }
}
```

Or add to global Claude Code settings.

## Usage

Once configured, you can use ProductBoard tools directly in Claude Code:

```
> List all my ProductBoard features with status "In Progress"

> Create a new feature called "User Dashboard Redesign"

> Update feature abc123 to status "Released"
```

## Slash Commands

Add the included slash commands to your project:

```bash
cp -r /path/to/productboard-apiv2-mcp/.claude/commands/*.md .claude/commands/
```

Then use:
- `/pb-features` - List features
- `/pb-detail <id>` - Get feature details

## Available Tools

All ProductBoard tools are available via Claude Code:

- `pb_list_features` - List and filter features
- `pb_get_feature` - Get details by ID/name
- `pb_create_feature` - Create features
- `pb_update_feature` - Update features
- `pb_search_features` - Search with filters
- `pb_get_relationships` - View relationships
- `pb_set_relationship` - Create relationships
- `pb_remove_relationship` - Delete relationships
