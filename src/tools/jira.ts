/**
 * Jira Integration MCP Tools
 *
 * MCP tools for reading Productboard's native Jira integration:
 * - pb_list_jira_integrations: List Jira integrations configured in the workspace
 * - pb_get_jira_links: List Productboard entity <-> Jira issue links (epic/issue keys)
 *
 * Endpoints verified live 2026-07-30 against a real workspace — see
 * .specify/memory/productboard-v2api-ref-urls.md for the confirmed shapes.
 * These are read-only: this module never creates, updates, or removes a
 * Jira integration or connection.
 *
 * @module tools/jira
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ProductBoardClient } from '../client/api.js';
import { toMcpError, toMcpSuccess } from '../client/errors.js';
import { ListJiraIntegrationsInputSchema, GetJiraLinksInputSchema } from '../schemas/inputs.js';
import { extractCursor } from '../utils/pagination.js';

/** Safety cap on pages fetched per integration, matching pb_entity_search's convention. */
const MAX_PAGES_PER_INTEGRATION = 50;

/**
 * Register Jira integration tools with the MCP server
 */
export function registerJiraTools(server: McpServer, client: ProductBoardClient): void {
  // ===========================================================================
  // pb_list_jira_integrations - List Jira integrations configured in the workspace
  // ===========================================================================
  server.tool(
    'pb_list_jira_integrations',
    'List Jira integrations configured in this ProductBoard workspace. ' +
      'A workspace can have more than one (e.g. a legacy integration from before a Jira ' +
      'site migration, alongside a current one) — always check all of them, not just one. ' +
      'Use the returned integration IDs with pb_get_jira_links.',
    {},
    async (args) => {
      try {
        ListJiraIntegrationsInputSchema.parse(args);

        const response = await client.listJiraIntegrations();

        const result = {
          integrations: response.data.map((i) => ({
            id: i.id,
            name: i.fields.name,
            status: i.fields.integrationStatus,
            createdAt: i.createdAt,
            productboardUrl: i.links.html,
          })),
          totalReturned: response.data.length,
        };

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  // ===========================================================================
  // pb_get_jira_links - List Productboard <-> Jira links, across all integrations
  // ===========================================================================
  server.tool(
    'pb_get_jira_links',
    'Get the real Productboard <-> Jira issue/epic links (not a custom field — this reads ' +
      "ProductBoard's native Jira integration connection table directly). Sweeps every " +
      'configured Jira integration and returns every link found, as {featureId, issueKey, ' +
      'issueId, integrationId, integrationName}. featureId is the Productboard feature/entity ' +
      'UUID — join it against pb_entity_search results to check which features have (or lack) ' +
      'an epic link. Pass featureIds to narrow the result to specific features (the API has no ' +
      'server-side filter for this, so narrowing still requires a full sweep — it only trims ' +
      'the returned rows). Read-only: never creates, updates, or removes a link.',
    {
      featureIds: z
        .array(z.string())
        .optional()
        .describe(
          'Optional: only return links for these Productboard feature/entity IDs. Omit to return every link in the workspace.'
        ),
    },
    async (args) => {
      try {
        const input = GetJiraLinksInputSchema.parse(args);
        const wantedIds = input.featureIds ? new Set(input.featureIds) : null;

        const integrationsResponse = await client.listJiraIntegrations();
        const integrations = integrationsResponse.data;

        const links: Array<{
          featureId: string;
          issueKey: string;
          issueId: string;
          integrationId: string;
          integrationName: string;
        }> = [];

        const byIntegration: Record<string, { name: string; count: number; truncated: boolean }> =
          {};

        for (const integration of integrations) {
          let cursor: string | undefined;
          let pagesFetched = 0;
          let integrationCount = 0;
          let truncated = false;

          do {
            const page = await client.listJiraIntegrationConnections(integration.id, {
              pageCursor: cursor,
            });
            pagesFetched++;

            for (const connection of page.data) {
              if (wantedIds && !wantedIds.has(connection.id)) continue;
              links.push({
                featureId: connection.id,
                issueKey: connection.fields.issueKey,
                issueId: connection.fields.issueId,
                integrationId: integration.id,
                integrationName: integration.fields.name,
              });
              integrationCount++;
            }

            cursor = extractCursor(page.links.next);
            if (cursor && pagesFetched >= MAX_PAGES_PER_INTEGRATION) {
              truncated = true;
              break;
            }
          } while (cursor);

          byIntegration[integration.id] = {
            name: integration.fields.name,
            count: integrationCount,
            truncated,
          };
        }

        const anyTruncated = Object.values(byIntegration).some((i) => i.truncated);

        const result = {
          links,
          totalReturned: links.length,
          appliedFilters: wantedIds ? { featureIds: Array.from(wantedIds) } : undefined,
          byIntegration,
          ...(anyTruncated
            ? {
                warning:
                  `Hit the ${MAX_PAGES_PER_INTEGRATION}-page safety cap on at least one integration — ` +
                  'results are incomplete for that integration. Never present this as the full link table.',
              }
            : {}),
        };

        return toMcpSuccess(result);
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
