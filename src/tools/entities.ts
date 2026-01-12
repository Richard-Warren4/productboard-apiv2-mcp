/**
 * Generic Entity MCP Tools
 *
 * MCP tools for managing all ProductBoard entity types:
 * - pb_entity_create: Create any entity type
 * - pb_entity_get: Get entity by ID (any type)
 * - pb_entity_update: Update any entity
 * - pb_entity_list: List entities of a type with pagination
 * - pb_entity_search: Search entities with filters
 * - pb_entity_types: List available entity types and configurations
 * - pb_refresh_config: Force refresh of cached configuration
 *
 * @module tools/entities
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ProductBoardClient } from '../client/api.js';
import type { GenericEntity, ValidationWarning, WritableEntityType, SearchableEntityType, CustomFieldMapping } from '../client/types.js';
import { toMcpError, toMcpSuccess } from '../client/errors.js';
import {
  EntityTypeSchema,
  WritableEntityTypeSchema,
  SearchableEntityTypeSchema,
  EntityCreateInputSchema,
  EntityGetInputSchema,
  EntityUpdateInputSchema,
  EntityListInputSchema,
  EntitySearchInputSchema,
  EntityTypesInputSchema,
} from '../schemas/inputs.js';
import { extractCursor, hasNextPage } from '../utils/pagination.js';
import { validateRichtext, containsHtml, textToHtml } from '../utils/richtext.js';
import { validateFieldsAgainstConfig, getConfigForValidation } from '../utils/validation.js';
import {
  buildCustomFieldMapping,
  transformCustomFields,
  transformFieldsForUpdate,
  validateCustomFieldFilters,
  applyCustomFieldFilters,
  type CustomFieldFilterInput,
} from '../utils/custom-fields.js';
import { getSessionCached, clearSessionCache, normalizeFields } from './config.js';

/**
 * Extract parent ID from relationships
 */
function getParentId(entity: GenericEntity): string | undefined {
  const parentRel = entity.relationships?.data?.find((r) => r.type === 'parent');
  return parentRel?.target?.id;
}

/**
 * Generate ProductBoard web UI URL for an entity
 * Uses workspace subdomain from PRODUCTBOARD_SUBDOMAIN env var (default: 'app')
 * URL format: https://{subdomain}.productboard.com/products-page?d={base64(1:PmEntity:{id})}
 */
function getProductBoardUrl(entity: GenericEntity): string {
  // Get workspace subdomain from environment (default to 'app' for generic URLs)
  const subdomain = process.env.PRODUCTBOARD_SUBDOMAIN || 'app';

  // Encode entity reference: "1:PmEntity:{uuid}" → base64
  const entityRef = `1:PmEntity:${entity.id}`;
  const encodedRef = Buffer.from(entityRef).toString('base64');

  // Generate workspace-specific URL
  return `https://${subdomain}.productboard.com/products-page?d=${encodedRef}`;
}

/**
 * Format a generic entity for AI-readable output
 *
 * @param entity - The entity to format
 * @param customFieldMapping - Optional custom field mapping for transforming UUID keys to names
 */
function formatEntity(entity: GenericEntity, customFieldMapping?: CustomFieldMapping): Record<string, unknown> {
  const fields = entity.fields;

  // Extract common fields
  const formatted: Record<string, unknown> = {
    id: entity.id,
    type: entity.type,
    name: fields.name ?? 'Unnamed',
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    productboardUrl: getProductBoardUrl(entity),
  };

  // Add optional standard fields if present
  if (fields.description) {
    formatted.description = typeof fields.description === 'object'
      ? (fields.description as { value: string }).value
      : fields.description;
  }
  if (fields.status) {
    formatted.status = fields.status?.name ?? 'No status';
  }
  if (fields.owner) {
    formatted.owner = fields.owner?.name ?? fields.owner?.email ?? 'Unassigned';
  }
  if (fields.teams && fields.teams.length > 0) {
    formatted.teams = fields.teams.filter((t) => t).map((t) => t.name).join(', ');
  }
  if (fields.archived !== undefined) {
    formatted.archived = fields.archived;
  }

  // Add parent if present
  const parentId = getParentId(entity);
  if (parentId) {
    formatted.parent = parentId;
  }

  // Transform custom fields if mapping is provided
  if (customFieldMapping && customFieldMapping.byId.size > 0) {
    const customFields = transformCustomFields(fields, customFieldMapping);
    if (Object.keys(customFields).length > 0) {
      formatted.customFields = customFields;
    }
  } else {
    // Fallback: Add any other non-standard fields with UUID keys
    // This maintains backwards compatibility when no mapping is available
    const standardFields = ['name', 'description', 'status', 'owner', 'teams', 'archived', 'parent'];
    for (const [key, value] of Object.entries(fields)) {
      if (!standardFields.includes(key) && value !== undefined && value !== null) {
        formatted[key] = value;
      }
    }
  }

  return formatted;
}

