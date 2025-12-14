/**
 * Relationship MCP Tools
 *
 * MCP tools for managing ProductBoard feature relationships:
 * - pb_get_relationships: Get relationships for a feature
 * - pb_set_relationship: Set a relationship between entities
 * - pb_remove_relationship: Remove a relationship
 *
 * @module tools/relationships
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ProductBoardClient } from '../client/api.js';
import { toMcpError, toMcpSuccess } from '../client/errors.js';
import {
  GetRelationshipsInputSchema,
  SetRelationshipInputSchema,
  RemoveRelationshipInputSchema,
} from '../schemas/inputs.js';

/**
 * Valid relationship types
 */
const RELATIONSHIP_TYPES = ['component', 'product', 'initiative', 'parent'] as const;

/**
 * Format relationships for AI-readable output
 */
function formatRelationships(
  featureId: string,
  relationships: {
    parent?: { id: string; type: string };
    product?: { id: string; type: string };
    component?: { id: string; type: string };
    children?: Array<{ id: string; type: string }>;
  }
): Record<string, unknown> {
  return {
    featureId,
    relationships: {
      parent: relationships.parent ?? null,
      product: relationships.product ?? null,
      component: relationships.component ?? null,
      children: relationships.children ?? [],
    },
    summary: {
      hasParent: !!relationships.parent,
      hasProduct: !!relationships.product,
      hasComponent: !!relationships.component,
      childrenCount: relationships.children?.length ?? 0,
    },
  };
}

/**
 * Register relationship tools with the MCP server
 */
export function registerRelationshipTools(server: McpServer, client: ProductBoardClient): void {
  // ===========================================================================
  // pb_get_relationships - Get relationships for a feature (US6)
  // ===========================================================================
  server.tool(
    'pb_get_relationships',
    'Get all relationships for a ProductBoard feature. ' +
      'Returns parent, product, component, and child relationships.',
    {
      featureId: z.string().describe('Feature ID to get relationships for'),
    },
    async (args) => {
      try {
        const input = GetRelationshipsInputSchema.parse(args);

        const response = await client.getRelationships(input.featureId);

        return toMcpSuccess(formatRelationships(input.featureId, response.data));
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_set_relationship - Set a relationship (US6)
  // ===========================================================================
  server.tool(
    'pb_set_relationship',
    'Set a relationship between a feature and another entity. ' +
      'Supported types: component, product, initiative, parent. ' +
      'Setting a relationship will replace any existing relationship of that type.',
    {
      featureId: z.string().describe('Feature ID'),
      relationshipType: z
        .enum(RELATIONSHIP_TYPES)
        .describe('Type of relationship (component, product, initiative, parent)'),
      targetId: z.string().describe('Target entity ID'),
    },
    async (args) => {
      try {
        const input = SetRelationshipInputSchema.parse(args);

        await client.setRelationship(input.featureId, input.relationshipType, input.targetId);

        // Fetch updated relationships to confirm
        const response = await client.getRelationships(input.featureId);

        return toMcpSuccess({
          message: `Relationship set successfully: ${input.relationshipType} = ${input.targetId}`,
          ...formatRelationships(input.featureId, response.data),
        });
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_remove_relationship - Remove a relationship (US6)
  // ===========================================================================
  server.tool(
    'pb_remove_relationship',
    'Remove a relationship from a feature. ' +
      'Supported types: component, product, initiative, parent.',
    {
      featureId: z.string().describe('Feature ID'),
      relationshipType: z
        .enum(RELATIONSHIP_TYPES)
        .describe('Type of relationship to remove'),
      targetId: z.string().describe('Target entity ID to unlink'),
    },
    async (args) => {
      try {
        const input = RemoveRelationshipInputSchema.parse(args);

        await client.removeRelationship(
          input.featureId,
          input.relationshipType,
          input.targetId
        );

        // Fetch updated relationships to confirm
        const response = await client.getRelationships(input.featureId);

        return toMcpSuccess({
          message: `Relationship removed successfully: ${input.relationshipType}`,
          ...formatRelationships(input.featureId, response.data),
        });
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
