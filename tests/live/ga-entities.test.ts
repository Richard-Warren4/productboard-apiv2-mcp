/**
 * Live integration tests for GA-only behaviour:
 *  - `initiative` and `keyResult` are now first-class entity types
 *  - `GET /entities` accepts `?type[]=...` array notation for multi-type listing
 *
 * Requires PRODUCTBOARD_API_TOKEN. Run with: npm run test:live
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '../../src/client/api.js';
import type { ProductBoardClient } from '../../src/client/api.js';

describe('ProductBoard API v2 GA — initiative & keyResult', () => {
  let client: ProductBoardClient;

  beforeAll(() => {
    if (!process.env.PRODUCTBOARD_API_TOKEN) {
      throw new Error(
        'PRODUCTBOARD_API_TOKEN environment variable is required for live tests.'
      );
    }
    client = createClient();
  });

  it('searches initiatives without 400', async () => {
    const response = await client.searchEntities('initiative');
    expect(response).toHaveProperty('data');
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('searches keyResults without 400', async () => {
    const response = await client.searchEntities('keyResult');
    expect(response).toHaveProperty('data');
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('lists features and initiatives in a single multi-type request', async () => {
    const response = await client.listEntities(['feature', 'initiative']);
    expect(response).toHaveProperty('data');
    expect(Array.isArray(response.data)).toBe(true);

    // If anything came back, every row must be one of the requested types.
    for (const entity of response.data) {
      expect(['feature', 'initiative']).toContain(entity.type);
    }
  });
});