/**
 * Format a list of entities for AI-readable output
 *
 * @param entities - Array of entities to format
 * @param entityType - The type of entities
 * @param pagination - Pagination info
 * @param customFieldMapping - Optional custom field mapping for transforming UUID keys to names
 */
function formatEntityList(
  entities: GenericEntity[],
  entityType: string,
  pagination: { nextCursor?: string; hasMore: boolean },
  customFieldMapping?: CustomFieldMapping
): Record<string, unknown> {
  return {
    entityType,
    entities: entities.map((e) => {
      const formatted: Record<string, unknown> = {
        id: e.id,
        type: e.type,
        name: e.fields.name ?? 'Unnamed',
        status: e.fields.status?.name ?? 'No status',
        owner: e.fields.owner?.name ?? e.fields.owner?.email ?? 'Unassigned',
        archived: e.fields.archived ?? false,
      };

      // Add custom fields if mapping is provided
      if (customFieldMapping && customFieldMapping.byId.size > 0) {
        const customFields = transformCustomFields(e.fields, customFieldMapping);
        if (Object.keys(customFields).length > 0) {
          formatted.customFields = customFields;
        }
      }

      return formatted;
    }),
    totalReturned: entities.length,
    nextCursor: pagination.nextCursor ?? null,
    hasMoreResults: pagination.hasMore,
  };
}

/**
 * Get or build custom field mapping for an entity type.
 * Uses session cache to avoid rebuilding on every request.
 *
 * @param client - ProductBoard API client
 * @param entityType - Entity type to get mapping for
 * @returns Custom field mapping or undefined if config fetch fails
 */
async function getCustomFieldMapping(
  client: ProductBoardClient,
  entityType: string
): Promise<CustomFieldMapping | undefined> {
  try {
    // Only feature and subfeature entities have custom fields
    if (entityType !== 'feature' && entityType !== 'subfeature') {
      return undefined;
    }

    // Get cached config or fetch fresh
    const cacheKey = `customFieldMapping:${entityType}`;
    return await getSessionCached(cacheKey, async () => {
      const config = await client.getEntityConfiguration(entityType);
      const configData = Array.isArray(config.data) ? config.data[0] : config.data;
      if (configData?.fields === undefined || configData?.fields === null) {
        return { byId: new Map(), byName: new Map() };
      }
      // Fields can be object keyed by ID or array - buildCustomFieldMapping handles both
      return buildCustomFieldMapping(configData.fields as unknown as Record<string, { id: string; name: string; schema?: string; options?: Array<{ id: string; name: string; color?: string }> }>);
    });
  } catch {
    // Config fetch failed - continue without custom field transformation
    return undefined;
  }
}

/**
 * Build relationships array from fields if parent is specified
 */
function extractRelationships(
  fields: Record<string, unknown>
): { cleanFields: Record<string, unknown>; relationships: Array<{ type: string; target: { id: string } }> } {
  const cleanFields = { ...fields };
  const relationships: Array<{ type: string; target: { id: string } }> = [];

  // Extract parent relationship
  if (cleanFields.parent && typeof cleanFields.parent === 'object') {
    const parent = cleanFields.parent as { id?: string };
    if (parent.id) {
      relationships.push({ type: 'parent', target: { id: parent.id } });
    }
    delete cleanFields.parent;
  }

  // Extract product relationship (for features)
  if (cleanFields.product && typeof cleanFields.product === 'object') {
    const product = cleanFields.product as { id?: string };
    if (product.id) {
      relationships.push({ type: 'product', target: { id: product.id } });
    }
    delete cleanFields.product;
  }

  return { cleanFields, relationships };
}

/**
 * Validate and transform description field to richtext format
 */
