/**
 * Live Integration Tests for Configuration Discovery
 *
 * These tests verify the entity configuration API works.
 * Requires PRODUCTBOARD_API_TOKEN environment variable.
 *
 * Run with: npm run test:live
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '../../src/client/api.js';
import type { ProductBoardClient } from '../../src/client/api.js';

describe('Configuration Discovery (US1)', () => {
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

  describe('getEntityConfiguration - Feature', () => {
    it('should return configuration for feature entity type', async () => {
      const response = await client.getEntityConfiguration('feature');

      expect(response).toHaveProperty('data');
      // API returns data in some form (array or single config)
      expect(response.data).toBeDefined();
    });

    it('should include fields in the configuration', async () => {
      const response = await client.getEntityConfiguration('feature');

      // Data should have fields in some form
      if (Array.isArray(response.data)) {
        const featureConfig = response.data.find((c) => c.type === 'feature');
        expect(featureConfig).toBeDefined();
        expect(featureConfig).toHaveProperty('fields');
      } else {
        expect(response.data).toHaveProperty('fields');
      }
    });

    it('should have multiple fields defined', async () => {
      const response = await client.getEntityConfiguration('feature');

      let fields: unknown;
      if (Array.isArray(response.data)) {
        const featureConfig = response.data.find((c) => c.type === 'feature');
        fields = featureConfig?.fields;
      } else {
        fields = response.data.fields;
      }

      // Fields should exist and have content (array or object with keys)
      expect(fields).toBeDefined();
      if (Array.isArray(fields)) {
        expect(fields.length).toBeGreaterThan(0);
      } else if (typeof fields === 'object' && fields !== null) {
        expect(Object.keys(fields).length).toBeGreaterThan(0);
      }
    });
  });

  describe('getEntityConfiguration - Subfeature', () => {
    it('should return configuration for subfeature entity type', async () => {
      const response = await client.getEntityConfiguration('subfeature');

      expect(response).toHaveProperty('data');
      expect(response.data).toBeDefined();
    });

    it('should include fields for subfeature', async () => {
      const response = await client.getEntityConfiguration('subfeature');

      if (Array.isArray(response.data)) {
        const config = response.data.find((c) => c.type === 'subfeature');
        expect(config).toHaveProperty('fields');
      } else {
        expect(response.data).toHaveProperty('fields');
      }
    });
  });

  describe('getEntityConfiguration - All types', () => {
    it('should return configurations for all entity types when no type specified', async () => {
      const response = await client.getEntityConfiguration();

      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThanOrEqual(2);

      // Check that different types are present
      const types = response.data.map((c) => c.type);
      expect(types).toContain('feature');
      expect(types).toContain('subfeature');
    });
  });

  describe('Configuration Caching', () => {
    it('should return data on subsequent calls', async () => {
      // First call
      const response1 = await client.getEntityConfiguration('feature');
      // Second call
      const response2 = await client.getEntityConfiguration('feature');

      // Both should have data
      expect(response1.data).toBeDefined();
      expect(response2.data).toBeDefined();
    });

    it('should handle feature and subfeature configs separately', async () => {
      const featureResponse = await client.getEntityConfiguration('feature');
      const subfeatureResponse = await client.getEntityConfiguration('subfeature');

      expect(featureResponse.data).toBeDefined();
      expect(subfeatureResponse.data).toBeDefined();
    });
  });
});

describe('Configuration API Response Structure', () => {
  let client: ProductBoardClient;

  beforeAll(() => {
    client = createClient();
  });

  it('should return valid response structure for all configs', async () => {
    const response = await client.getEntityConfiguration();

    // Verify the response is an array of configs
    expect(Array.isArray(response.data)).toBe(true);

    // Each config should have type and fields
    for (const config of response.data) {
      expect(config).toHaveProperty('type');
      expect(config).toHaveProperty('fields');
    }
  });

  it('should include feature config with fields', async () => {
    const response = await client.getEntityConfiguration();
    const featureConfig = response.data.find((c) => c.type === 'feature');

    expect(featureConfig).toBeDefined();
    expect(featureConfig!.fields).toBeDefined();

    // Fields should have content (either array or object with fields)
    const fields = featureConfig!.fields;
    const fieldsList = Array.isArray(fields) ? fields : Object.values(fields);

    expect(fieldsList.length).toBeGreaterThan(0);

    // First field should have at least an id and name
    const field = fieldsList[0] as Record<string, unknown>;
    expect(field).toHaveProperty('id');
    expect(field).toHaveProperty('name');
    // Note: 'type' property may or may not be present depending on API version
  });
});
