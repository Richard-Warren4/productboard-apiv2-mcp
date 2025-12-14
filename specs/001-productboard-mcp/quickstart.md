# Quickstart: ProductBoard MCP Server

**Date**: 2025-12-14
**Status**: Complete

## Overview

This guide covers setting up the ProductBoard MCP Server for use with Claude Desktop and Claude Code.

## Prerequisites

- Node.js 20 LTS or later
- ProductBoard account (Pro plan or higher)
- ProductBoard API access token
- Claude Desktop or Claude Code installed

## Step 1: Get ProductBoard API Token

1. Log in to ProductBoard
2. Go to **Settings** → **Integrations** → **Public API**
3. Click **Generate new token**
4. Copy the token (you won't see it again)

> **Note**: Keep your API token secure. Never commit it to version control.

## Step 2: Install the MCP Server

```bash
# Clone the repository
git clone https://github.com/your-org/productboard-apiv2-mcp.git
cd productboard-apiv2-mcp

# Install dependencies
npm install

# Build the server
npm run build
```

## Step 3: Configure Environment

Create a `.env` file in the project root:

```bash
PRODUCTBOARD_API_TOKEN=your_api_token_here
```

Or set the environment variable directly:

```bash
export PRODUCTBOARD_API_TOKEN=your_api_token_here
```

## Step 4: Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the MCP server configuration:

```json
{
  "mcpServers": {
    "productboard": {
      "command": "node",
      "args": ["/path/to/productboard-apiv2-mcp/dist/index.js"],
      "env": {
        "PRODUCTBOARD_API_TOKEN": "your_api_token_here"
      }
    }
  }
}
```

Restart Claude Desktop to load the new server.

## Step 5: Configure Claude Code

Add a `.mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "productboard": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "PRODUCTBOARD_API_TOKEN": "${PRODUCTBOARD_API_TOKEN}"
      }
    }
  }
}
```

This uses the environment variable from your shell. Alternatively, you can hardcode the token (not recommended for shared projects).

**Note**: After creating/updating `.mcp.json`, restart Claude Code for the MCP server to be detected.

## Step 6: Verify Installation

In Claude Desktop or Claude Code, try these commands:

```
Show me all features for the front-end team
```

```
Get the details for feature "User Authentication"
```

If configured correctly, Claude will use the ProductBoard MCP tools to fetch and display the data.

## Available Tools

Once configured, the following tools are available:

| Tool | Description |
|------|-------------|
| `pb_list_features` | List features with optional filters |
| `pb_get_feature` | Get details for a specific feature |
| `pb_create_feature` | Create a new feature |
| `pb_update_feature` | Update feature properties |
| `pb_search_features` | Search features by name and filters |
| `pb_list_subfeatures` | List subfeatures for a feature |
| `pb_get_subfeature` | Get subfeature details |
| `pb_create_subfeature` | Create a new subfeature |
| `pb_update_subfeature` | Update subfeature properties |
| `pb_get_relationships` | View feature relationships |
| `pb_set_relationship` | Create/update relationships |
| `pb_remove_relationship` | Remove relationships |
| `pb_get_config` | Get workspace configuration |
| `pb_list_components` | List available components |
| `pb_list_products` | List available products |

## Example Workflows

### View Team Backlog

```
Show me all features assigned to the desktop team
```

### Create a Feature

```
Create a new feature called "Dark Mode Support" for the front-end team with status "New"
```

### Update Feature Status

```
Update the "Dark Mode Support" feature to status "In Progress"
```

### Search Features

```
Find all features with "authentication" in the name
```

### Manage Relationships

```
Link the "Dark Mode Support" feature to the "UI Components" component
```

## Troubleshooting

### "Tool not found" error

- Verify the MCP server is running: check Claude Desktop logs
- Confirm the configuration path is correct
- Restart Claude Desktop after config changes

### "Authentication failed" error

- Verify your API token is valid
- Check the token hasn't expired
- Ensure the token has appropriate permissions

### "Rate limit exceeded" error

- The server implements automatic retry with backoff
- If persistent, reduce request frequency
- Check for other integrations using the same token

### Features not showing

- Verify you have access to the workspace
- Check team/status filters are correct
- Try `pb_get_config` to see available options

## Security Notes

- Never commit API tokens to version control
- Use environment variables for token storage
- Rotate tokens periodically
- The API token grants full API access - treat it like a password

## Running Tests

The project includes live integration tests that verify API functionality against the real ProductBoard API.

### Prerequisites for Testing

1. **Set the API token in your shell profile** (e.g., `~/.zshrc` or `~/.bashrc`):

```bash
# Add this line to your shell profile
export PRODUCTBOARD_API_TOKEN="your_api_token_here"

# Then reload your shell profile
source ~/.zshrc  # or source ~/.bashrc
```

2. **Verify the token is available:**

```bash
echo $PRODUCTBOARD_API_TOKEN
# Should print your token (starting with 'eyJ...')
```

### Running the Tests

```bash
# Install dependencies and build
npm install
npm run build

# Run all tests
npm test

# Run live API tests (requires valid API token)
npm run test:live

# Run tests in watch mode during development
npm run test:watch
```

### Test Coverage

The live tests verify:
- Feature listing with correct API v2 response structure
- Feature retrieval by ID
- Pagination support
- Field structure (status, owner, teams array)
- Error handling for non-existent features

> **Note**: Some tests may log warnings if optional API features (like search) are not available in your workspace. This is expected behavior.

## Beta API Notice

ProductBoard API v2 is currently in beta. Response formats may change. The MCP server handles unexpected responses gracefully, but you may encounter occasional issues as the API evolves.

## Next Steps

- See [Claude Desktop Setup](../docs/claude-desktop.md) for advanced configuration
- See [Claude Code Setup](../docs/claude-code.md) for project-level integration
- See [Skills](../docs/skills/productboard.md) for Claude Code slash commands
