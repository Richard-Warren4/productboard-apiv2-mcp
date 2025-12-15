/**
 * Relationship MCP Tools
 *
 * MCP tools for managing ProductBoard entity relationships:
 * - pb_get_relationships: Get all relationships for an entity
 * - pb_create_relationship: Create a new relationship (POST endpoint)
 * - pb_set_relationship: Set/replace a single-target relationship (PUT endpoint)
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
 * Valid relationship types for POST /entities/{id}/relationships
 *
 * - parent: identifies target as parent of source entity
 * - child: identifies target as child of source entity
 * - link: non-hierarchical connection (e.g., feature to objective)
 * - isBlockedBy: dependency - source is blocked by target
 * - isBlocking: dependency - source blocks target
 */
const CREATE_RELATIONSHIP_TYPES = ['parent', 'child', 'link', 'isBlockedBy', 'isBlocking'] as const;

/**
 * Format relationships for AI-readable output
 */
function formatRelationships(
  entityId: string,
  relationships: Array<{
    type: string;
    target: {
      id: string;
      type: string;
      links?: { self: string };
    };
  }>
): Record<string, unknown> {
  // Group relationships by type
  const grouped: Record<string, Array<{ id: string; type: string }>> = {};
  for (const rel of relationships) {
    if (!grouped[rel.type]) {
      grouped[rel.type] = [];
    }
    grouped[rel.type].push({ id: rel.target.id, type: rel.target.type });
  }

  return {
    entityId,
    relationships: grouped,
    summary: {
      totalCount: relationships.length,
      types: Object.keys(grouped),
      byType: Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length])),
    },
  };
}

/**
 * Register relationship tools with the MCP server
 */
export function registerRelationshipTools(server: McpServer, client: ProductBoardClient): void {
  // ===========================================================================
  // pb_get_relationships - Get all relationships for an entity (US6)
  // ===========================================================================
  server.tool(
    'pb_get_relationships',
    'Get all relationships for a ProductBoard entity. ' +
      'Returns parent, child, link, isBlockedBy, and isBlocking relationships.',
    {
      featureId: z.string().describe('Entity ID to get relationships for'),
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
  // pb_create_relationship - Create a new relationship (POST endpoint)
  // ===========================================================================
  server.tool(
    'pb_create_relationship',
    'Create a relationship between entities. ' +
      'Use this to link features to objectives, create dependencies, or establish parent/child relationships. ' +
      'Supported types: parent, child, link (for feature-to-objective), isBlockedBy, isBlocking.',
    {
      entityId: z.string().describe('Source entity ID'),
      relationshipType: z
        .enum(CREATE_RELATIONSHIP_TYPES)
        .describe('Type of relationship: parent, child, link, isBlockedBy, isBlocking'),
      targetId: z.string().describe('Target entity ID'),
    },
    async (args) => {
      try {
        const { entityId, relationshipType, targetId } = args as {
          entityId: string;
          relationshipType: (typeof CREATE_RELATIONSHIP_TYPES)[number];
          targetId: string;
        };

        const response = await client.createRelationship(entityId, relationshipType, targetId);

        // Fetch updated relationships to confirm
        const allRelationships = await client.getRelationships(entityId);

        return toMcpSuccess({
          message: `Relationship created successfully: ${relationshipType} -> ${response.data.target.type}:${targetId}`,
          created: response.data,
          ...formatRelationships(entityId, allRelationships.data),
        });
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_set_relationship - Set/replace a single-target relationship (PUT endpoint)
  // ===========================================================================
  server.tool(
    'pb_set_relationship',
    'Set or replace a single-target relationship for an entity. ' +
      'Use this for relationships like parent that can only have one target. ' +
      'For multi-target relationships (like links), use pb_create_relationship instead.',
    {
      featureId: z.string().describe('Entity ID'),
      relationshipType: z
        .enum(CREATE_RELATIONSHIP_TYPES)
        .describe('Type of relationship'),
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
    'Remove a relationship from an entity. ' +
      'Supported types: parent, child, link, isBlockedBy, isBlocking.',
    {
      featureId: z.string().describe('Entity ID'),
      relationshipType: z
        .enum(CREATE_RELATIONSHIP_TYPES)
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
