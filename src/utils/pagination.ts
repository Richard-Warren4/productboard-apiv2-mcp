/**
 * Pagination Utilities
 *
 * Helpers for handling cursor-based pagination in ProductBoard API v2.
 *
 * @module utils/pagination
 */

import type { PaginatedResponse } from '../client/types.js';

/**
 * Extract the page cursor from a "next" link URL
 */
export function extractCursor(nextUrl: string | null | undefined): string | undefined {
  if (nextUrl === null || nextUrl === undefined || nextUrl === '') {
    return undefined;
  }

  try {
    const url = new URL(nextUrl);
    return url.searchParams.get('pageCursor') ?? undefined;
  } catch {
    // If URL parsing fails, treat the entire string as the cursor
    return nextUrl;
  }
}

/**
 * Check if there are more pages available
 *
 * The API sends `links.next: null` on the last page (not a missing property),
 * so null must be treated as "no more pages" too.
 */
export function hasNextPage<T>(response: PaginatedResponse<T>): boolean {
  return response.links.next != null && response.links.next !== '';
}

/**
 * Format pagination info for display
 */
export function formatPaginationInfo<T>(
  response: PaginatedResponse<T>,
  currentPage: number = 1
): string {
  const itemCount = response.data.length;
  const hasMore = hasNextPage(response);

  if (hasMore) {
    return `Showing ${itemCount} items (page ${currentPage}). More results available.`;
  }

  return `Showing ${itemCount} items (page ${currentPage}). No more results.`;
}

/**
 * Async generator to iterate through all pages
 *
 * @example
 * ```typescript
 * const allFeatures: Feature[] = [];
 * for await (const page of fetchAllPages(client.listFeatures.bind(client))) {
 *   allFeatures.push(...page.data);
 * }
 * ```
 */
export async function* fetchAllPages<T>(
  fetchFn: (params: { pageCursor?: string }) => Promise<PaginatedResponse<T>>,
  maxPages: number = 100
): AsyncGenerator<PaginatedResponse<T>> {
  let pageCursor: string | undefined = undefined;
  let pageCount = 0;

  do {
    const response = await fetchFn({ pageCursor });
    yield response;

    pageCursor = extractCursor(response.links.next);
    pageCount++;
  } while (pageCursor && pageCount < maxPages);
}

/**
 * Collect all items from paginated responses
 *
 * @param fetchFn - Function that fetches a page
 * @param maxPages - Maximum number of pages to fetch (default: 100)
 * @returns Array of all items across all pages
 */
export async function collectAllPages<T>(
  fetchFn: (params: { pageCursor?: string }) => Promise<PaginatedResponse<T>>,
  maxPages: number = 100
): Promise<T[]> {
  const allItems: T[] = [];

  for await (const page of fetchAllPages(fetchFn, maxPages)) {
    allItems.push(...page.data);
  }

  return allItems;
}
