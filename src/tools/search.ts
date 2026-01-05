/**
 * Search MCP Tools
 *
 * MCP tools for searching ProductBoard features:
 * - pb_search_features: Search features with filters
 *
 * @module tools/search
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ProductBoardClient } from '../client/api.js';
import type { Feature } from '../client/types.js';
import { toMcpError, toMcpSuccess } from '../client/errors.js';
import { SearchFeaturesInputSchema } from '../schemas/inputs.js';
import { extractCursor, hasNextPage } from '../utils/pagination.js';

/**
 * Get team name(s) from feature fields
 */
function getTeamNames(feature: Feature): string {
  if (feature.fields.teams && feature.fields.teams.length > 0) {
    return feature.fields.teams.map((t) => t.name).join(', ');
  }
  if (feature.fields.team?.name) {
    return feature.fields.team.name;
  }
  return 'Unassigned';
}

/**
 * Format search results for AI-readable output
 */
function formatSearchResults(
  features: Feature[],
  appliedFilters: Record<string, string | string[]>,
  pagination: { nextCursor?: string; hasMore: boolean }
): Record<string, unknown> {
  return {
    results: features.map((f) => ({
      id: f.id,
      name: f.fields.name,
      status: f.fields.status?.name ?? 'No status',
      team: getTeamNames(f),
      owner: f.fields.owner?.name ?? f.fields.owner?.email ?? 'Unassigned',
      archived: f.fields.archived ?? false,
      updatedAt: f.updatedAt,
    })),
    totalReturned: features.length,
    appliedFilters: Object.keys(appliedFilters).length > 0 ? appliedFilters : undefined,
    nextCursor: pagination.nextCursor ?? null,
    hasMoreResults: pagination.hasMore,
  };
}

/**
 * Register search tools with the MCP server
 */
export function registerSearchTools(server: McpServer, client: ProductBoardClient): void {
  // ===========================================================================
  // pb_search_features - Search features with filters (US5)
  // ===========================================================================
  server.tool(
    'pb_search_features',
    'Search ProductBoard features by name and/or filter by status, owner, team. ' +
      'Use this to find specific features across your workspace. ' +
      'Supports filtering by status name (e.g., "Released", "In Progress") or owner email.',
    {
      query: z.string().optional().describe('Search query (filters by name contains)'),
      statusNames: z
        .array(z.string())
        .optional()
        .describe('Filter by status names (e.g., ["Released", "In Progress"])'),
      ownerEmails: z
        .array(z.string())
        .optional()
        .describe('Filter by owner emails'),
      teamId: z.string().optional().describe('Filter by team ID'),
      teamName: z.string().optional().describe('Filter by team name'),
      pageCursor: z.string().optional().describe('Cursor for pagination'),
    },
    async (args) => {
      try {
        // Validate input
        const input = SearchFeaturesInputSchema.parse(args);

        // Build search filters for API
        const searchParams: {
          statuses?: Array<{ name: string }>;
          owners?: Array<{ email: string }>;
          pageCursor?: string;
        } = {};

        const appliedFilters: Record<string, string | string[]> = {};

        // Add status filter
        if (args.statusNames && Array.isArray(args.statusNames) && args.statusNames.length > 0) {
          searchParams.statuses = args.statusNames.map((name: string) => ({ name }));
          appliedFilters.statuses = args.statusNames;
        }

        // Add owner filter
        if (args.ownerEmails && Array.isArray(args.ownerEmails) && args.ownerEmails.length > 0) {
          searchParams.owners = args.ownerEmails.map((email: string) => ({ email }));
          appliedFilters.owners = args.ownerEmails;
        }

        if (input.pageCursor) {
          searchParams.pageCursor = input.pageCursor;
        }

        // Use searchFeatures API if we have API-level filters
        let features: Feature[];
        let nextCursor: string | undefined;
        let hasMore: boolean;

        if (searchParams.statuses || searchParams.owners) {
          // Use search API with filters
          const response = await client.searchFeatures(searchParams);
          features = response.data;
          nextCursor = extractCursor(response.links.next);
          hasMore = hasNextPage(response);
        } else {
          // Fall back to listFeatures for basic queries
          const response = await client.listFeatures({ pageCursor: input.pageCursor });
          features = response.data;
          nextCursor = extractCursor(response.links.next);
          hasMore = hasNextPage(response);
        }

        // Apply client-side filters for query and team (not supported by API)
        if (input.query) {
          const queryLower = input.query.toLowerCase();
          features = features.filter((f) => f.fields.name.toLowerCase().includes(queryLower));
          appliedFilters.query = input.query;
        }

        if (input.teamId) {
          features = features.filter((f) => {
            if (f.fields.teams && f.fields.teams.length > 0) {
              return f.fields.teams.some((t) => t.id === input.teamId);
            }
            return f.fields.team?.id === input.teamId;
          });
          appliedFilters.teamId = input.teamId;
        } else if (input.teamName) {
          const teamNameLower = input.teamName.toLowerCase();
          features = features.filter((f) => {
            if (f.fields.teams && f.fields.teams.length > 0) {
              return f.fields.teams.some((t) => t.name.toLowerCase() === teamNameLower);
            }
            return f.fields.team?.name.toLowerCase() === teamNameLower;
          });
          appliedFilters.teamName = input.teamName;
        }

        // Format response
        const result = formatSearchResults(features, appliedFilters, {
          nextCursor,
          hasMore,
        });

        // Add helpful message if no results
        if (features.length === 0) {
          return toMcpSuccess({
            ...result,
            message:
              'No features found matching your search criteria. Try broadening your search or use pb_list_features to see all features.',
          });
        }

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
