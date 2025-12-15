/**
 * Live Integration Tests for ProductBoard API Client
 *
 * These tests call the actual ProductBoard API and require:
 * - PRODUCTBOARD_API_TOKEN environment variable to be set
 * - Network access to api.productboard.com
 *
 * Run with: npm run test:live
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '../../src/client/api.js';
import type { ProductBoardClient } from '../../src/client/api.js';

describe('ProductBoard Live API Tests', () => {
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

  describe('listFeatures', () => {
    it('should return a list of features with correct structure', async () => {
      const response = await client.listFeatures();

      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Check first feature has expected structure
      const feature = response.data[0];
      expect(feature).toHaveProperty('id');
      expect(feature).toHaveProperty('type', 'feature');
      expect(feature).toHaveProperty('fields');
      expect(feature).toHaveProperty('createdAt');
      expect(feature).toHaveProperty('updatedAt');
      expect(feature).toHaveProperty('links');

      // Check fields structure
      expect(feature.fields).toHaveProperty('name');
      expect(typeof feature.fields.name).toBe('string');
    });

    it('should include status field when present', async () => {
      const response = await client.listFeatures();

      // Find a feature with status
      const featureWithStatus = response.data.find((f) => f.fields.status);

      if (featureWithStatus) {
        expect(featureWithStatus.fields.status).toHaveProperty('id');
        expect(featureWithStatus.fields.status).toHaveProperty('name');
        expect(typeof featureWithStatus.fields.status!.name).toBe('string');
      }
    });

    it('should include owner field when present', async () => {
      const response = await client.listFeatures();

      // Find a feature with owner
      const featureWithOwner = response.data.find((f) => f.fields.owner);

      if (featureWithOwner) {
        expect(featureWithOwner.fields.owner).toHaveProperty('id');
        expect(featureWithOwner.fields.owner).toHaveProperty('email');
        expect(typeof featureWithOwner.fields.owner!.email).toBe('string');
      }
    });

    it('should include teams array when present', async () => {
      const response = await client.listFeatures();

      // Find a feature with teams
      const featureWithTeams = response.data.find(
        (f) => f.fields.teams && f.fields.teams.length > 0
      );

      if (featureWithTeams) {
        expect(Array.isArray(featureWithTeams.fields.teams)).toBe(true);
        const team = featureWithTeams.fields.teams![0];
        expect(team).toHaveProperty('id');
        expect(team).toHaveProperty('name');
      }
    });

    it('should support pagination', async () => {
      const response = await client.listFeatures();

      expect(response).toHaveProperty('links');

      // If there's a next page, the cursor should be present
      if (response.links.next) {
        expect(typeof response.links.next).toBe('string');
      }
    });
  });

  describe('getFeature', () => {
    let featureId: string;

    beforeAll(async () => {
      // Get a feature ID to test with
      const response = await client.listFeatures();
      featureId = response.data[0].id;
    });

    it('should return a single feature with full details', async () => {
      const response = await client.getFeature(featureId);

      expect(response).toHaveProperty('data');
      expect(response.data).toHaveProperty('id', featureId);
      expect(response.data).toHaveProperty('type', 'feature');
      expect(response.data).toHaveProperty('fields');
      expect(response.data.fields).toHaveProperty('name');
    });

    it('should include relationships when present', async () => {
      const response = await client.getFeature(featureId);

      // Relationships may or may not be present
      if (response.data.relationships) {
        expect(response.data.relationships).toHaveProperty('data');
        expect(Array.isArray(response.data.relationships.data)).toBe(true);
      }
    });

    it('should throw error for non-existent feature', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(client.getFeature(fakeId)).rejects.toThrow();
    });
  });

  // Note: searchFeatures uses POST /entities/search
  // API expects: { data: { type, statuses?, owners?, parent? } }
  // (verified by live testing 2025-12-14 with ProductBoard examples)
  //
  // NOTE: The official docs show a `filter` property but that does NOT work.
  // Filters are passed as direct properties in the data object.
  // Reference: https://developer.productboard.com/v2.0.0/reference/searchentities
  describe('searchFeatures', () => {
    it('should return features using search endpoint', async () => {
      const response = await client.searchFeatures();

      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Check structure matches listFeatures
      const feature = response.data[0];
      expect(feature).toHaveProperty('id');
      expect(feature).toHaveProperty('type', 'feature');
      expect(feature).toHaveProperty('fields');
      expect(feature.fields).toHaveProperty('name');
    });

    it('should filter by status name', async () => {
      const response = await client.searchFeatures({
        statuses: [{ name: 'Released' }],
      });

      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);

      // All returned features should have Released status
      response.data.forEach((feature) => {
        expect(feature.fields.status?.name).toBe('Released');
      });
    });

    it('should support pagination', async () => {
      const response = await client.searchFeatures();

      expect(response).toHaveProperty('links');
      // Pagination cursor may or may not be present depending on result count
    });
  });
});

describe('Subfeature Operations', () => {
  let client: ProductBoardClient;
  let parentFeatureId: string;

  beforeAll(async () => {
    client = createClient();
    // Get a feature to use as parent for subfeature tests
    const response = await client.listFeatures();
    parentFeatureId = response.data[0].id;
  });

  describe('createSubfeature', () => {
    it('should create a subfeature with minimal fields', async () => {
      const testName = `Test Subfeature ${Date.now()}`;

      const response = await client.createSubfeature({
        name: testName,
        parent: { id: parentFeatureId },
      });

      // Response should have either full entity OR at least an id
      expect(response).toHaveProperty('data');
      expect(response.data).toHaveProperty('id');

      // If fields are present, verify structure
      if (response.data.fields) {
        expect(response.data.fields).toHaveProperty('name');
        expect(response.data).toHaveProperty('type', 'subfeature');
      }
    });

    it('should create a subfeature with description', async () => {
      const testName = `Test Subfeature with Desc ${Date.now()}`;

      const response = await client.createSubfeature({
        name: testName,
        parent: { id: parentFeatureId },
        description: { value: '<p>Test description</p>' },
      });

      expect(response).toHaveProperty('data');
      expect(response.data).toHaveProperty('id');
    });
  });

  describe('listSubfeatures', () => {
    it('should list subfeatures for a parent feature', async () => {
      const response = await client.listSubfeatures(parentFeatureId);

      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);
    });
  });
});

describe('Feature Formatting', () => {
  let client: ProductBoardClient;

  beforeAll(() => {
    client = createClient();
  });

  it('should handle features with multiple teams', async () => {
    const response = await client.listFeatures();

    // Find a feature with multiple teams
    const multiTeamFeature = response.data.find(
      (f) => f.fields.teams && f.fields.teams.length > 1
    );

    if (multiTeamFeature) {
      // Verify teams structure
      expect(multiTeamFeature.fields.teams!.length).toBeGreaterThan(1);
      multiTeamFeature.fields.teams!.forEach((team) => {
        expect(team).toHaveProperty('id');
        expect(team).toHaveProperty('name');
      });
    }
  });

  it('should handle archived features', async () => {
    const response = await client.listFeatures();

    // Find an archived feature
    const archivedFeature = response.data.find((f) => f.fields.archived === true);

    if (archivedFeature) {
      expect(archivedFeature.fields.archived).toBe(true);
    }
  });

  it('should handle features without optional fields', async () => {
    const response = await client.listFeatures();

    // All features should have required fields even if optional ones are missing
    response.data.forEach((feature) => {
      expect(feature.id).toBeDefined();
      expect(feature.type).toBe('feature');
      expect(feature.fields.name).toBeDefined();
      expect(feature.createdAt).toBeDefined();
      expect(feature.updatedAt).toBeDefined();
    });
  });
});
