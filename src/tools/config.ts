/**
 * Configuration MCP Tools
 *
 * MCP tools for ProductBoard configuration discovery:
 * - pb_get_config: Get entity configuration (available fields, statuses, etc.)
 * - pb_list_products: List available products
 * - pb_list_components: List available components
 *
 * @module tools/config
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ProductBoardClient } from '../client/api.js';
import { toMcpError, toMcpSuccess } from '../client/errors.js';
import {
  GetConfigInputSchema,
  ListProductsInputSchema,
  ListComponentsInputSchema,
} from '../schemas/inputs.js';
import { extractCursor, hasNextPage } from '../utils/pagination.js';

/**
 * Cache for configuration data
 */
const configCache: Map<string, { data: unknown; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data or fetch fresh
 */
async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = configCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }
  const data = await fetchFn();
  configCache.set(key, { data, timestamp: Date.now() });
  return data;
}

/**
 * Register configuration tools with the MCP server
 */
export function registerConfigTools(server: McpServer, client: ProductBoardClient): void {
  // ===========================================================================
  // pb_get_config - Get entity configuration
  // ===========================================================================
  server.tool(
    'pb_get_config',
    'Get ProductBoard configuration for entity types. ' +
      'Returns available fields, statuses, and options that can be used when creating or updating features.',
    {
      entityType: z
        .enum(['feature', 'subfeature'])
        .optional()
        .describe('Entity type to get config for (default: all)'),
    },
    async (args) => {
      try {
        const input = GetConfigInputSchema.parse(args);

        const config = await getCachedOrFetch(
          `config:${input.entityType ?? 'all'}`,
          () => client.getEntityConfiguration(input.entityType)
        );

        // Format for AI readability
        const result = {
          entityType: input.entityType ?? 'all',
          configuration: config.data,
          hint: 'Use the field IDs and option names when creating or updating entities.',
        };

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_list_products - List available products
  // ===========================================================================
  server.tool(
    'pb_list_products',
    'List all products in ProductBoard. ' +
      'Use product IDs when assigning features to products.',
    {
      pageCursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        const input = ListProductsInputSchema.parse(args);

        const response = await client.listProducts({
          pageCursor: input.pageCursor,
        });

        const result = {
          products: response.data.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description?.value ?? '',
          })),
          totalReturned: response.data.length,
          nextCursor: extractCursor(response.links.next) ?? null,
          hasMoreResults: hasNextPage(response),
        };

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_list_components - List available components
  // ===========================================================================
  server.tool(
    'pb_list_components',
    'List all components in ProductBoard. ' +
      'Use component IDs when assigning features to components.',
    {
      productId: z.string().optional().describe('Filter by product ID'),
      pageCursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        const input = ListComponentsInputSchema.parse(args);

        const response = await client.listComponents({
          productId: input.productId,
          pageCursor: input.pageCursor,
        });

        const result = {
          components: response.data.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description?.value ?? '',
            productId: c.product?.id ?? null,
          })),
          totalReturned: response.data.length,
          appliedFilters: input.productId ? { productId: input.productId } : undefined,
          nextCursor: extractCursor(response.links.next) ?? null,
          hasMoreResults: hasNextPage(response),
        };

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
