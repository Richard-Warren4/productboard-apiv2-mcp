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
import type { FieldType } from '../client/types.js';
import { toMcpError, toMcpSuccess } from '../client/errors.js';
import {
  GetConfigInputSchema,
  ListProductsInputSchema,
  ListComponentsInputSchema,
} from '../schemas/inputs.js';
import { extractCursor, hasNextPage } from '../utils/pagination.js';

/** Raw API response type from getEntityConfiguration */
type RawApiConfigResponse = Awaited<ReturnType<ProductBoardClient['getEntityConfiguration']>>;

/** Raw field from API (type is string, not FieldType) */
interface RawApiField {
  id: string;
  name: string;
  displayName: string;
  type: string;
  required: boolean;
  readOnly: boolean;
  options?: Array<{ id: string; name: string }>;
}

/**
 * Known field types that we display in configuration output.
 * Unknown types are silently skipped per FR-008.
 */
export const KNOWN_FIELD_TYPES: FieldType[] = [
  'text',
  'richtext',
  'number',
  'boolean',
  'date',
  'datetime',
  'status',
  'member',
  'team',
  'single_select',
  'multi_select',
  'singleSelect',
  'multiSelect',
  'entityReference',
  'health',
  'progress',
  'timeframe',
];

/**
 * Session-based cache for configuration data.
 * No TTL - data persists for the entire MCP server session.
 * Cache clears only on server restart (per FR-007).
 */
const sessionCache: Map<string, unknown> = new Map();

/**
 * Get cached data or fetch fresh (session-based caching, no TTL).
 * Once fetched, data remains cached for the entire session.
 */
export async function getSessionCached<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  const cached = sessionCache.get(key);
  if (cached !== undefined) {
    return cached as T;
  }
  const data = await fetchFn();
  sessionCache.set(key, data);
  return data;
}

/**
 * Clear all cached configuration data.
 * Used by pb_refresh_config to force fresh data fetch.
 */
export function clearSessionCache(): void {
  sessionCache.clear();
}

/**
 * Check if a field type is known (should be displayed).
 */
function isKnownFieldType(type: string): type is FieldType {
  return KNOWN_FIELD_TYPES.includes(type as FieldType);
}

/**
 * Format a field definition for AI-readable output.
 * Includes type, required status, and options for select fields.
 * Accepts raw API field type (string) and filters unknown types.
 */
function formatFieldForDisplay(field: RawApiField): Record<string, unknown> | null {
  // Skip unknown field types silently (FR-008)
  if (!isKnownFieldType(field.type)) {
    return null;
  }

  const formatted: Record<string, unknown> = {
    name: field.name,
    displayName: field.displayName,
    type: field.type,
    required: field.required,
    readOnly: field.readOnly,
  };

  // Include options for select-type fields
  if (field.options && field.options.length > 0) {
    formatted.options = field.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
    }));
  }

  return formatted;
}

/** Raw entity config from API */
interface RawApiEntityConfig {
  type: string;
  fields: RawApiField[];
}

/**
 * Format entity configuration for AI-readable output.
 * Works with raw API response type.
 */
function formatConfigForDisplay(config: RawApiEntityConfig): Record<string, unknown> {
  const fields = config.fields
    .map(formatFieldForDisplay)
    .filter((f): f is Record<string, unknown> => f !== null);

  const requiredFields = config.fields
    .filter((f) => f.required && isKnownFieldType(f.type))
    .map((f) => f.name);

  const selectFields = config.fields
    .filter((f) => ['status', 'single_select', 'multi_select', 'singleSelect', 'multiSelect'].includes(f.type))
    .filter((f) => f.options && f.options.length > 0)
    .map((f) => ({
      name: f.name,
      options: f.options!.map((o) => o.name),
    }));

  return {
    type: config.type,
    totalFields: fields.length,
    requiredFields,
    selectFieldsWithOptions: selectFields,
    fields,
  };
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
      'Returns available fields with names, types, required status, and options for select fields. ' +
      'Use this to discover what fields are available in your workspace before creating or updating features.',
    {
      entityType: z
        .enum(['feature', 'subfeature'])
        .optional()
        .describe('Entity type to get config for (default: all)'),
    },
    async (args) => {
      try {
        const input = GetConfigInputSchema.parse(args);

        // Use session-based caching - fetch once per session (FR-007)
        let config: RawApiConfigResponse;
        try {
          config = await getSessionCached(
            `config:${input.entityType ?? 'all'}`,
            () => client.getEntityConfiguration(input.entityType)
          );
        } catch (fetchError) {
          // Graceful degradation: return helpful message if config fetch fails (FR-006)
          return toMcpSuccess({
            entityType: input.entityType ?? 'all',
            error: 'Configuration fetch failed. Operations will proceed without validation.',
            hint: 'This may be due to API permissions or network issues. You can still create and update entities.',
            details: fetchError instanceof Error ? fetchError.message : String(fetchError),
          });
        }

        // Format each configuration for AI readability
        const formattedConfigs = config.data.map(formatConfigForDisplay);

        const result = {
          entityType: input.entityType ?? 'all',
          configurations: formattedConfigs,
          summary: {
            totalEntityTypes: formattedConfigs.length,
            hint: 'Use field names and option names when creating or updating entities. Required fields must be provided for create operations.',
          },
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