function processDescriptionField(fields: Record<string, unknown>): {
  processedFields: Record<string, unknown>;
  error?: { code: string; message: string; details?: Record<string, unknown> };
} {
  const processedFields = { ...fields };

  if (processedFields.description !== undefined) {
    const desc = processedFields.description;

    // Handle string description -> convert to richtext object
    if (typeof desc === 'string') {
      // If plain text (no HTML), auto-wrap in <p> tags for ProductBoard API
      const htmlContent = containsHtml(desc) ? desc : textToHtml(desc);

      const validation = validateRichtext(htmlContent);
      if (!validation.valid) {
        return {
          processedFields,
          error: {
            code: 'INVALID_RICHTEXT',
            message: validation.message ?? 'Invalid HTML in description',
            details: { invalidTags: validation.invalidTags },
          },
        };
      }
      processedFields.description = { value: htmlContent };
    } else if (typeof desc === 'object' && desc !== null) {
      // Already in richtext format, validate the value
      const richtext = desc as { value?: string };
      if (richtext.value) {
        const validation = validateRichtext(richtext.value);
        if (!validation.valid) {
          return {
            processedFields,
            error: {
              code: 'INVALID_RICHTEXT',
              message: validation.message ?? 'Invalid HTML in description',
              details: { invalidTags: validation.invalidTags },
            },
          };
        }
      }
    }
  }

  return { processedFields };
}

/**
 * Register generic entity tools with the MCP server
 */
