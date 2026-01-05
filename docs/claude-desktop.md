# Claude Desktop Setup

Configure the ProductBoard MCP server to work with Claude Desktop.

## Prerequisites

- Node.js 20+ installed
- ProductBoard API token (from Settings > Integrations > Public API)

## Installation

1. Clone and build the MCP server:

```bash
git clone https://github.com/Richard-Warren4/productboard-apiv2-mcp.git
cd productboard-apiv2-mcp
npm install
npm run build
```

2. Configure Claude Desktop by editing your config file:

**Location**:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration**:

```json
{
  "mcpServers": {
    "productboard": {
      "command": "node",
      "args": ["/path/to/productboard-apiv2-mcp/dist/index.js"],
      "env": {
        "PRODUCTBOARD_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

3. Restart Claude Desktop

## Verification

After restart, ask Claude:

> "List my ProductBoard features"

You should see a list of features from your ProductBoard workspace.

## Available Tools

| Tool | Description |
|------|-------------|
| `pb_list_features` | List features with filtering |
| `pb_get_feature` | Get feature details by ID or name |
| `pb_create_feature` | Create a new feature |
| `pb_update_feature` | Update an existing feature |
| `pb_search_features` | Search features with filters |
| `pb_get_relationships` | View feature relationships |
| `pb_set_relationship` | Set a relationship |
| `pb_remove_relationship` | Remove a relationship |

## Troubleshooting

**"PRODUCTBOARD_API_TOKEN not set"**: Ensure the token is in the `env` section of the config.

**Tools not appearing**: Check Claude Desktop logs and restart the application.

**API errors**: Verify your token has the necessary permissions in ProductBoard.
