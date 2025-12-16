#!/usr/bin/env node
/**
 * ProductBoard MCP Server
 *
 * Model Context Protocol server for ProductBoard API v2 integration.
 * Enables Claude Desktop and Claude Code to manage ProductBoard features.
 *
 * @module index
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createClient, ProductBoardClient } from './client/api.js';
import { ProductBoardError } from './client/errors.js';
import { registerRelationshipTools } from './tools/relationships.js';
import { registerConfigTools } from './tools/config.js';
import { registerEntityTools } from './tools/entities.js';

// Server metadata
const SERVER_NAME = 'productboard-mcp';
const SERVER_VERSION = '0.1.0';

/**
 * Main entry point for the MCP server
 */
async function main(): Promise<void> {
  // Validate environment
  if (!process.env.PRODUCTBOARD_API_TOKEN) {
    console.error(
      'Error: PRODUCTBOARD_API_TOKEN environment variable is not set.\n' +
        'Please set it to your ProductBoard API token.\n\n' +
        'Get your token from: ProductBoard Settings > Integrations > Public API'
    );
    process.exit(1);
  }

  // Create ProductBoard client
  let client: ProductBoardClient;
  try {
    client = createClient();
  } catch (error) {
    if (error instanceof ProductBoardError) {
      console.error(`Error: ${error.message}`);
      if (error.suggestion) {
        console.error(`Suggestion: ${error.suggestion}`);
      }
    } else {
      console.error('Error creating ProductBoard client:', error);
    }
    process.exit(1);
  }

  // Create MCP server
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register all tools (consolidated to 14 tools)
  registerRelationshipTools(server, client);
  registerConfigTools(server, client);
  registerEntityTools(server, client);

  // Connect to transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    void server.close().then(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void server.close().then(() => process.exit(0));
  });
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Export for testing
export { SERVER_NAME, SERVER_VERSION };
