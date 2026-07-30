/**
 * Live Integration Tests for the Jira Integration Client Methods
 *
 * Read-only: these tests only call GET endpoints and never create, update,
 * or remove a Jira integration or connection.
 *
 * Requires PRODUCTBOARD_API_TOKEN environment variable.
 *
 * Run with: npm run test:live
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '../../src/client/api.js';
import type { ProductBoardClient } from '../../src/client/api.js';

describe('Jira Integrations', () => {
  let client: ProductBoardClient;

  beforeAll(() => {
    if (!process.env.PRODUCTBOARD_API_TOKEN) {
      throw new Error(
        'PRODUCTBOARD_API_TOKEN environment variable is required for live tests.\n' +
          'Add to your shell profile: export PRODUCTBOARD_API_TOKEN="your-token-here"'
      );
    }
    client = createClient();
  });

  describe('listJiraIntegrations', () => {
    it('should return at least one configured integration', async () => {
      const response = await client.listJiraIntegrations();

      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    it('should include id, name and status for each integration', async () => {
      const response = await client.listJiraIntegrations();

      for (const integration of response.data) {
        expect(integration).toHaveProperty('id');
        expect(integration.fields).toHaveProperty('name');
        expect(integration.fields).toHaveProperty('integrationStatus');
      }
    });
  });

  describe('listJiraIntegrationConnections', () => {
    it('should return connections for the first configured integration', async () => {
      const integrationsResponse = await client.listJiraIntegrations();
      const firstIntegration = integrationsResponse.data[0];
      expect(firstIntegration).toBeDefined();

      const connections = await client.listJiraIntegrationConnections(firstIntegration.id);

      expect(connections).toHaveProperty('data');
      expect(Array.isArray(connections.data)).toBe(true);
    });

    it('should return connections shaped as {id, fields: {issueKey, issueId}}', async () => {
      const integrationsResponse = await client.listJiraIntegrations();

      // Find an integration that actually has connections (some may be empty).
      let sample: { id: string; fields: { issueKey: string; issueId: string } } | undefined;
      for (const integration of integrationsResponse.data) {
        const connections = await client.listJiraIntegrationConnections(integration.id);
        if (connections.data.length > 0) {
          sample = connections.data[0];
          break;
        }
      }

      expect(sample).toBeDefined();
      expect(sample).toHaveProperty('id');
      expect(sample!.fields).toHaveProperty('issueKey');
      expect(sample!.fields).toHaveProperty('issueId');
      expect(typeof sample!.fields.issueKey).toBe('string');
    });
  });
});
