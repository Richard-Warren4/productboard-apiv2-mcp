/**
 * Subfeature MCP Tools
 *
 * MCP tools for managing ProductBoard subfeatures:
 * - pb_list_subfeatures: List subfeatures for a feature
 * - pb_get_subfeature: Get details for a specific subfeature
 * - pb_create_subfeature: Create a new subfeature
 * - pb_update_subfeature: Update an existing subfeature
 *
 * @module tools/subfeatures
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ProductBoardClient } from '../client/api.js';
import type { Subfeature } from '../client/types.js';
import { toMcpError, toMcpSuccess } from '../client/errors.js';
import {
  ListSubfeaturesInputSchema,
  GetSubfeatureInputSchema,
  CreateSubfeatureInputSchema,
  UpdateSubfeatureInputSchema,
} from '../schemas/inputs.js';
import { extractCursor, hasNextPage } from '../utils/pagination.js';
import { validateRichtext } from '../utils/richtext.js';

/**
 * Get team name(s) from subfeature fields
 */
function getTeamNames(subfeature: Subfeature): string {
  if (subfeature.fields.teams && subfeature.fields.teams.length > 0) {
    return subfeature.fields.teams.map((t) => t.name).join(', ');
  }
  if (subfeature.fields.team?.name) {
    return subfeature.fields.team.name;
  }
  return 'Unassigned';
}

/**
 * Format a subfeature for AI-readable output
 */
function formatSubfeature(subfeature: Subfeature): Record<string, unknown> {
  return {
    id: subfeature.id,
    name: subfeature.fields.name,
    status: subfeature.fields.status?.name ?? 'No status',
    team: getTeamNames(subfeature),
    owner: subfeature.fields.owner?.name ?? subfeature.fields.owner?.email ?? 'Unassigned',
    description: subfeature.fields.description ?? '',
    archived: subfeature.fields.archived ?? false,
    createdAt: subfeature.createdAt,
    updatedAt: subfeature.updatedAt,
    productboardUrl: subfeature.links.html ?? subfeature.links.self,
  };
}

/**
 * Format a list of subfeatures for AI-readable output
 */
function formatSubfeatureList(
  subfeatures: Subfeature[],
  featureId: string,
  pagination: { nextCursor?: string; hasMore: boolean }
): Record<string, unknown> {
  return {
    parentFeatureId: featureId,
    subfeatures: subfeatures.map((s) => ({
      id: s.id,
      name: s.fields.name,
      status: s.fields.status?.name ?? 'No status',
      team: getTeamNames(s),
      owner: s.fields.owner?.name ?? s.fields.owner?.email ?? 'Unassigned',
      archived: s.fields.archived ?? false,
    })),
    totalReturned: subfeatures.length,
    nextCursor: pagination.nextCursor ?? null,
    hasMoreResults: pagination.hasMore,
  };
}

/**
 * Register subfeature tools with the MCP server
 */
export function registerSubfeatureTools(server: McpServer, client: ProductBoardClient): void {
  // ===========================================================================
  // pb_list_subfeatures - List subfeatures for a parent feature
  // ===========================================================================
  server.tool(
    'pb_list_subfeatures',
    'List all subfeatures for a given parent feature. ' +
      'Use this to view the breakdown of a larger feature into smaller tasks.',
    {
      featureId: z.string().describe('Parent feature ID'),
      pageCursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        const input = ListSubfeaturesInputSchema.parse(args);

        const response = await client.listSubfeatures(input.featureId, {
          pageCursor: input.pageCursor,
        });

        const result = formatSubfeatureList(response.data, input.featureId, {
          nextCursor: extractCursor(response.links.next),
          hasMore: hasNextPage(response),
        });

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_get_subfeature - Get subfeature details
  // ===========================================================================
  server.tool(
    'pb_get_subfeature',
    'Get detailed information about a specific subfeature by ID.',
    {
      subfeatureId: z.string().describe('Subfeature ID'),
    },
    async (args) => {
      try {
        const input = GetSubfeatureInputSchema.parse(args);

        const response = await client.getSubfeature(input.subfeatureId);

        return toMcpSuccess(formatSubfeature(response.data));
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_create_subfeature - Create a new subfeature
  // ===========================================================================
  server.tool(
    'pb_create_subfeature',
    'Create a new subfeature under a parent feature. ' +
      'Requires name and parent feature ID.',
    {
      name: z.string().min(1).describe('Subfeature name'),
      featureId: z.string().describe('Parent feature ID'),
      description: z.string().optional().describe('Description (HTML)'),
      status: z.string().optional().describe('Initial status name'),
    },
    async (args) => {
      try {
        const input = CreateSubfeatureInputSchema.parse(args);

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

        // Build create input
        const createInput: {
          name: string;
          parent: { id: string };
          description?: { value: string };
          status?: { name: string };
        } = {
          name: input.name,
          parent: { id: input.featureId },
        };

        if (input.description) {
          createInput.description = { value: input.description };
        }

        if (input.status) {
          createInput.status = { name: input.status };
        }

        const response = await client.createSubfeature(createInput);

        return toMcpSuccess({
          message: 'Subfeature created successfully',
          subfeature: formatSubfeature(response.data),
        });
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_update_subfeature - Update a subfeature
  // ===========================================================================
  server.tool(
    'pb_update_subfeature',
    'Update properties of an existing subfeature. ' +
      'Only provided fields will be updated.',
    {
      subfeatureId: z.string().describe('Subfeature ID to update'),
      name: z.string().min(1).optional().describe('New name'),
      description: z.string().optional().describe('New description (HTML)'),
      status: z.string().optional().describe('New status name'),
    },
    async (args) => {
      try {
        const input = UpdateSubfeatureInputSchema.parse(args);

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

        if (updatedFields.length === 0) {
          return toMcpError({
            code: 'VALIDATION_ERROR',
            message: 'No fields provided to update',
            suggestion: 'Provide at least one field to update (name, description, or status)',
          });
        }

        const response = await client.updateSubfeature(input.subfeatureId, updateInput as never);

        return toMcpSuccess({
          message: 'Subfeature updated successfully',
          updatedFields,
          subfeature: formatSubfeature(response.data),
        });
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
