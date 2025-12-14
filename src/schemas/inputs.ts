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

export const CreateFeatureInputSchema = z.object({
  name: z.string().min(1).describe('Feature name'),
  description: z.string().optional().describe('Feature description (HTML)'),
  teamId: z.string().optional().describe('Team ID to assign'),
  teamName: z.string().optional().describe('Team name to assign'),
  status: z.string().optional().describe('Initial status name'),
  componentId: z.string().optional().describe('Component to assign'),
  productId: z.string().optional().describe('Product to assign'),
});

export const UpdateFeatureInputSchema = z.object({
  featureId: z.string().describe('Feature ID to update'),
  name: z.string().min(1).optional().describe('New name'),
  description: z.string().optional().describe('New description (HTML)'),
  status: z.string().optional().describe('New status name'),
  teamId: z.string().optional().describe('New team ID'),
  teamName: z.string().optional().describe('New team name'),
  ownerId: z.string().optional().describe('New owner ID'),
  ownerEmail: z.string().email().optional().describe('New owner email'),
});

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

export const CreateSubfeatureInputSchema = z.object({
  name: z.string().min(1).describe('Subfeature name'),
  featureId: z.string().describe('Parent feature ID'),
  description: z.string().optional().describe('Description (HTML)'),
  status: z.string().optional().describe('Initial status'),
});

export const UpdateSubfeatureInputSchema = z.object({
  subfeatureId: z.string().describe('Subfeature ID'),
  name: z.string().min(1).optional().describe('New name'),
  description: z.string().optional().describe('New description'),
  status: z.string().optional().describe('New status'),
});

// =============================================================================
// Relationship Tool Input Schemas
// =============================================================================

export const GetRelationshipsInputSchema = z.object({
  featureId: z.string().describe('Feature ID'),
});

export const SetRelationshipInputSchema = z.object({
  featureId: z.string().describe('Feature ID'),
  relationshipType: z
    .enum(['component', 'product', 'initiative', 'parent'])
    .describe('Type of relationship to set'),
  targetId: z.string().describe('Target entity ID'),
});

export const RemoveRelationshipInputSchema = z.object({
  featureId: z.string().describe('Feature ID'),
  relationshipType: z
    .enum(['component', 'product', 'initiative', 'parent'])
    .describe('Type of relationship to remove'),
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
export type SetRelationshipInput = z.infer<typeof SetRelationshipInputSchema>;
export type RemoveRelationshipInput = z.infer<typeof RemoveRelationshipInputSchema>;
export type GetConfigInput = z.infer<typeof GetConfigInputSchema>;
export type ListComponentsInput = z.infer<typeof ListComponentsInputSchema>;
export type ListProductsInput = z.infer<typeof ListProductsInputSchema>;