export function registerEntityTools(server: McpServer, client: ProductBoardClient): void {
  // ===========================================================================
  // pb_entity_create - Create any entity type (US1)
  // ===========================================================================
  server.tool(
    'pb_entity_create',
    'Create a new ProductBoard entity of any supported type. ' +
      'Supports: objective, product, component, feature, subfeature, releaseGroup, release, company (8 writable types). ' +
      'Note: user entities are read-only and cannot be created.',
    {
      entityType: WritableEntityTypeSchema.describe('The type of entity to create'),
      fields: z
        .object({
          name: z.string().min(1).describe('Entity name (required)'),
          description: z.union([z.string(), z.object({ value: z.string() })]).optional().describe('Description (HTML)'),
          status: z.object({ id: z.string().optional(), name: z.string().optional() }).optional().describe('Status'),
          owner: z.object({ id: z.string().optional(), email: z.string().optional() }).optional().describe('Owner'),
          teams: z.array(z.object({ id: z.string().optional(), name: z.string().optional() })).optional().describe('Teams'),
          parent: z.object({ id: z.string() }).optional().describe('Parent entity'),
        })
        .passthrough()
        .describe('Field values for the entity'),
    },
    async (args) => {
      try {
        // Validate input
        const input = EntityCreateInputSchema.parse(args);
        const entityType = input.entityType as WritableEntityType;

        // Process description field (validate HTML)
        const { processedFields, error: descError } = processDescriptionField(input.fields as Record<string, unknown>);
        if (descError) {
          return toMcpError(descError);
        }

        // Extract relationships from fields
        const { cleanFields, relationships } = extractRelationships(processedFields);

        // Validate fields against configuration (warn-only, non-blocking)
        const validationWarnings: ValidationWarning[] = [];
        const entityConfig = await getConfigForValidation(client, entityType, getSessionCached);
        if (entityConfig) {
          const validation = validateFieldsAgainstConfig(cleanFields, entityConfig, 'create');
          validationWarnings.push(...validation.warnings);
        }

        // Create entity
        const createResponse = await client.createEntity(entityType, cleanFields, relationships);

        // Fetch complete entity if response is partial
        let entity = createResponse.data;
        if (!entity?.fields) {
          if (!entity?.id) {
            return toMcpError({
              code: 'API_ERROR',
              message: 'Entity created but response missing both fields and id',
            });
          }
          const fetchResponse = await client.getEntity(entity.id);
          entity = fetchResponse.data;
        }

        const result: Record<string, unknown> = {
          message: `${entityType} created successfully`,
          entity: formatEntity(entity),
        };

        if (validationWarnings.length > 0) {
          result.validationWarnings = validationWarnings;
        }

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_entity_get - Get entity by ID (US1)
  // ===========================================================================
  server.tool(
    'pb_entity_get',
    'Get detailed information about any ProductBoard entity by its ID. ' +
      'Works for all entity types - the type is auto-detected from the response.',
    {
      id: z.string().describe('Entity UUID'),
    },
    async (args) => {
      try {
        // Validate input
        const input = EntityGetInputSchema.parse(args);

        // Fetch entity
        const response = await client.getEntity(input.id);
        const entity = response.data;

        // Get custom field mapping for transformation (feature/subfeature only)
        const customFieldMapping = await getCustomFieldMapping(client, entity.type);

        // Get relationships if possible
        type RelItem = { type: string; target: { id: string; type: string } };
        let relationshipsArray: RelItem[] = [];
        try {
          const relResponse = await client.getRelationships(entity.id);
          relationshipsArray = relResponse.data;
        } catch {
          // Relationships fetch failed, continue without them
        }

        // Group relationships by type
        const grouped: Record<string, Array<{ id: string; type: string }>> = {};
        for (const rel of relationshipsArray) {
          if (!grouped[rel.type]) {
            grouped[rel.type] = [];
          }
          grouped[rel.type].push({ id: rel.target.id, type: rel.target.type });
        }

        const result = {
          entity: formatEntity(entity, customFieldMapping),
          relationships: grouped,
          summary: {
            totalRelationships: relationshipsArray.length,
            types: Object.keys(grouped),
          },
        };

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_entity_update - Update any entity (US1)
  // ===========================================================================
  server.tool(
    'pb_entity_update',
    'Update properties of an existing ProductBoard entity. ' +
      'Only provided fields will be updated; others remain unchanged. ' +
      'Note: user entities are read-only and cannot be updated.',
    {
      id: z.string().describe('Entity UUID'),
      fields: z
        .object({
          name: z.string().min(1).optional().describe('New name'),
          description: z.union([z.string(), z.object({ value: z.string() })]).optional().describe('New description'),
          status: z.object({ id: z.string().optional(), name: z.string().optional() }).optional().describe('New status'),
          owner: z.object({ id: z.string().optional(), email: z.string().optional() }).optional().describe('New owner'),
          teams: z.array(z.object({ id: z.string().optional(), name: z.string().optional() })).optional().describe('New teams'),
        })
        .passthrough()
        .describe('Fields to update (partial update supported)'),
    },
    async (args) => {
      try {
        // Validate input
        const input = EntityUpdateInputSchema.parse(args);

        // First, get the entity to determine its type
        const getResponse = await client.getEntity(input.id);
        const entityType = getResponse.data.type;

        // Check if it's a user (read-only)
        if (entityType === 'user') {
          return toMcpError({
            code: 'UNSUPPORTED_TYPE',
            message: 'User entities are read-only and cannot be updated',
          });
        }

        // Process description field
        const { processedFields, error: descError } = processDescriptionField(input.fields as Record<string, unknown>);
        if (descError) {
          return toMcpError(descError);
        }

        // Track what fields are being updated
        const updatedFields = Object.keys(processedFields).filter(
          (key) => processedFields[key] !== undefined
        );

        if (updatedFields.length === 0) {
          return toMcpError({
            code: 'VALIDATION_ERROR',
            message: 'No fields provided to update',
            suggestion: 'Provide at least one field to update',
          });
        }

        // Validate fields against configuration
        const validationWarnings: ValidationWarning[] = [];
        const entityConfig = await getConfigForValidation(client, entityType, getSessionCached);
        if (entityConfig) {
          const validation = validateFieldsAgainstConfig(processedFields, entityConfig, 'update');
          validationWarnings.push(...validation.warnings);
        }

        // Transform custom field names to UUIDs for API (feature/subfeature only)
        let fieldsToUpdate = processedFields;
        if (entityType === 'feature' || entityType === 'subfeature') {
          const customFieldMapping = await getCustomFieldMapping(client, entityType);
          if (customFieldMapping && customFieldMapping.byName.size > 0) {
            const { transformedFields, warnings: transformWarnings } = transformFieldsForUpdate(
              processedFields,
              customFieldMapping
            );
            fieldsToUpdate = transformedFields;
            // Add transformation warnings to validation warnings
            for (const warning of transformWarnings) {
              validationWarnings.push({ field: 'custom', issue: 'invalid_value', message: warning });
            }
          }
        }

        // Update entity
        const response = await client.updateEntity(input.id, fieldsToUpdate);

        // Note: API update response only includes { id, type, links } - no fields
        // Return minimal entity info from the response
        const result: Record<string, unknown> = {
          message: `${entityType} updated successfully`,
          updatedFields,
          entity: {
            id: response.data.id,
            type: response.data.type,
            productboardUrl: getProductBoardUrl(response.data),
          },
        };

        if (validationWarnings.length > 0) {
          result.validationWarnings = validationWarnings;
        }

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_entity_list - List entities with pagination (US1)
  // ===========================================================================
  server.tool(
    'pb_entity_list',
    'List ProductBoard entities of a specific type with pagination. ' +
      'Supports all 9 entity types: objective, product, component, feature, subfeature, releaseGroup, release, company, user. ' +
      'Returns 100 items per page (API does not support custom page size).',
    {
      entityType: EntityTypeSchema.describe('The type of entities to list'),
      pageCursor: z.string().optional().describe('Cursor for pagination (from previous response)'),
    },
    async (args) => {
      try {
        // Validate input
        const input = EntityListInputSchema.parse(args);

        // Get custom field mapping for transformation (feature/subfeature only)
        const customFieldMapping = await getCustomFieldMapping(client, input.entityType);

        // Fetch entities (pageSize not supported by API - always returns 100)
        const response = await client.listEntities(input.entityType, {
          pageCursor: input.pageCursor,
        });

        const result = formatEntityList(response.data, input.entityType, {
          nextCursor: extractCursor(response.links.next),
          hasMore: hasNextPage(response),
        }, customFieldMapping);

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_entity_search - Search entities with filters (US4)
  // ===========================================================================
  server.tool(
    'pb_entity_search',
    'Search ProductBoard entities with filters. ' +
      'Supported for: feature, subfeature, objective. ' +
      'Filters: name (partial), statuses, owners, parent, archived, ids. ' +
      'Returns 100 items per page (API does not support custom page size). ' +
      'NOTE: Team filtering is NOT supported - use client-side filtering after fetching. ' +
      'Custom field filtering (customFieldFilters) is applied client-side after fetching.',
    {
      entityType: SearchableEntityTypeSchema.describe('Entity type to search (feature, subfeature, objective)'),
      name: z.string().optional().describe('Filter by name (partial, case-insensitive)'),
      statuses: z.array(z.object({ name: z.string().optional(), id: z.string().optional() })).optional().describe('Filter by statuses'),
      owners: z.array(z.object({ email: z.string().optional(), id: z.string().optional() })).optional().describe('Filter by owners'),
      parent: z.object({ id: z.string() }).optional().describe('Filter by parent entity'),
      archived: z.boolean().optional().describe('Filter by archived state'),
      ids: z.array(z.string()).optional().describe('Filter by specific entity IDs'),
      pageCursor: z.string().optional().describe('Cursor for pagination'),
      customFieldFilters: z.array(z.object({
        field: z.string().describe('Custom field name'),
        operator: z.enum(['=', '!=', '<', '<=', '>', '>=']).describe('Comparison operator'),
        value: z.union([z.number(), z.string(), z.boolean()]).describe('Value to compare'),
      })).optional().describe('Client-side filters for custom fields (e.g., Reach >= 50)'),
    },
    async (args) => {
      try {
        // Validate input
        const input = EntitySearchInputSchema.parse(args);
        const entityType = input.entityType as SearchableEntityType;

        // Get custom field mapping for transformation (feature/subfeature only)
        const customFieldMapping = await getCustomFieldMapping(client, entityType);

        // Validate custom field filters if provided
        const customFieldFilters = input.customFieldFilters as CustomFieldFilterInput[] | undefined;
        if (customFieldFilters && customFieldFilters.length > 0 && customFieldMapping !== undefined) {
          const validation = validateCustomFieldFilters(customFieldFilters, customFieldMapping);
          if (!validation.valid) {
            return toMcpError({
              code: 'INVALID_CUSTOM_FIELD_FILTER',
              message: validation.errors[0].message,
              details: {
                errors: validation.errors,
              },
            });
          }
        }

        // Build filters (all are direct properties under `data`, NOT in a filter wrapper)
        const filters: {
          name?: string;
          statuses?: Array<{ name?: string; id?: string }>;
          owners?: Array<{ email?: string; id?: string }>;
          parent?: { id: string };
          archived?: boolean;
          ids?: string[];
        } = {};

        if (input.name !== undefined && input.name !== '') filters.name = input.name;
        if (input.statuses !== undefined && input.statuses.length > 0) filters.statuses = input.statuses;
        if (input.owners !== undefined && input.owners.length > 0) filters.owners = input.owners;
        if (input.parent !== undefined) filters.parent = input.parent;
        if (input.archived !== undefined) filters.archived = input.archived;
        if (input.ids !== undefined && input.ids.length > 0) filters.ids = input.ids;

        // If custom field filters are provided, we need to fetch all pages
        let allEntities: GenericEntity[] = [];
        let pagesFetched = 0;
        let nextCursor: string | null = null;
        let hasMoreResults = false;

        if (customFieldFilters !== undefined && customFieldFilters.length > 0) {
          // Fetch all pages for client-side filtering
          let cursor: string | undefined = input.pageCursor;
          do {
            const response = await client.searchEntities(entityType, filters, {
              pageCursor: cursor,
            });
            allEntities = allEntities.concat(response.data);
            pagesFetched++;
            cursor = extractCursor(response.links.next);
          } while (cursor !== undefined && cursor !== null && cursor !== '' && pagesFetched < 50); // Safety limit
          // When filtering, we've fetched all matching results
          nextCursor = null;
          hasMoreResults = false;
        } else {
          // Normal single-page fetch
          const response = await client.searchEntities(entityType, filters, {
            pageCursor: input.pageCursor,
          });
          allEntities = response.data;
          pagesFetched = 1;
          nextCursor = extractCursor(response.links.next) ?? null;
          hasMoreResults = hasNextPage(response);
        }

        const totalBeforeFiltering = allEntities.length;

        // Format entities with custom fields
        const formattedEntities = allEntities.map((e) => {
          const formatted: Record<string, unknown> = {
            id: e.id,
            type: e.type,
            name: e.fields.name ?? 'Unnamed',
            status: e.fields.status?.name ?? 'No status',
            owner: e.fields.owner?.name ?? e.fields.owner?.email ?? 'Unassigned',
            archived: e.fields.archived ?? false,
          };

          // Add custom fields if mapping is provided
          if (customFieldMapping !== undefined && customFieldMapping.byId.size > 0) {
            const customFields = transformCustomFields(e.fields, customFieldMapping);
            if (Object.keys(customFields).length > 0) {
              formatted.customFields = customFields;
            }
          }

          return formatted;
        });

        // Apply custom field filters
        let filteredEntities = formattedEntities;
        if (customFieldFilters !== undefined && customFieldFilters.length > 0 && customFieldMapping !== undefined) {
          // Type assertion needed because formattedEntities has Record<string, unknown> for customFields
          // but applyCustomFieldFilters expects Record<string, CustomFieldValue>
          filteredEntities = applyCustomFieldFilters(
            formattedEntities,
            customFieldFilters,
            customFieldMapping
          );
        }

        const totalAfterFiltering = filteredEntities.length;

        // Build result
        const result: Record<string, unknown> = {
          entityType,
          entities: filteredEntities,
          totalReturned: filteredEntities.length,
          nextCursor,
          hasMoreResults,
        };

        // Add applied filters info
        const appliedFilters: Record<string, unknown> = {};
        if (input.name !== undefined && input.name !== '') appliedFilters.name = input.name;
        if (input.statuses !== undefined) appliedFilters.statuses = input.statuses;
        if (input.owners !== undefined) appliedFilters.owners = input.owners;
        if (input.parent !== undefined) appliedFilters.parent = input.parent;
        if (input.archived !== undefined) appliedFilters.archived = input.archived;
        if (input.ids !== undefined) appliedFilters.ids = input.ids;
        if (customFieldFilters !== undefined && customFieldFilters.length > 0) {
          appliedFilters.customFieldFilters = customFieldFilters;
        }

        if (Object.keys(appliedFilters).length > 0) {
          result.appliedFilters = appliedFilters;
        }

        // Add filtering info if custom field filters were applied
        if (customFieldFilters !== undefined && customFieldFilters.length > 0) {
          result.filteringInfo = {
            totalBeforeFiltering,
            totalAfterFiltering,
            pagesFetched,
          };
        }

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_entity_types - List entity types and configurations (US5)
  // ===========================================================================
  server.tool(
    'pb_entity_types',
    'List available ProductBoard entity types and their field configurations. ' +
      'Use this to discover what entity types exist and what fields are available before creating entities.',
    {
      entityType: EntityTypeSchema.optional().describe('Get configuration for specific type only'),
      includeFields: z.boolean().optional().describe('Include full field definitions (default: false)'),
    },
    async (args) => {
      try {
        // Validate input
        const input = EntityTypesInputSchema.parse(args);

        // Fetch configuration
        const config = await getSessionCached(
          `config:${input.entityType ?? 'all'}`,
          () => client.getEntityConfiguration(input.entityType)
        );

        // Format output
        // API returns array for all types, single object for specific type
        const configArray = Array.isArray(config.data) ? config.data : [config.data];
        const entityTypes = configArray.map((c) => {
          // Normalize fields from API format (object keyed by ID) to array
          const fieldsArray = normalizeFields(c.fields);
          const base: Record<string, unknown> = {
            type: c.type,
            fieldCount: fieldsArray.length,
            settableFieldCount: fieldsArray.filter((f) => !f.readOnly).length,
            requiredFieldCount: fieldsArray.filter((f) => f.required && !f.readOnly).length,
          };

          if (input.includeFields) {
            base.fields = fieldsArray.map((f) => ({
              id: f.id,
              name: f.name,
              displayName: f.displayName,
              type: f.type,
              required: f.required,
              readOnly: f.readOnly,
              options: f.options?.filter((o) => o).map((o: { name: string }) => o.name),
            }));
          }

          return base;
        });

        const result = {
          entityTypes,
          summary: {
            totalEntityTypes: entityTypes.length,
            searchableTypes: ['feature', 'subfeature', 'objective'],
            readOnlyTypes: ['user'],
            hint: input.includeFields
              ? 'Use field names when creating or updating entities.'
              : 'Use includeFields: true to see full field definitions.',
          },
        };

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_refresh_config - Force refresh cached configuration (US5)
  // ===========================================================================
  server.tool(
    'pb_refresh_config',
    'Force refresh of cached entity configuration. ' +
      'Use this if entity configurations have changed in ProductBoard and you need fresh data.',
    {},
    async () => {
      try {
        // Clear the session cache
        clearSessionCache();

        // Fetch fresh configuration
        const config = await client.getEntityConfiguration();

        // Re-cache the configuration
        // API returns array for all types, single object for specific type
        const configArray = Array.isArray(config.data) ? config.data : [config.data];
        const entityTypes = configArray.map((c) => c.type);

        const result = {
          message: 'Configuration cache cleared and refreshed',
          entityTypes,
          totalEntityTypes: entityTypes.length,
        };

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}

/**
 * Create a generic entity handler that can be reused by entity-specific tools.
 * This enables the tool alias pattern (US2).
 */
export async function handleGenericEntityCreate(
  client: ProductBoardClient,
  entityType: WritableEntityType,
  fields: Record<string, unknown>
): Promise<{ entity: GenericEntity; warnings: ValidationWarning[] }> {
  // Process description
  const { processedFields, error: descError } = processDescriptionField(fields);
  if (descError) {
    throw new Error(descError.message);
  }

  // Extract relationships
  const { cleanFields, relationships } = extractRelationships(processedFields);

  // Validate fields
  const warnings: ValidationWarning[] = [];
  const entityConfig = await getConfigForValidation(client, entityType, getSessionCached);
  if (entityConfig) {
    const validation = validateFieldsAgainstConfig(cleanFields, entityConfig, 'create');
    warnings.push(...validation.warnings);
  }

  // Create entity
  const createResponse = await client.createEntity(entityType, cleanFields, relationships);

  // Fetch complete entity if needed
  let entity = createResponse.data;
  if (!entity?.fields && entity?.id) {
    const fetchResponse = await client.getEntity(entity.id);
    entity = fetchResponse.data;
  }

  return { entity, warnings };
}

/**
 * Generic update handler for tool aliases (US2)
 */
export async function handleGenericEntityUpdate(
  client: ProductBoardClient,
  entityId: string,
  fields: Record<string, unknown>
): Promise<{ entity: GenericEntity; warnings: ValidationWarning[] }> {
  // Get entity type first
  const getResponse = await client.getEntity(entityId);
  const entityType = getResponse.data.type;

  if (entityType === 'user') {
    throw new Error('User entities are read-only');
  }

  // Process description
  const { processedFields, error: descError } = processDescriptionField(fields);
  if (descError) {
    throw new Error(descError.message);
  }

  // Validate fields
  const warnings: ValidationWarning[] = [];
  const entityConfig = await getConfigForValidation(client, entityType, getSessionCached);
  if (entityConfig) {
    const validation = validateFieldsAgainstConfig(processedFields, entityConfig, 'update');
    warnings.push(...validation.warnings);
  }

  // Update entity
  const response = await client.updateEntity(entityId, processedFields);

  return { entity: response.data, warnings };
}
