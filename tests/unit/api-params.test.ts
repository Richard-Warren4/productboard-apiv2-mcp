/**
 * Unit tests for the ProductBoard client's query-param serialization.
 *
 * The GA API (March 2026 changelog) accepts `?type[]=feature&type[]=initiative`
 * for multi-type listing on `GET /entities`. This file mocks `fetch` so we can
 * inspect the request URL the client builds and assert the array notation.
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

  it('serializes a single entity type as ?type=feature', async () => {
    const { capturedUrl } = mockFetchOnce();
    const client = new ProductBoardClient({ apiToken: 'test' });
    await client.listEntities('feature');
    const url = capturedUrl();
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.searchParams.get('type')).toBe('feature');
    expect(parsed.searchParams.getAll('type[]')).toEqual([]);
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
});
