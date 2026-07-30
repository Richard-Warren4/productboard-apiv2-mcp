/**
 * Zod Schemas for MCP Tool Inputs
 *
 * These schemas validate tool inputs at runtime before processing.
 * All inputs are validated using Zod before being passed to the API client.
 *
 * @module schemas/inputs
 */

import { z } from 'zod';

// =============================================================================
// Relationship Tool Input Schemas
// =============================================================================

export const GetRelationshipsInputSchema = z.object({
  featureId: z.string().describe('Feature ID'),
});

/**
 * Valid relationship types for ProductBoard API v2
 *
 * - parent: identifies target as parent of source entity
 * - child: identifies target as child of source entity
 * - link: non-hierarchical connection (e.g., feature to objective)
 * - isBlockedBy: dependency - source is blocked by target
 * - isBlocking: dependency - source blocks target
 */
const RelationshipTypeSchema = z.enum(['parent', 'child', 'link', 'isBlockedBy', 'isBlocking']);

export const CreateRelationshipInputSchema = z.object({
  entityId: z.string().describe('Source entity ID'),
  relationshipType: RelationshipTypeSchema.describe('Type of relationship to create'),
  targetId: z.string().describe('Target entity ID'),
});

export const SetRelationshipInputSchema = z.object({
  featureId: z.string().describe('Entity ID'),
  relationshipType: RelationshipTypeSchema.describe('Type of relationship to set'),
  targetId: z.string().describe('Target entity ID'),
});

export const RemoveRelationshipInputSchema = z.object({
  featureId: z.string().describe('Entity ID'),
  relationshipType: RelationshipTypeSchema.describe('Type of relationship to remove'),
  targetId: z.string().describe('Target entity ID to unlink'),
});

// =============================================================================
// Configuration Tool Input Schemas
// =============================================================================

export const GetConfigInputSchema = z.object({
  entityType: z
    .enum(['feature', 'subfeature', 'objective', 'initiative', 'keyResult'])
    .optional()
    .describe('Entity type to get config for (default: all)'),
});

export const ListComponentsInputSchema = z.object({
  productId: z.string().optional().describe('Filter by product'),
  pageCursor: z.string().optional().describe('Cursor for pagination'),
});

export const ListProductsInputSchema = z.object({
  pageCursor: z.string().optional().describe('Cursor for pagination'),
});

// =============================================================================
// Jira Integration Tool Input Schemas
// =============================================================================

export const ListJiraIntegrationsInputSchema = z.object({});

export const GetJiraLinksInputSchema = z.object({
  featureIds: z
    .array(z.string())
    .optional()
    .describe(
      'Optional: only return links for these Productboard feature/entity IDs. Omit to return every link in the workspace.'
    ),
});

// =============================================================================
// Generic Entity Tool Input Schemas
// =============================================================================

/**
 * All entity types supported by ProductBoard API v2.
 * Note: 'user' is read-only (no create/update operations)
 *
 * Per OpenAPI spec: product, component, feature, subfeature, initiative, objective, keyResult, release, releaseGroup
 * Plus company and user (separate API endpoints)
 */
export const EntityTypeSchema = z.enum([
  'objective',
  'product',
  'component',
  'feature',
  'subfeature',
  'initiative',
  'keyResult',
  'releaseGroup',
  'release',
  'company',
  'user',
]);

/**
 * Entity types that support write operations (excludes 'user')
 * Per OpenAPI spec: product, component, feature, subfeature, initiative, objective, keyResult, release, releaseGroup
 * Plus company (separate API endpoint)
 */
export const WritableEntityTypeSchema = z.enum([
  'objective',
  'product',
  'component',
  'feature',
  'subfeature',
  'initiative',
  'keyResult',
  'releaseGroup',
  'release',
  'company',
]);

/**
 * Entity types that support search operations.
 * Per OpenAPI spec EntitySearch schema.
 *
 * IMPORTANT: Search supports additional filters not available via list endpoint.
 * See CLAUDE.md and research.md for complete filter reference.
 */
export const SearchableEntityTypeSchema = z.enum([
  'feature',
  'subfeature',
  'objective',
  'initiative',
  'keyResult',
]);

/**
 * Reference to another entity (for parent, owner, etc.)
 */
const EntityReferenceSchema = z.object({
  id: z.string().describe('Entity UUID'),
});

