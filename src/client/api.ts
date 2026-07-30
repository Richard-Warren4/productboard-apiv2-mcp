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
  GenericEntity,
  EntityType,
  WritableEntityType,
  SearchableEntityType,
  JiraIntegration,
  JiraIntegrationConnection,
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
   * Make an authenticated request to the ProductBoard API.
   *
   * Query params accept either a scalar string or a string[]. Arrays are serialized
   * as repeated `key[]=value` entries (e.g. `type[]=feature&type[]=initiative`),
   * which is the form ProductBoard documented in their March 2026 changelog for
   * multi-type listing on `GET /entities`.
   */
  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      params?: Record<string, string | string[] | undefined>;
    } = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    // Add query parameters; arrays become repeated `key[]=value` entries.
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value === undefined) return;
        if (Array.isArray(value)) {
          const arrayKey = key.endsWith('[]') ? key : `${key}[]`;
          for (const item of value) {
            url.searchParams.append(arrayKey, item);
          }
        } else {
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
        type: ['feature'],
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
   * Uses the POST /entities/search endpoint with the structured `filter`
   * request body (see searchEntities for the format).
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
    return this.searchEntities('feature', params, {
      pageCursor: params?.pageCursor,
    }) as Promise<PaginatedResponse<Feature>>;
  }

  // ===========================================================================
  // Subfeature Operations
  // ===========================================================================

  /**
   * List subfeatures for a parent feature
   *
   * Uses the search endpoint with parent filter since GET /entities
   * doesn't support parent.id query parameter.
   */
  async listSubfeatures(
    featureId: string,
    params?: { pageCursor?: string }
  ): Promise<PaginatedResponse<Subfeature>> {
    return this.searchEntities('subfeature', { parent: { id: featureId } }, params) as Promise<
      PaginatedResponse<Subfeature>
    >;
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
        type: ['component'],
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
        type: ['product'],
        pageCursor: params?.pageCursor,
      },
    });
  }

  // ===========================================================================
  // Relationship Operations
  // ===========================================================================

  /**
   * Get relationships for an entity
   *
   * Returns all relationships including: parent, child, link, isBlockedBy, isBlocking
   */
  async getRelationships(entityId: string): Promise<{
    data: Array<{
      type: string;
      target: {
        id: string;
        type: string;
        links?: { self: string };
      };
    }>;
    links: { next: string | null };
  }> {
    return this.request('GET', `/entities/${entityId}/relationships`);
  }

  /**
   * Create a relationship between entities
   *
   * Uses POST /entities/{id}/relationships endpoint.
   * This is the preferred method for creating relationships like linking features to objectives.
   *
   * Supported relationship types:
   * - `parent` - identifies target as parent of source entity
   * - `child` - identifies target as child of source entity
   * - `link` - non-hierarchical connection (e.g., feature to objective)
   * - `isBlockedBy` - dependency: source is blocked by target
   * - `isBlocking` - dependency: source blocks target
   *
   * @example
   * // Link a feature to an objective
   * await client.createRelationship(featureId, 'link', objectiveId);
   *
   * @example
   * // Create a blocking dependency
   * await client.createRelationship(featureId, 'isBlockedBy', otherFeatureId);
   */
  async createRelationship(
    entityId: string,
    relationshipType: 'parent' | 'child' | 'link' | 'isBlockedBy' | 'isBlocking',
    targetId: string
  ): Promise<{
    data: {
      type: string;
      target: {
        id: string;
        type: string;
        links?: { self: string };
      };
    };
    links: { self: string };
  }> {
    return this.request('POST', `/entities/${entityId}/relationships`, {
      body: {
        data: {
          target: { id: targetId },
          type: relationshipType,
        },
      },
    });
  }

  /**
   * Set/replace a single-target relationship for an entity
   *
   * Uses PUT /entities/{id}/relationships/{type} endpoint.
   * Use this for relationships that have a single target (like parent).
   * For multi-target relationships (like links), use createRelationship instead.
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
  // Jira Integration Operations
  //
  // Verified live 2026-07-30 (see .specify/memory/productboard-v2api-ref-urls.md).
  // Not covered by the generic /entities endpoints — Jira integrations and their
  // feature<->issue connections live under their own /jira-integrations path.
  // ===========================================================================

  /**
   * List Jira integrations configured in the workspace.
   *
   * A workspace can have more than one (e.g. a legacy integration from before a
   * Jira site migration, alongside a current one) — always enumerate all of them
   * rather than assuming a single integration.
   */
  async listJiraIntegrations(): Promise<PaginatedResponse<JiraIntegration>> {
    return this.request<PaginatedResponse<JiraIntegration>>('GET', '/jira-integrations');
  }

  /**
   * List Productboard entity <-> Jira issue connections for one integration.
   *
   * `data[].id` in the response is the Productboard feature/entity UUID — the API
   * uses the entity ID as the connection's own ID, there is no separate connection
   * identifier. Paginated the same way as /entities (cursor via `links.next`).
   */
  async listJiraIntegrationConnections(
    integrationId: string,
    params?: { pageCursor?: string }
  ): Promise<PaginatedResponse<JiraIntegrationConnection>> {
    return this.request<PaginatedResponse<JiraIntegrationConnection>>(
      'GET',
      `/jira-integrations/${integrationId}/connections`,
      { params: { pageCursor: params?.pageCursor } }
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

  // ===========================================================================
  // Generic Entity Operations
  // ===========================================================================

  /**
   * Get a single entity by ID (any entity type)
   *
   * The entity type is auto-detected from the response.
   */
  async getEntity(entityId: string): Promise<EntityResponse<GenericEntity>> {
    return this.request<EntityResponse<GenericEntity>>('GET', `/entities/${entityId}`);
  }

  /**
   * Create a new entity of any writable type
   *
   * API expects: { data: { type, fields, relationships? } }
   *
   * @param entityType - The type of entity to create (user is not allowed)
   * @param fields - Field values for the entity
   * @param relationships - Optional relationships (e.g., parent)
   */
  async createEntity(
    entityType: WritableEntityType,
    fields: Record<string, unknown>,
    relationships?: Array<{ type: string; target: { id: string } }>
  ): Promise<EntityResponse<GenericEntity>> {
    return this.request<EntityResponse<GenericEntity>>('POST', '/entities', {
      body: {
        data: {
          type: entityType,
          fields,
          ...(relationships && relationships.length > 0 ? { relationships } : {}),
        },
      },
    });
  }

  /**
   * Update an existing entity
   *
   * API expects: { data: { fields: {...} } }
   *
   * @param entityId - The entity UUID
   * @param fields - Field values to update (partial update)
   */
  async updateEntity(
    entityId: string,
    fields: Record<string, unknown>
  ): Promise<EntityResponse<GenericEntity>> {
    return this.request<EntityResponse<GenericEntity>>('PATCH', `/entities/${entityId}`, {
      body: {
        data: {
          fields,
        },
      },
    });
  }

  /**
   * List entities of one or more types with pagination.
   *
   * Serializes `type` as repeated `?type[]=feature&type[]=initiative` entries —
   * GA (March 2026) rejects the scalar `?type=feature` form with HTTP 400
   * ("Unable to parse JSON - Unrecognized token 'feature'"), so a single type
   * is sent as a one-element array.
   *
   * NOTE: ProductBoard API v2 does NOT support pageSize parameter.
   * It returns 100 items per page. Use pageCursor for subsequent pages.
   */
  async listEntities(
    entityTypeOrTypes: EntityType | EntityType[],
    params?: {
      pageCursor?: string;
    }
  ): Promise<PaginatedResponse<GenericEntity>> {
    const types = Array.isArray(entityTypeOrTypes) ? entityTypeOrTypes : [entityTypeOrTypes];
    return this.request<PaginatedResponse<GenericEntity>>('GET', '/entities', {
      params: {
        type: types,
        pageCursor: params?.pageCursor,
      },
    });
  }

  /**
   * Search entities with filters
   *
   * Uses POST /entities/search with the structured request body:
   *   { data: { filter: { type: [...], id: [...],
   *                       fields: { name, archived, status, owner, teams, <customFieldId>: {...} },
   *                       relationships: { parent: [{ id }] } } } }
   * (per the v2 OpenAPI spec at developer.productboard.com/openapi/entities.yaml,
   * verified live 2026-07-30 — the earlier flat-properties body is now rejected
   * with "Property is not allowed").
   *
   * NOTE: ProductBoard API v2 does NOT support a pageSize parameter.
   * It returns 100 items per page. Use pageCursor for subsequent pages.
   *
   * @param entityType - The type of entities to search
   * @param filters - Search filters. `teams` filters by native workspace team
   *   (OR semantics). `customFields` is a map of custom field ID →
   *   EntitySearchCustomFieldFilterValue (e.g. { any: [{ name: 'Mobile' }] }
   *   for multi-selects, { eq: 100 } for numbers) applied server-side.
   * @param params - Pagination parameters (pageCursor only)
   */
  async searchEntities(
    entityType: SearchableEntityType,
    filters?: {
      name?: string;
      statuses?: Array<{ name?: string; id?: string }>;
      owners?: Array<{ email?: string; id?: string }>;
      parent?: { id: string };
      archived?: boolean;
      ids?: string[];
      teams?: Array<{ id?: string; name?: string }>;
      customFields?: Record<string, unknown>;
    },
    params?: {
      pageCursor?: string;
    }
  ): Promise<PaginatedResponse<GenericEntity>> {
    const fields: Record<string, unknown> = {};
    if (filters?.name) {
      fields.name = filters.name;
    }
    if (filters?.archived !== undefined) {
      fields.archived = filters.archived;
    }
    if (filters?.statuses && filters.statuses.length > 0) {
      fields.status = filters.statuses;
    }
    if (filters?.owners && filters.owners.length > 0) {
      fields.owner = filters.owners;
    }
    if (filters?.teams && filters.teams.length > 0) {
      fields.teams = filters.teams;
    }
    if (filters?.customFields) {
      Object.assign(fields, filters.customFields);
    }

    const filter: Record<string, unknown> = {
      type: [entityType],
    };
    if (filters?.ids && filters.ids.length > 0) {
      filter.id = filters.ids;
    }
    if (Object.keys(fields).length > 0) {
      filter.fields = fields;
    }
    if (filters?.parent) {
      filter.relationships = { parent: [filters.parent] };
    }

    return this.request<PaginatedResponse<GenericEntity>>('POST', '/entities/search', {
      body: { data: { filter } },
      params: {
        pageCursor: params?.pageCursor,
      },
    });
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
