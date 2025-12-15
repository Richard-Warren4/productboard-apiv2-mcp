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
// Feature Tool Input Schemas
// =============================================================================

export const ListFeaturesInputSchema = z.object({
  teamId: z.string().optional().describe('Filter by team ID'),
  teamName: z.string().optional().describe('Filter by team name'),
  status: z.string().optional().describe('Filter by status name'),
  componentId: z.string().optional().describe('Filter by component ID'),
  pageCursor: z.string().optional().describe('Cursor for pagination'),
});

export const GetFeatureInputSchema = z
  .object({
    featureId: z.string().optional().describe('Feature ID (UUID)'),
    featureName: z.string().optional().describe('Feature name (exact match)'),
  })
  .refine((data) => data.featureId || data.featureName, {
    message: 'Either featureId or featureName must be provided',
  });

export const CreateFeatureInputSchema = z
  .object({
    name: z.string().min(1).describe('Feature name'),
    description: z.string().optional().describe('Feature description (HTML)'),
    teamId: z.string().optional().describe('Team ID to assign'),
    teamName: z.string().optional().describe('Team name to assign'),
    status: z.string().optional().describe('Initial status name'),
    componentId: z.string().optional().describe('Component to assign'),
    productId: z.string().optional().describe('Product to assign'),
  })
  .passthrough(); // Allow custom fields from workspace configuration

export const UpdateFeatureInputSchema = z
  .object({
    featureId: z.string().describe('Feature ID to update'),
    name: z.string().min(1).optional().describe('New name'),
    description: z.string().optional().describe('New description (HTML)'),
    status: z.string().optional().describe('New status name'),
    teamId: z.string().optional().describe('New team ID'),
    teamName: z.string().optional().describe('New team name'),
    ownerId: z.string().optional().describe('New owner ID'),
    ownerEmail: z.string().email().optional().describe('New owner email'),
  })
  .passthrough(); // Allow custom fields from workspace configuration

export const SearchFeaturesInputSchema = z.object({
  query: z.string().optional().describe('Search query (name contains)'),
  teamId: z.string().optional().describe('Filter by team ID'),
  teamName: z.string().optional().describe('Filter by team name'),
  status: z.string().optional().describe('Filter by status'),
  componentId: z.string().optional().describe('Filter by component'),
  pageCursor: z.string().optional().describe('Cursor for pagination'),
});

// =============================================================================
// Subfeature Tool Input Schemas
// =============================================================================

export const ListSubfeaturesInputSchema = z.object({
  featureId: z.string().describe('Parent feature ID'),
  pageCursor: z.string().optional().describe('Cursor for pagination'),
});

export const GetSubfeatureInputSchema = z.object({
  subfeatureId: z.string().describe('Subfeature ID'),
});

export const CreateSubfeatureInputSchema = z
  .object({
    name: z.string().min(1).describe('Subfeature name'),
    featureId: z.string().describe('Parent feature ID'),
    description: z.string().optional().describe('Description (HTML)'),
    status: z.string().optional().describe('Initial status'),
  })
  .passthrough(); // Allow custom fields from workspace configuration

export const UpdateSubfeatureInputSchema = z
  .object({
    subfeatureId: z.string().describe('Subfeature ID'),
    name: z.string().min(1).optional().describe('New name'),
    description: z.string().optional().describe('New description'),
    status: z.string().optional().describe('New status'),
  })
  .passthrough(); // Allow custom fields from workspace configuration

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
    .enum(['feature', 'subfeature'])
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
// Generic Entity Tool Input Schemas
// =============================================================================

/**
 * All entity types supported by ProductBoard API v2.
 * Note: 'user' is read-only (no create/update operations)
 *
 * NOTE: 'initiative' is NOT supported by ProductBoard API v2 (verified 2025-12-15)
 */
export const EntityTypeSchema = z.enum([
  'objective',
  'product',
  'component',
  'feature',
  'subfeature',
  'releaseGroup',
  'release',
  'company',
  'user',
]);

/**
 * Entity types that support write operations (excludes 'user')
 */
export const WritableEntityTypeSchema = z.enum([
  'objective',
  'product',
  'component',
  'feature',
  'subfeature',
  'releaseGroup',
  'release',
  'company',
]);

/**
 * Entity types that support search operations.
 *
 * NOTE: 'initiative' is NOT supported by ProductBoard API v2 (verified 2025-12-15)
 *
 * IMPORTANT: Search supports additional filters not available via list endpoint.
 * See CLAUDE.md and research.md for complete filter reference.
 */
export const SearchableEntityTypeSchema = z.enum([
  'feature',
  'subfeature',
  'objective',
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
    teams: z.array(TeamAssignSchema).optional().describe('Team assignments'),
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
      teams: z.array(TeamAssignSchema).optional().describe('New team assignments'),
    })
    .passthrough()
    .describe('Fields to update (partial update supported)'),
});

/**
 * pb_entity_list input schema
 *
 * NOTE: ProductBoard API v2 does NOT support pageSize parameter.
 * It returns 100 items per page. Use pageCursor for subsequent pages.
 */
export const EntityListInputSchema = z.object({
  entityType: EntityTypeSchema.describe('The type of entities to list'),
  pageCursor: z.string().optional().describe('Cursor for pagination'),
});

/**
 * pb_entity_search input schema
 *
 * NOTE: ProductBoard API v2 does NOT support pageSize parameter.
 * It returns 100 items per page. Use pageCursor for subsequent pages.
 *
 * IMPORTANT: All filters are direct properties under `data`, NOT in a `filter` wrapper.
 * The official ProductBoard docs show a `filter` property but that does NOT work.
 * See CLAUDE.md and research.md for verified examples.
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

export type ListFeaturesInput = z.infer<typeof ListFeaturesInputSchema>;
export type GetFeatureInput = z.infer<typeof GetFeatureInputSchema>;
export type CreateFeatureInput = z.infer<typeof CreateFeatureInputSchema>;
export type UpdateFeatureInput = z.infer<typeof UpdateFeatureInputSchema>;
export type SearchFeaturesInput = z.infer<typeof SearchFeaturesInputSchema>;
export type ListSubfeaturesInput = z.infer<typeof ListSubfeaturesInputSchema>;
export type GetSubfeatureInput = z.infer<typeof GetSubfeatureInputSchema>;
export type CreateSubfeatureInput = z.infer<typeof CreateSubfeatureInputSchema>;
export type UpdateSubfeatureInput = z.infer<typeof UpdateSubfeatureInputSchema>;
export type GetRelationshipsInput = z.infer<typeof GetRelationshipsInputSchema>;
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipInputSchema>;
export type SetRelationshipInput = z.infer<typeof SetRelationshipInputSchema>;
export type RemoveRelationshipInput = z.infer<typeof RemoveRelationshipInputSchema>;
export type GetConfigInput = z.infer<typeof GetConfigInputSchema>;
export type ListComponentsInput = z.infer<typeof ListComponentsInputSchema>;
export type ListProductsInput = z.infer<typeof ListProductsInputSchema>;

// Generic entity types
export type EntityCreateInput = z.infer<typeof EntityCreateInputSchema>;
export type EntityGetInput = z.infer<typeof EntityGetInputSchema>;
export type EntityUpdateInput = z.infer<typeof EntityUpdateInputSchema>;
export type EntityListInput = z.infer<typeof EntityListInputSchema>;
export type EntitySearchInput = z.infer<typeof EntitySearchInputSchema>;
export type EntityTypesInput = z.infer<typeof EntityTypesInputSchema>;
export type RefreshConfigInput = z.infer<typeof RefreshConfigInputSchema>;
