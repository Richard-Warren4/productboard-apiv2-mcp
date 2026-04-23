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

/**
 * Raw field from ProductBoard API v2
 * Note: API returns fields as object keyed by field ID, not array
 * Schema names like "RichTextFieldValue" need to be mapped to our types
 * Supports both actual API format (schema) and legacy type definition (type)
 */
/** A single selectable option for status / single-select / multi-select fields. */
interface FieldValueItem {
  id: string;
  name: string;
  assignedEntityTypes?: string[];
}

/**
 * GA option set wrapper. ProductBoard's March 2026 changelog replaced the old
 * `inline: [...]` shape with `{ data: [...], links: { next? } }` and renamed
 * `FieldInlineValues` to `FieldValueItem`. We accept both shapes during reads.
 */
interface FieldValuesEnvelope {
  data?: FieldValueItem[];
  inline?: FieldValueItem[]; // legacy shape, kept for tolerant parsing
  links?: { next?: string | null };
}

interface RawApiField {
  id: string;
  name: string;
  path?: string;
  schema?: string; // e.g., "RichTextFieldValue", "TextFieldValue", "NumberFieldValue"
  type?: string; // Legacy format support
  displayName?: string; // Legacy format support
  required?: boolean; // Legacy format support
  readOnly?: boolean; // Legacy format support
  lifecycle?: {
    create?: { set?: boolean };
    update?: { set?: boolean; clear?: boolean };
    patch?: { set?: boolean; clear?: boolean };
  };
  constraints?: {
    required?: boolean;
    maxLength?: number;
  };
  links?: { self: string | null };
  /** Legacy: select-field options inline on the field. */
  options?: FieldValueItem[];
  /** GA: select-field options under a paginated envelope. */
  values?: FieldValuesEnvelope;
}

/**
 * Normalized field for internal use
 */
interface NormalizedField {
  id: string;
  name: string;
  displayName: string;
  type: string;
  required: boolean;
  readOnly: boolean;
  options?: Array<{ id: string; name: string }>;
}

/**
 * Map ProductBoard schema names to our field types
 */
const SCHEMA_TO_TYPE: Record<string, string> = {
  TextFieldValue: 'text',
  RichTextFieldValue: 'richtext',
  NumberFieldValue: 'number',
  BooleanFieldValue: 'boolean',
  DateFieldValue: 'date',
  DateTimeFieldValue: 'datetime',
  StatusFieldValue: 'status',
  MemberFieldValue: 'member',
  TeamFieldValue: 'team',
  TeamsFieldValue: 'team',
  SingleSelectFieldValue: 'single_select',
  MultiSelectFieldValue: 'multi_select',
  EntityReferenceFieldValue: 'entityReference',
  HealthFieldValue: 'health',
  ProgressFieldValue: 'progress',
  TimeframeFieldValue: 'timeframe',
};

/**
 * Convert API field object to normalized field array
 * API returns: { "name": { id, name, schema, ... }, "status": { ... } }
 * We need: [{ id, name, displayName, type, required, readOnly }, ...]
 * @exported for use by entities.ts
 */
export function normalizeFields(fieldsObj: Record<string, RawApiField> | RawApiField[] | undefined): NormalizedField[] {
  if (!fieldsObj) return [];

  // If already an array, normalize each field
  if (Array.isArray(fieldsObj)) {
    return fieldsObj.map(normalizeField);
  }

  // Convert object to array
  return Object.values(fieldsObj).map(normalizeField);
}

/**
 * Read selectable options from either the legacy inline shape or the GA
 * `values: { data, links: { next } }` envelope (introduced in the March 2026
 * changelog along with the FieldInlineValues → FieldValueItem rename).
 *
 * If `values.links.next` is present we cap at the first page; following the
 * cursor for option enumeration is intentionally out of scope here.
 */
export function extractFieldOptions(field: RawApiField): FieldValueItem[] | undefined {
  if (field.options && field.options.length > 0) return field.options;
  const env = field.values;
  if (!env) return undefined;
  const items = env.data ?? env.inline;
  return items && items.length > 0 ? items : undefined;
}

/**
 * Normalize a single field from API format to our format
 * Handles both actual API format (schema) and legacy type definition (type)
 */
function normalizeField(field: RawApiField): NormalizedField {
  // Determine type: prefer schema mapping, fall back to type property, then unknown
  let type: string;
  if (field.schema) {
    type = SCHEMA_TO_TYPE[field.schema] ?? field.schema.replace('FieldValue', '').toLowerCase();
  } else if (field.type) {
    type = field.type;
  } else {
    type = 'unknown';
  }

  // Determine readOnly: check lifecycle if available, fall back to readOnly property
  const isReadOnly = field.lifecycle
    ? !field.lifecycle?.update?.set && !field.lifecycle?.patch?.set
    : field.readOnly ?? false;

  // Determine required: check constraints if available, fall back to required property
  const isRequired = field.constraints?.required ?? field.required ?? false;

  const options = extractFieldOptions(field);

  return {
    id: field.id,
    name: field.name,
    displayName: field.displayName ?? field.name, // Use displayName if available, else name
    type,
    required: isRequired,
    readOnly: isReadOnly,
    options: options?.map((o) => ({ id: o.id, name: o.name })),
  };
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
 * Accepts normalized field and filters unknown types.
 */
function formatFieldForDisplay(field: NormalizedField): Record<string, unknown> | null {
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

/**
 * Raw entity config from API
 * Note: fields can be object keyed by field ID or array
 */
interface RawApiEntityConfig {
  type: string;
  fields: Record<string, RawApiField> | RawApiField[];
}

/**
 * Format entity configuration for AI-readable output.
 * Works with raw API response type.
 */
function formatConfigForDisplay(config: RawApiEntityConfig): Record<string, unknown> {
  // Normalize fields from API format (object or array) to array of normalized fields
  const fieldsArray = normalizeFields(config.fields);

  const fields = fieldsArray
    .map(formatFieldForDisplay)
    .filter((f): f is Record<string, unknown> => f !== null);

  const requiredFields = fieldsArray
    .filter((f) => f.required && isKnownFieldType(f.type))
    .map((f) => f.name);

  const selectFields = fieldsArray
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
      'Supports the searchable entity types: feature, subfeature, objective, initiative, keyResult. ' +
      'Use this to discover what fields are available in your workspace before creating or updating entities.',
    {
      entityType: z
        .enum(['feature', 'subfeature', 'objective', 'initiative', 'keyResult'])
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
        // API returns array for all types, single object for specific type
        const configArray = Array.isArray(config.data) ? config.data : [config.data];
        const formattedConfigs = configArray.map(formatConfigForDisplay);

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
          components: response.data.map((c) => {
            // API v2 returns name under fields, not at top level
            const fields = (c as unknown as { fields?: { name?: string; description?: string } }).fields;
            return {
              id: c.id,
              name: fields?.name ?? c.name ?? 'Unnamed',
              description: fields?.description ?? c.description?.value ?? '',
              productId: c.product?.id ?? null,
            };
          }),
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
