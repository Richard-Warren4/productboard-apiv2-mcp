/**
 * ProductBoard API v2 Client
 *
 * HTTP client with authentication, rate limiting, and error handling.
 * Implements exponential backoff for rate limit errors (429).
 *
 * @module client/api
 */

import type {
  Feature,
  Subfeature,
  Component,
  Product,
  PaginatedResponse,
  EntityResponse,
  CreateFeatureInput,
  UpdateFeatureInput,
  CreateSubfeatureInput,
  UpdateSubfeatureInput,
} from './types.js';
import { ProductBoardError, handleApiError } from './errors.js';

const BASE_URL = 'https://api.productboard.com';
const API_VERSION = 'v2';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

interface RateLimitInfo {
  limit: number;
  remaining: number;
  retryAfter?: number;
}

interface ApiClientConfig {
  apiToken: string;
  baseUrl?: string;
}

/**
 * ProductBoard API Client
 *
 * Handles all HTTP communication with the ProductBoard API v2.
 */
export class ProductBoardClient {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config: ApiClientConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? `${BASE_URL}/${API_VERSION}`;
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Make an authenticated request to the ProductBoard API
   */
  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      params?: Record<string, string | undefined>;
    } = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    // Add query parameters
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        // Update rate limit info from headers
        this.updateRateLimitInfo(response.headers);

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = this.rateLimitInfo?.retryAfter ?? Math.pow(2, attempt);
          const backoffMs = retryAfter * 1000;
          await this.sleep(backoffMs);
          continue;
        }

        // Handle other errors
        if (!response.ok) {
          const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
          throw handleApiError(response.status, errorBody);
        }

        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof ProductBoardError) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));

        // Exponential backoff for network errors
        if (attempt < MAX_RETRIES - 1) {
          const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await this.sleep(backoffMs);
        }
      }
    }

    throw new ProductBoardError(
      'API_ERROR',
      `Request failed after ${MAX_RETRIES} attempts: ${lastError?.message ?? 'Unknown error'}`,
      500
    );
  }

  private updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const retryAfter = headers.get('Retry-After');

    if (limit && remaining) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // Feature Operations
  // ===========================================================================

  /**
   * List features with optional filters
   *
   * ProductBoard API v2 returns all configured fields by default.
   */
  async listFeatures(params?: {
    pageCursor?: string;
  }): Promise<PaginatedResponse<Feature>> {
    return this.request<PaginatedResponse<Feature>>('GET', '/entities', {
      params: {
        type: 'feature',
        pageCursor: params?.pageCursor,
      },
    });
  }

  /**
   * Get a single feature by ID
   *
   * ProductBoard API v2 returns all configured fields by default.
   */
  async getFeature(featureId: string): Promise<EntityResponse<Feature>> {
    return this.request<EntityResponse<Feature>>('GET', `/entities/${featureId}`);
  }

  /**
   * Create a new feature
   *
   * API expects: { data: { type, fields, relationships? } }
   */
  async createFeature(input: CreateFeatureInput): Promise<EntityResponse<Feature>> {
    const { parent, product, ...fields } = input;

    // Build relationships array if parent or product specified
    const relationships: Array<{ type: string; target: { id: string } }> = [];
    if (parent) {
      relationships.push({ type: 'parent', target: { id: parent.id } });
    }
    if (product) {
      relationships.push({ type: 'product', target: { id: product.id } });
    }

    return this.request<EntityResponse<Feature>>('POST', '/entities', {
      body: {
        data: {
          type: 'feature',
          fields,
          ...(relationships.length > 0 ? { relationships } : {}),
        },
      },
    });
  }

  /**
   * Update an existing feature
   *
   * API expects: { data: { fields: {...} } }
   */
  async updateFeature(
    featureId: string,
    input: UpdateFeatureInput
  ): Promise<EntityResponse<Feature>> {
    return this.request<EntityResponse<Feature>>('PATCH', `/entities/${featureId}`, {
      body: {
        data: {
          fields: input,
        },
      },
    });
  }

  /**
   * Search features with optional filters
   *
   * Uses the POST /entities/search endpoint.
   * API expects: { data: { type, name?, statuses?, owners?, parent? } }
   * (verified by live testing 2025-12-14 with ProductBoard examples)
   *
   * NOTE: The official docs show a `filter` property but that does NOT work.
   * Filters are passed as direct properties in the data object.
   *
   * @example
   * // Search by name (partial, case-insensitive matching)
   * searchFeatures({ name: 'Store Web App' })
   *
   * @example
   * // Search by status
   * searchFeatures({ statuses: [{ name: 'Released' }] })
   *
   * @example
   * // Search by owner email
   * searchFeatures({ owners: [{ email: 'john@example.com' }] })
   *
   * @example
   * // Search by parent feature
   * searchFeatures({ parent: { id: 'feature-uuid' } })
   *
   * @example
   * // Combined search: name + status
   * searchFeatures({ name: 'MVP', statuses: [{ name: 'In Progress' }] })
   */
  async searchFeatures(params?: {
    name?: string;
    statuses?: Array<{ name: string } | { id: string }>;
    owners?: Array<{ email: string } | { id: string }>;
    parent?: { id: string };
    pageCursor?: string;
  }): Promise<PaginatedResponse<Feature>> {
    const data: {
      type: string;
      name?: string;
      statuses?: Array<{ name: string } | { id: string }>;
      owners?: Array<{ email: string } | { id: string }>;
      parent?: { id: string };
    } = {
      type: 'feature',
    };

    // Add optional filters
    if (params?.name) {
      data.name = params.name;
    }
    if (params?.statuses && params.statuses.length > 0) {
      data.statuses = params.statuses;
    }
    if (params?.owners && params.owners.length > 0) {
      data.owners = params.owners;
    }
    if (params?.parent) {
      data.parent = params.parent;
    }

    return this.request<PaginatedResponse<Feature>>('POST', '/entities/search', {
      body: { data },
      params: {
        pageCursor: params?.pageCursor,
      },
    });
  }

  // ===========================================================================
  // Subfeature Operations
  // ===========================================================================

  /**
   * List subfeatures for a parent feature
   *
   * ProductBoard API v2 returns all configured fields by default.
   */
  async listSubfeatures(
    featureId: string,
    params?: { pageCursor?: string }
  ): Promise<PaginatedResponse<Subfeature>> {
    return this.request<PaginatedResponse<Subfeature>>('GET', '/entities', {
      params: {
        type: 'subfeature',
        'parent.id': featureId,
        pageCursor: params?.pageCursor,
      },
    });
  }

  /**
   * Get a single subfeature by ID
   *
   * ProductBoard API v2 returns all configured fields by default.
   */
  async getSubfeature(subfeatureId: string): Promise<EntityResponse<Subfeature>> {
    return this.request<EntityResponse<Subfeature>>('GET', `/entities/${subfeatureId}`);
  }

  /**
   * Create a new subfeature
   *
   * API expects: { data: { type, fields, relationships } }
   */
  async createSubfeature(input: CreateSubfeatureInput): Promise<EntityResponse<Subfeature>> {
    const { parent, ...fields } = input;

    // Parent is required for subfeatures
    const relationships = [{ type: 'parent', target: { id: parent.id } }];

    return this.request<EntityResponse<Subfeature>>('POST', '/entities', {
      body: {
        data: {
          type: 'subfeature',
          fields,
          relationships,
        },
      },
    });
  }

  /**
   * Update an existing subfeature
   *
   * API expects: { data: { fields: {...} } }
   */
  async updateSubfeature(
    subfeatureId: string,
    input: UpdateSubfeatureInput
  ): Promise<EntityResponse<Subfeature>> {
    return this.request<EntityResponse<Subfeature>>('PATCH', `/entities/${subfeatureId}`, {
      body: {
        data: {
          fields: input,
        },
      },
    });
  }

  // ===========================================================================
  // Component Operations
  // ===========================================================================

  /**
   * List components
   */
  async listComponents(params?: {
    productId?: string;
    pageCursor?: string;
  }): Promise<PaginatedResponse<Component>> {
    return this.request<PaginatedResponse<Component>>('GET', '/entities', {
      params: {
        type: 'component',
        'product.id': params?.productId,
        pageCursor: params?.pageCursor,
      },
    });
  }

  // ===========================================================================
  // Product Operations
  // ===========================================================================

  /**
   * List products
   */
  async listProducts(params?: { pageCursor?: string }): Promise<PaginatedResponse<Product>> {
    return this.request<PaginatedResponse<Product>>('GET', '/entities', {
      params: {
        type: 'product',
        pageCursor: params?.pageCursor,
      },
    });
  }

  // ===========================================================================
  // Relationship Operations
  // ===========================================================================

  /**
   * Get relationships for an entity
   */
  async getRelationships(entityId: string): Promise<{
    data: {
      parent?: { id: string; type: string };
      product?: { id: string; type: string };
      component?: { id: string; type: string };
      children?: Array<{ id: string; type: string }>;
    };
  }> {
    return this.request('GET', `/entities/${entityId}/relationships`);
  }

  /**
   * Set a relationship for an entity
   *
   * API expects: { data: { target: { id } } }
   */
  async setRelationship(
    entityId: string,
    relationshipType: string,
    targetId: string
  ): Promise<void> {
    await this.request('PUT', `/entities/${entityId}/relationships/${relationshipType}`, {
      body: {
        data: {
          target: { id: targetId },
        },
      },
    });
  }

  /**
   * Remove a relationship from an entity
   *
   * API path: DELETE /entities/{id}/relationships/{type}/{targetId}
   */
  async removeRelationship(
    entityId: string,
    relationshipType: string,
    targetId: string
  ): Promise<void> {
    await this.request(
      'DELETE',
      `/entities/${entityId}/relationships/${relationshipType}/${targetId}`
    );
  }

  // ===========================================================================
  // Configuration Operations
  // ===========================================================================

  /**
   * Get entity configuration
   */
  async getEntityConfiguration(entityType?: string): Promise<{
    data: Array<{
      type: string;
      fields: Array<{
        id: string;
        name: string;
        displayName: string;
        type: string;
        required: boolean;
        readOnly: boolean;
        options?: Array<{ id: string; name: string }>;
      }>;
    }>;
  }> {
    const path = entityType
      ? `/entities/configurations/${entityType}`
      : '/entities/configurations';
    return this.request('GET', path);
  }
}

/**
 * Create a ProductBoard client from environment configuration
 */
export function createClient(): ProductBoardClient {
  const rawToken = process.env.PRODUCTBOARD_API_TOKEN;

  if (!rawToken) {
    throw new ProductBoardError(
      'AUTH_FAILED',
      'PRODUCTBOARD_API_TOKEN environment variable is not set. ' +
        'Please set it to your ProductBoard API token.',
      401
    );
  }

  // Trim any whitespace/newlines that may have been introduced
  const apiToken = rawToken.trim();

  return new ProductBoardClient({ apiToken });
}
