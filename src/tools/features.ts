/**
 * Feature MCP Tools
 *
 * MCP tools for managing ProductBoard features:
 * - pb_list_features: List features with optional filters
 * - pb_get_feature: Get details for a specific feature
 * - pb_create_feature: Create a new feature
 * - pb_update_feature: Update an existing feature
 *
 * @module tools/features
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ProductBoardClient } from '../client/api.js';
import type { Feature, ValidationWarning } from '../client/types.js';
import { toMcpError, toMcpSuccess } from '../client/errors.js';
import {
  ListFeaturesInputSchema,
  GetFeatureInputSchema,
  CreateFeatureInputSchema,
  UpdateFeatureInputSchema,
} from '../schemas/inputs.js';
import { extractCursor, hasNextPage } from '../utils/pagination.js';
import { validateRichtext } from '../utils/richtext.js';
import { validateFieldsAgainstConfig, getConfigForValidation } from '../utils/validation.js';
import { getSessionCached } from './config.js';

/**
 * Extract parent ID from relationships
 */
function getParentId(feature: Feature): string | undefined {
  const parentRel = feature.relationships?.data?.find((r) => r.type === 'parent');
  return parentRel?.target?.id;
}

/**
 * Get team name(s) from feature fields
 * API v2 returns teams as an array under 'teams', not 'team'
 */
function getTeamNames(feature: Feature): string {
  // Check for teams array first (API v2 format)
  if (feature.fields.teams && feature.fields.teams.length > 0) {
    return feature.fields.teams.map((t) => t.name).join(', ');
  }
  // Fallback to single team
  if (feature.fields.team?.name) {
    return feature.fields.team.name;
  }
  return 'Unassigned';
}

/**
 * Format a feature for AI-readable output
 */
function formatFeature(feature: Feature): Record<string, unknown> {
  return {
    id: feature.id,
    name: feature.fields.name,
    status: feature.fields.status?.name ?? 'No status',
    team: getTeamNames(feature),
    owner: feature.fields.owner?.name ?? feature.fields.owner?.email ?? 'Unassigned',
    description: feature.fields.description ?? '',
    archived: feature.fields.archived ?? false,
    parent: getParentId(feature),
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
    productboardUrl: feature.links.html ?? feature.links.self,
  };
}

/**
 * Format a list of features for AI-readable output
 */
function formatFeatureList(
  features: Feature[],
  pagination: { nextCursor?: string; hasMore: boolean }
): Record<string, unknown> {
  return {
    features: features.map((f) => ({
      id: f.id,
      name: f.fields.name,
      status: f.fields.status?.name ?? 'No status',
      team: getTeamNames(f),
      owner: f.fields.owner?.name ?? f.fields.owner?.email ?? 'Unassigned',
      archived: f.fields.archived ?? false,
    })),
    totalReturned: features.length,
    nextCursor: pagination.nextCursor ?? null,
    hasMoreResults: pagination.hasMore,
  };
}

/**
 * Register feature tools with the MCP server
 */
