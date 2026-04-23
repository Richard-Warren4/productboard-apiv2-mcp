/**
 * Unit tests for the ProductBoard client's query-param serialization.
 *
 * GA (March 2026) requires `?type[]=…` on `GET /entities` and rejects the
 * scalar `?type=feature` form with HTTP 400. Both single- and multi-type
 * listings therefore serialize as repeated `type[]=` entries; this file mocks
 * `fetch` so we can inspect the request URL the client builds.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProductBoardClient } from '../../src/client/api.js';

function mockFetchOnce(): { capturedUrl: () => string | null } {
  let url: string | null = null;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    url = typeof input === 'string' ? input : input.toString();
    return new Response(JSON.stringify({ data: [], links: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { capturedUrl: () => url };
}

describe('ProductBoardClient query parameter serialization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serializes a single entity type as ?type[]=feature (GA-required array form)', async () => {
    const { capturedUrl } = mockFetchOnce();
    const client = new ProductBoardClient({ apiToken: 'test' });
    await client.listEntities('feature');
    const url = capturedUrl();
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.searchParams.getAll('type[]')).toEqual(['feature']);
    expect(parsed.searchParams.get('type')).toBeNull();
  });

  it('serializes multiple entity types as repeated ?type[]= entries', async () => {
    const { capturedUrl } = mockFetchOnce();
    const client = new ProductBoardClient({ apiToken: 'test' });
    await client.listEntities(['feature', 'initiative']);
    const url = capturedUrl();
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.searchParams.getAll('type[]')).toEqual(['feature', 'initiative']);
    // Single-form key must be absent.
    expect(parsed.searchParams.get('type')).toBeNull();
  });

  it('preserves pageCursor alongside multi-type params', async () => {
    const { capturedUrl } = mockFetchOnce();
    const client = new ProductBoardClient({ apiToken: 'test' });
    await client.listEntities(['feature', 'objective'], { pageCursor: 'abc123' });
    const parsed = new URL(capturedUrl()!);
    expect(parsed.searchParams.get('pageCursor')).toBe('abc123');
    expect(parsed.searchParams.getAll('type[]')).toEqual(['feature', 'objective']);
  });

  it('uses ?type[]= for listProducts/listComponents/listFeatures helpers', async () => {
    const { capturedUrl } = mockFetchOnce();
    const client = new ProductBoardClient({ apiToken: 'test' });
    await client.listProducts();
    expect(new URL(capturedUrl()!).searchParams.getAll('type[]')).toEqual(['product']);

    const { capturedUrl: url2 } = mockFetchOnce();
    await client.listComponents();
    expect(new URL(url2()!).searchParams.getAll('type[]')).toEqual(['component']);

    const { capturedUrl: url3 } = mockFetchOnce();
    await client.listFeatures();
    expect(new URL(url3()!).searchParams.getAll('type[]')).toEqual(['feature']);
  });
});