/**
 * Status assignment - by ID or name
 */
const StatusAssignSchema = z
  .object({
    id: z.string().optional().describe('Status ID'),
    name: z.string().optional().describe('Status name'),
  })
  .refine((data) => data.id || data.name, {
    message: 'Either id or name must be provided for status',
  });

/**
 * Owner/member assignment - by ID or email
 */
const OwnerAssignSchema = z
  .object({
    id: z.string().optional().describe('Owner ID'),
    email: z.string().email().optional().describe('Owner email'),
  })
  .refine((data) => data.id || data.email, {
    message: 'Either id or email must be provided for owner',
  });

/**
 * Team assignment - by ID or name
 */
const TeamAssignSchema = z.object({
  id: z.string().optional().describe('Team ID'),
  name: z.string().optional().describe('Team name'),
});

/**
 * Rich text field value
 */
const RichtextValueSchema = z.object({
  value: z.string().describe('HTML content'),
});

/**
 * Generic entity fields - accepts dynamic fields
 */
export const GenericEntityFieldsSchema = z
  .object({
    name: z.string().min(1).describe('Entity name (required for most types)'),
    description: z.union([z.string(), RichtextValueSchema]).optional().describe('Entity description (HTML)'),
    status: StatusAssignSchema.optional().describe('Status (provide id OR name)'),
    owner: OwnerAssignSchema.optional().describe('Owner (provide id OR email)'),
    teams: z.union([
      z.string(),
      z.array(z.union([z.string(), TeamAssignSchema]))
    ]).optional().describe('Teams - accepts "Team Name", ["Team A", "Team B"], or [{name: "Team"}]'),
    parent: EntityReferenceSchema.optional().describe('Parent entity reference'),
  })
  .passthrough(); // Allow custom fields from workspace configuration

/**
 * pb_entity_create input schema
 */
export const EntityCreateInputSchema = z.object({
  entityType: WritableEntityTypeSchema.describe('The type of entity to create'),
  fields: GenericEntityFieldsSchema.describe('Field values for the entity'),
});

/**
 * pb_entity_get input schema
 */
export const EntityGetInputSchema = z.object({
  id: z.string().describe('Entity UUID'),
});

/**
 * pb_entity_update input schema
 */
export const EntityUpdateInputSchema = z.object({
  id: z.string().describe('Entity UUID'),
  fields: z
    .object({
      name: z.string().min(1).optional().describe('New name'),
      description: z.union([z.string(), RichtextValueSchema]).optional().describe('New description (HTML)'),
      status: StatusAssignSchema.optional().describe('New status'),
      owner: OwnerAssignSchema.optional().describe('New owner'),
      teams: z.union([
        z.string(),
        z.array(z.union([z.string(), TeamAssignSchema]))
      ]).optional().describe('Teams - accepts "Team Name", ["Team A", "Team B"], or [{name: "Team"}]'),
    })
    .passthrough()
    .describe('Fields to update (partial update supported)'),
});

/**
 * pb_entity_list input schema
 *
 * NOTE: ProductBoard API v2 does NOT support pageSize parameter.
 * It returns 100 items per page. Use pageCursor for subsequent pages.
 *
 * Supply either `entityType` (single) or `entityTypes` (multi). When `entityTypes`
 * is supplied, the client serializes it to repeated `type[]=…` query params, which
 * the GA API supports for multi-type listing.
 */
export const EntityListInputSchema = z
  .object({
    entityType: EntityTypeSchema.optional().describe('The type of entities to list'),
    entityTypes: z
      .array(EntityTypeSchema)
      .min(1)
      .optional()
      .describe('Multiple entity types to list (sent as repeated type[]= query params)'),
    pageCursor: z.string().optional().describe('Cursor for pagination'),
  })
  .refine((data) => Boolean(data.entityType) !== Boolean(data.entityTypes), {
    message: 'Provide exactly one of entityType or entityTypes',
  });

/**
 * Custom field filter operator schema.
 * Numeric operators (<, <=, >, >=) only valid for number fields.
 */
export const CustomFieldFilterOperatorSchema = z.enum(['=', '!=', '<', '<=', '>', '>=']);

/**
 * Custom field filter schema for client-side filtering.
 * Allows filtering by custom field values using various operators.
 */