export function registerFeatureTools(server: McpServer, client: ProductBoardClient): void {
  // ===========================================================================
  // pb_list_features - List features with optional filters (US1)
  // ===========================================================================
  server.tool(
    'pb_list_features',
    'List ProductBoard features with optional filtering by team, status, or component. ' +
      'Use this to view the feature backlog for a team.',
    {
      teamId: z.string().optional().describe('Filter by team ID'),
      teamName: z.string().optional().describe('Filter by team name'),
      status: z.string().optional().describe('Filter by status name'),
      componentId: z.string().optional().describe('Filter by component ID'),
      pageCursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        // Validate input
        const input = ListFeaturesInputSchema.parse(args);

        // Fetch features
        const response = await client.listFeatures({
          pageCursor: input.pageCursor,
        });

        // Filter by team if specified
        let features = response.data;
        if (input.teamId) {
          features = features.filter((f) => {
            // Check teams array first (API v2 format)
            if (f.fields.teams && f.fields.teams.length > 0) {
              return f.fields.teams.some((t) => t.id === input.teamId);
            }
            return f.fields.team?.id === input.teamId;
          });
        } else if (input.teamName) {
          const teamNameLower = input.teamName.toLowerCase();
          features = features.filter((f) => {
            // Check teams array first (API v2 format)
            if (f.fields.teams && f.fields.teams.length > 0) {
              return f.fields.teams.some((t) => t.name.toLowerCase() === teamNameLower);
            }
            return f.fields.team?.name.toLowerCase() === teamNameLower;
          });
        }

        // Filter by status if specified
        if (input.status) {
          const statusLower = input.status.toLowerCase();
          features = features.filter(
            (f) => f.fields.status?.name.toLowerCase() === statusLower
          );
        }

        // Filter by component if specified (via relationships)
        if (input.componentId) {
          features = features.filter((f) => getParentId(f) === input.componentId);
        }

        // Format response
        const result = formatFeatureList(features, {
          nextCursor: extractCursor(response.links.next),
          hasMore: hasNextPage(response),
        });

        // Add filter info
        const filters: Record<string, string> = {};
        if (input.teamId) filters.teamId = input.teamId;
        if (input.teamName) filters.teamName = input.teamName;
        if (input.status) filters.status = input.status;
        if (input.componentId) filters.componentId = input.componentId;

        if (Object.keys(filters).length > 0) {
          result.appliedFilters = filters;
        }

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_get_feature - Get feature details (US2)
  // ===========================================================================
  server.tool(
    'pb_get_feature',
    'Get detailed information about a specific ProductBoard feature by ID or name. ' +
      'Returns full feature details including description, status, owner, team, and relationships.',
    {
      featureId: z.string().optional().describe('Feature ID (UUID)'),
      featureName: z.string().optional().describe('Feature name (exact match search)'),
    },
    async (args) => {
      try {
        // Validate input
        const input = GetFeatureInputSchema.parse(args);

        let feature: Feature;

        if (input.featureId) {
          // Direct lookup by ID
          const response = await client.getFeature(input.featureId);
          feature = response.data;
        } else if (input.featureName) {
          // Search by name using listFeatures and client-side filtering
          // (API v2 search doesn't support text queries, only field filters)
          const listResponse = await client.listFeatures();
          const nameLower = input.featureName.toLowerCase();

          // Find exact match first
          let exactMatch = listResponse.data.find(
            (f) => f.fields.name.toLowerCase() === nameLower
          );

          // If no exact match, find partial matches for suggestions
          if (!exactMatch) {
            const partialMatches = listResponse.data.filter((f) =>
              f.fields.name.toLowerCase().includes(nameLower)
            );

            if (partialMatches.length === 1) {
              // Single partial match - use it
              exactMatch = partialMatches[0];
            } else {
              // No match or multiple matches - show suggestions
              const suggestions = (
                partialMatches.length > 0 ? partialMatches : listResponse.data
              )
                .slice(0, 5)
                .map((f) => ({
                  id: f.id,
                  name: f.fields.name,
                }));

              return toMcpError({
                code: 'NOT_FOUND',
                message: `Feature "${input.featureName}" not found`,
                suggestion:
                  suggestions.length > 0
                    ? `Did you mean one of these? ${suggestions.map((s) => s.name).join(', ')}`
                    : 'Try using pb_list_features to see available features.',
                details: { suggestions },
              });
            }
          }

          feature = exactMatch;
        } else {
          return toMcpError({
            code: 'VALIDATION_ERROR',
            message: 'Either featureId or featureName must be provided',
          });
        }

        // Get relationships
        type RelItem = { type: string; target: { id: string; type: string } };
        let relationshipsArray: RelItem[] = [];
        try {
          const relResponse = await client.getRelationships(feature.id);
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

        // Format detailed output
        const result = {
          ...formatFeature(feature),
          relationships: grouped,
        };

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_create_feature - Create a new feature (US3)
  // ===========================================================================
  server.tool(
    'pb_create_feature',
    'Create a new feature in ProductBoard. Requires at minimum a name. ' +
      'Can optionally assign to a team, set status, and add description.',
    {
      name: z.string().min(1).describe('Feature name'),
      description: z.string().optional().describe('Feature description (HTML)'),
      teamId: z.string().optional().describe('Team ID to assign'),
      teamName: z.string().optional().describe('Team name to assign'),
      status: z.string().optional().describe('Initial status name'),
      componentId: z.string().optional().describe('Component to assign'),
      productId: z.string().optional().describe('Product to assign'),
    },
    async (args) => {
      try {
        // Validate input
        const input = CreateFeatureInputSchema.parse(args);

        // Validate richtext if description provided
        if (input.description) {
          const validation = validateRichtext(input.description);
          if (!validation.valid) {
            return toMcpError({
              code: 'INVALID_RICHTEXT',
              message: validation.message ?? 'Invalid HTML in description',
              details: { invalidTags: validation.invalidTags },
            });
          }
        }

        // Build create input - start with known fields
        const createInput: Record<string, unknown> = {
          name: input.name,
        };

        if (input.description) {
          createInput.description = { value: input.description };
        }

        if (input.teamId) {
          createInput.team = { id: input.teamId };
        } else if (input.teamName) {
          createInput.team = { name: input.teamName };
        }

        if (input.status) {
          createInput.status = { name: input.status };
        }

        if (input.componentId) {
          createInput.parent = { id: input.componentId };
        }

        if (input.productId) {
          createInput.product = { id: input.productId };
        }

        // Pass through custom fields (US3: Dynamic field support)
        const knownFields = ['name', 'description', 'teamId', 'teamName', 'status', 'componentId', 'productId'];
        for (const [key, value] of Object.entries(input)) {
          if (!knownFields.includes(key) && value !== undefined) {
            createInput[key] = value;
          }
        }

        // Validate fields against configuration (warn-only, non-blocking)
        const validationWarnings: ValidationWarning[] = [];
        const featureConfig = await getConfigForValidation(client, 'feature', getSessionCached);
        if (featureConfig) {
          const validation = validateFieldsAgainstConfig(createInput, featureConfig, 'create');
          validationWarnings.push(...validation.warnings);
        }

        // Create feature (proceed even with warnings)
        const createResponse = await client.createFeature(createInput as never);

        // The POST response may not include full entity details (fields).
        // Fetch the complete entity to ensure we have all field data.
        let feature = createResponse.data;
        if (!feature?.fields) {
          if (!feature?.id) {
            return toMcpError({
              code: 'API_ERROR',
              message: 'Feature created but response missing both fields and id',
            });
          }
          const fetchResponse = await client.getFeature(feature.id);
          feature = fetchResponse.data;
        }

        const result: Record<string, unknown> = {
          message: 'Feature created successfully',
          feature: formatFeature(feature),
        };

        // Include validation warnings if any
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
  // pb_update_feature - Update a feature (US4)
  // ===========================================================================
  server.tool(
    'pb_update_feature',
    'Update properties of an existing ProductBoard feature. ' +
      'Only provided fields will be updated; others remain unchanged.',
    {
      featureId: z.string().describe('Feature ID to update'),
      name: z.string().min(1).optional().describe('New name'),
      description: z.string().optional().describe('New description (HTML)'),
      status: z.string().optional().describe('New status name'),
      teamId: z.string().optional().describe('New team ID'),
      teamName: z.string().optional().describe('New team name'),
      ownerId: z.string().optional().describe('New owner ID'),
      ownerEmail: z.string().email().optional().describe('New owner email'),
    },
    async (args) => {
      try {
        // Validate input
        const input = UpdateFeatureInputSchema.parse(args);

        // Validate richtext if description provided
        if (input.description) {
          const validation = validateRichtext(input.description);
          if (!validation.valid) {
            return toMcpError({
              code: 'INVALID_RICHTEXT',
              message: validation.message ?? 'Invalid HTML in description',
              details: { invalidTags: validation.invalidTags },
            });
          }
        }

        // Build update input
        const updateInput: Record<string, unknown> = {};
        const updatedFields: string[] = [];

        if (input.name) {
          updateInput.name = input.name;
          updatedFields.push('name');
        }

        if (input.description !== undefined) {
          updateInput.description = { value: input.description };
          updatedFields.push('description');
        }

        if (input.status) {
          updateInput.status = { name: input.status };
          updatedFields.push('status');
        }

        if (input.teamId) {
          updateInput.team = { id: input.teamId };
          updatedFields.push('team');
        } else if (input.teamName) {
          updateInput.team = { name: input.teamName };
          updatedFields.push('team');
        }

        if (input.ownerId) {
          updateInput.owner = { id: input.ownerId };
          updatedFields.push('owner');
        } else if (input.ownerEmail) {
          updateInput.owner = { email: input.ownerEmail };
          updatedFields.push('owner');
        }

        // Pass through custom fields (US3: Dynamic field support)
        const knownFields = ['featureId', 'name', 'description', 'status', 'teamId', 'teamName', 'ownerId', 'ownerEmail'];
        for (const [key, value] of Object.entries(input)) {
          if (!knownFields.includes(key) && value !== undefined) {
            updateInput[key] = value;
            updatedFields.push(key);
          }
        }

        if (updatedFields.length === 0) {
          return toMcpError({
            code: 'VALIDATION_ERROR',
            message: 'No fields provided to update',
            suggestion: 'Provide at least one field to update (name, description, status, team, or owner)',
          });
        }

        // Validate fields against configuration (warn-only, non-blocking)
        const validationWarnings: ValidationWarning[] = [];
        const featureConfig = await getConfigForValidation(client, 'feature', getSessionCached);
        if (featureConfig) {
          const validation = validateFieldsAgainstConfig(updateInput, featureConfig, 'update');
          validationWarnings.push(...validation.warnings);
        }

        // Update feature (proceed even with warnings)
        const response = await client.updateFeature(input.featureId, updateInput as never);

        const result: Record<string, unknown> = {
          message: 'Feature updated successfully',
          updatedFields,
          feature: formatFeature(response.data),
        };

        // Include validation warnings if any
        if (validationWarnings.length > 0) {
          result.validationWarnings = validationWarnings;
        }

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
