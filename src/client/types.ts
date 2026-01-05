/**
 * ProductBoard API v2 TypeScript Types
 *
 * This module defines all TypeScript interfaces for the ProductBoard API v2.
 * Types follow the ProductBoard field value system with distinct read (FieldValue)
 * and write (FieldAssign) variants.
 *
 * @module client/types
 */

// =============================================================================
// Entity Types
// =============================================================================

export type EntityType =
  | 'product'
  | 'component'
  | 'feature'
  | 'subfeature'
  | 'initiative'
  | 'objective'
  | 'keyResult'
  | 'release'
  | 'releaseGroup';

// =============================================================================
// Field Value Types (Read - returned from API)
// =============================================================================

/** Rich text content returned from API */
export interface RichTextFieldValue {
  value: string; // HTML string with allowed tags
}

/** Status field value */
export interface StatusFieldValue {
  id: string;
  name: string;
}

/** Member field value (owner) */
export interface MemberFieldValue {
  id: string;
  email: string;
  name?: string;
}

/** Team field value */
export interface TeamFieldValue {
  id: string;
  name: string;
}

/** Reference to another entity */
export interface EntityReference {
  id: string;
  type: EntityType;
  links?: {
    self: string;
  };
}

// =============================================================================
// Field Assign Types (Write - sent to API)
// =============================================================================

/** Rich text assignment (write) */
export interface RichTextFieldAssign {
  value: string; // HTML string - validated before submission
}

/** Status assignment - by ID or name */
export type StatusFieldAssign = { id: string } | { name: string };

/** Member assignment - by ID or email */
export type MemberFieldAssign = { id: string } | { email: string };

/** Team assignment - by ID or name */
export type TeamFieldAssign = { id: string } | { name: string };

/** Entity reference assignment */
export interface EntityReferenceAssign {
  id: string;
}

// =============================================================================
// Core Entities
// =============================================================================

/** Feature fields nested in API response */
export interface FeatureFields {
  name: string;
  description?: string; // Plain string in API v2, not RichTextFieldValue
  status?: StatusFieldValue;
  owner?: MemberFieldValue;
  team?: TeamFieldValue;
  teams?: TeamFieldValue[]; // API returns array of teams
  archived?: boolean;
}

/** Feature entity returned from ProductBoard API v2 (read) */
export interface Feature {
  id: string;
  type: 'feature';
  fields: FeatureFields;
  relationships?: {
    data: Array<{
      type: string;
      target: EntityReference;
    }>;
  };
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  links: {
    self: string;
    html?: string; // ProductBoard UI link - may not be present
  };
}

/** Input for creating a feature (write) */
export interface CreateFeatureInput {
  name: string;
  description?: RichTextFieldAssign;
  status?: StatusFieldAssign;
  owner?: MemberFieldAssign;
  team?: TeamFieldAssign;
  parent?: EntityReferenceAssign;
  product?: EntityReferenceAssign;
}

/** Input for updating a feature (write) */
export interface UpdateFeatureInput {
  name?: string;
  description?: RichTextFieldAssign;
  status?: StatusFieldAssign;
  owner?: MemberFieldAssign;
  team?: TeamFieldAssign;
}

/** Subfeature fields nested in API response */
export interface SubfeatureFields {
  name: string;
  description?: string;
  status?: StatusFieldValue;
  owner?: MemberFieldValue;
  team?: TeamFieldValue;
  teams?: TeamFieldValue[];
  archived?: boolean;
}

/** Subfeature entity returned from ProductBoard API v2 (read) */
export interface Subfeature {
  id: string;
  type: 'subfeature';
  fields: SubfeatureFields;
  relationships?: {
    data: Array<{
      type: string;
      target: EntityReference;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  links: {
    self: string;
    html?: string;
  };
}

/** Input for creating a subfeature (write) */
export interface CreateSubfeatureInput {
  name: string;
  parent: EntityReferenceAssign; // Required: parent feature ID
  description?: RichTextFieldAssign;
  status?: StatusFieldAssign;
  owner?: MemberFieldAssign;
}

/** Input for updating a subfeature (write) */
export interface UpdateSubfeatureInput {
  name?: string;
  description?: RichTextFieldAssign;
  status?: StatusFieldAssign;
  owner?: MemberFieldAssign;
}

/** Component entity (read-only for this MCP scope) */
export interface Component {
  id: string;
  type: 'component';
  name: string;
  description?: RichTextFieldValue;
  product?: EntityReference;
  links: {
    self: string;
    html: string;
  };
}

/** Product entity (read-only for this MCP scope) */
export interface Product {
  id: string;
  type: 'product';
  name: string;
  description?: RichTextFieldValue;
  links: {
    self: string;
    html: string;
  };
}

/** Member entity representing a ProductBoard user */
export interface Member {
  id: string;
  email: string;
  name: string;
}

/** Team entity representing an organizational unit */
export interface Team {
  id: string;
  name: string;
}

// =============================================================================
// API Response Types
// =============================================================================

/** Paginated list response */
export interface PaginatedResponse<T> {
  data: T[];
  links: {
    next?: string; // URL with cursor for next page
  };
}

/** Single entity response */
export interface EntityResponse<T> {
  data: T;
}

/** Search response */
export interface SearchResponse<T> {
  data: T[];
  totalCount: number;
  links: {
    next?: string;
  };
}

/** Error response from ProductBoard API */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// =============================================================================
// Configuration Types
// =============================================================================

export type FieldType =
  | 'text'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'status'
  | 'member'
  | 'team'
  | 'singleSelect'
  | 'multiSelect'
  | 'entityReference';

/** Option for select fields */
export interface FieldOption {
  id: string;
  name: string;
  color?: string;
}

/** Field configuration */
export interface FieldConfiguration {
  id: string;
  name: string;
  displayName: string;
  type: FieldType;
  required: boolean;
  readOnly: boolean;
  options?: FieldOption[]; // For select fields
}

/** Entity configuration from discovery endpoint */
export interface EntityConfiguration {
  type: EntityType;
  fields: FieldConfiguration[];
}

// =============================================================================
// Relationship Types
// =============================================================================

export type RelationshipType =
  | 'parent'
  | 'component'
  | 'product'
  | 'initiative'
  | 'objective'
  | 'release';

/** Relationship between entities */
export interface Relationship {
  id: string;
  sourceEntity: EntityReference;
  targetEntity: EntityReference;
  relationshipType: RelationshipType;
}

/** Input for creating a relationship */
export interface CreateRelationshipInput {
  targetEntity: EntityReferenceAssign;
  relationshipType: RelationshipType;
}

// =============================================================================
// MCP Tool Types
// =============================================================================

/** Standard MCP tool result */
export interface McpToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/** Feature list tool input */
export interface ListFeaturesInput {
  teamId?: string;
  teamName?: string;
  status?: string;
  componentId?: string;
  pageCursor?: string;
}

/** Feature detail tool input */
export interface GetFeatureInput {
  featureId?: string;
  featureName?: string;
}

/** Search features tool input */
export interface SearchFeaturesInput {
  query?: string;
  teamId?: string;
  teamName?: string;
  status?: string;
  componentId?: string;
  pageCursor?: string;
}