export const CustomFieldFilterSchema = z.object({
  field: z.string().min(1).describe('Custom field name (not UUID, case-insensitive match)'),
  operator: CustomFieldFilterOperatorSchema.describe('Comparison operator'),
  value: z.union([z.number(), z.string(), z.boolean()]).describe('Value to compare against'),
});

/**
 * pb_entity_search input schema
 *
 * NOTE: ProductBoard API v2 does NOT support pageSize parameter.
 * It returns 100 items per page. Use pageCursor for subsequent pages.
 *
 * The search request body uses the structured `filter` format from the v2
 * OpenAPI spec: { data: { filter: { type, id, fields, relationships } } }
 * (verified live 2026-07-30; the older flat-properties body is now rejected).
 *
 * teams filters server-side via filter.fields.teams. customFieldFilters run
 * server-side for '=' on select/number/date fields; other operators, text
 * fields, and hasTeam are applied client-side after fetching all pages.
 */
export const EntitySearchInputSchema = z.object({
  entityType: SearchableEntityTypeSchema.describe('Entity type to search (feature, subfeature, objective)'),
  name: z.string().optional().describe('Filter by name (partial, case-insensitive)'),
  statuses: z
    .array(z.object({ name: z.string().optional(), id: z.string().optional() }))
    .optional()
    .describe('Filter by status names or IDs'),
  owners: z
    .array(z.object({ email: z.string().optional(), id: z.string().optional() }))
    .optional()
    .describe('Filter by owner emails or IDs'),
  parent: EntityReferenceSchema.optional().describe('Filter by parent entity'),
  archived: z.boolean().optional().describe('Filter by archived state'),
  ids: z.array(z.string()).optional().describe('Filter by specific entity IDs'),
  pageCursor: z.string().optional().describe('Cursor for pagination'),
  customFieldFilters: z
    .array(CustomFieldFilterSchema)
    .optional()
    .describe("Filters for custom field values (e.g., Reach >= 50). '=' on select/number/date fields runs server-side; the rest is applied client-side."),
  teams: z
    .array(z.string())
    .optional()
    .describe('Server-side filter by native workspace team names (e.g., ["H4C Mobile"]). Matches entities in ANY of the given teams. Names must exist in the workspace.'),
  hasTeam: z
    .boolean()
    .optional()
    .describe('Client-side filter by team presence: true = has at least one team, false = no team assigned'),
});

/**
 * pb_entity_types input schema
 */
export const EntityTypesInputSchema = z.object({
  entityType: EntityTypeSchema.optional().describe('Optional: Get configuration for specific type only'),
  includeFields: z.boolean().optional().default(false).describe('Include full field definitions'),
});

/**
 * pb_refresh_config input schema
 */
export const RefreshConfigInputSchema = z.object({});

// =============================================================================
// Type Exports
// =============================================================================

export type GetRelationshipsInput = z.infer<typeof GetRelationshipsInputSchema>;
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipInputSchema>;
export type SetRelationshipInput = z.infer<typeof SetRelationshipInputSchema>;
export type RemoveRelationshipInput = z.infer<typeof RemoveRelationshipInputSchema>;
export type GetConfigInput = z.infer<typeof GetConfigInputSchema>;
export type ListComponentsInput = z.infer<typeof ListComponentsInputSchema>;
export type ListProductsInput = z.infer<typeof ListProductsInputSchema>;
export type ListJiraIntegrationsInput = z.infer<typeof ListJiraIntegrationsInputSchema>;
export type GetJiraLinksInput = z.infer<typeof GetJiraLinksInputSchema>;

// Generic entity types
export type EntityCreateInput = z.infer<typeof EntityCreateInputSchema>;
export type EntityGetInput = z.infer<typeof EntityGetInputSchema>;
export type EntityUpdateInput = z.infer<typeof EntityUpdateInputSchema>;
export type EntityListInput = z.infer<typeof EntityListInputSchema>;
export type EntitySearchInput = z.infer<typeof EntitySearchInputSchema>;
export type EntityTypesInput = z.infer<typeof EntityTypesInputSchema>;
export type RefreshConfigInput = z.infer<typeof RefreshConfigInputSchema>;

// Custom field filter types
export type CustomFieldFilterOperator = z.infer<typeof CustomFieldFilterOperatorSchema>;
export type CustomFieldFilterInput = z.infer<typeof CustomFieldFilterSchema>;
