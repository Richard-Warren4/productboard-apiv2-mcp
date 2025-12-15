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

/**
 * All entity types supported by ProductBoard API v2.
 * Note: 'user' is read-only (no create/update operations)
 *
 * NOTE: 'initiative' is NOT supported by ProductBoard API v2 (verified 2025-12-15)
 * Configuration endpoint only returns: objective, product, component, feature,
 * subfeature, releaseGroup, release, company, user
 */
export type EntityType =
  | 'objective'
  | 'product'
  | 'component'
  | 'feature'
  | 'subfeature'
  | 'releaseGroup'
  | 'release'
  | 'company'
  | 'user';

/**
 * Entity types that support write operations (create/update)
 */
export type WritableEntityType = Exclude<EntityType, 'user'>;

/**
 * Entity types that support search operations.
 * Note: Search supports additional filters not available on list endpoint:
 * - statuses, owners, parent, archived, ids (all searchable types)
 *
 * NOTE: 'initiative' is NOT supported by ProductBoard API v2 (verified 2025-12-15)
 */
export type SearchableEntityType = 'feature' | 'subfeature' | 'objective';

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
// Generic Entity Types (for unified entity handling)
// =============================================================================

/**
 * Generic entity fields - dynamic based on entity type and workspace configuration.
 * Common fields are typed; additional fields come from workspace config.
 */
export interface GenericEntityFields {
  name?: string;
  description?: string | RichTextFieldValue;
  status?: StatusFieldValue;
  owner?: MemberFieldValue;
  teams?: TeamFieldValue[];
  archived?: boolean;
  parent?: EntityReference;
  [key: string]: unknown; // Dynamic fields from workspace configuration
}

/**
 * Generic entity representation for any ProductBoard entity type.
 * Used for unified CRUD operations across all entity types.
 */
export interface GenericEntity {
  id: string;
  type: EntityType;
  fields: GenericEntityFields;
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

/**
 * Input for creating a generic entity
 */
export interface CreateGenericEntityInput {
  entityType: WritableEntityType;
  fields: Record<string, unknown>;
}

/**
 * Input for updating a generic entity
 */
export interface UpdateGenericEntityInput {
  id: string;
  fields: Record<string, unknown>;
}

/**
 * Input for listing generic entities
 *
 * NOTE: ProductBoard API v2 does NOT support pageSize parameter.
 * It returns 100 items per page. Use pageCursor for subsequent pages.
 */
export interface ListGenericEntitiesInput {
  entityType: EntityType;
  pageCursor?: string;
}

/**
 * Input for searching generic entities.
 *
 * NOTE: ProductBoard API v2 does NOT support pageSize parameter.
 * It returns 100 items per page. Use pageCursor for subsequent pages.
 *
 * IMPORTANT: All filters must be direct properties under `data`, NOT in a `filter` wrapper.
 * The official ProductBoard docs show a `filter` property but that does NOT work.
 * See research.md for verified examples.
 */
export interface SearchGenericEntitiesInput {
  entityType: SearchableEntityType;
  name?: string;
  statuses?: Array<{ name?: string; id?: string }>;
  owners?: Array<{ email?: string; id?: string }>;
  parent?: { id: string };
  archived?: boolean;
  ids?: string[];
  pageCursor?: string;
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

/** Known field value types (includes 'unknown' for forward compatibility) */
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
  | 'single_select'
  | 'multi_select'
  | 'singleSelect' // Legacy API format
  | 'multiSelect' // Legacy API format
  | 'entityReference'
  | 'health'
  | 'progress'
  | 'timeframe'
  | 'unknown'; // For forward compatibility with new API types

/** Option for select fields */
export interface FieldOption {
  id: string;
  name: string;
  color?: string;
}

/** Validation rules for a field */
export interface FieldValidation {
  /** Maximum length for text fields */
  maxLength?: number;
  /** Minimum value for number fields */
  minValue?: number;
  /** Maximum value for number fields */
  maxValue?: number;
  /** Regex pattern for text fields */
  pattern?: string;
}

/** Definition of a configurable field */
export interface FieldDefinition {
  /** Internal field identifier */
  id: string;
  /** API field name (used in requests) */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Field value type */
  type: FieldType;
  /** Whether field is required for creation */
  required: boolean;
  /** Whether field is read-only (cannot be set) */
  readOnly: boolean;
  /** Available options for select-type fields */
  options?: FieldOption[];
  /** Validation constraints */
  validation?: FieldValidation;
}

/** Field configuration (alias for FieldDefinition for backwards compatibility) */
export interface FieldConfiguration {
  id: string;
  name: string;
  displayName: string;
  type: FieldType;
  required: boolean;
  readOnly: boolean;
  options?: FieldOption[];
  validation?: FieldValidation;
}

/** Lifecycle operation configuration */
export interface LifecycleOperation {
  /** Fields that can be set during this operation */
  settableFields: string[];
  /** Fields that are required for this operation */
  requiredFields: string[];
}

/** Configuration metadata for an entity type */
export interface EntityConfiguration {
  /** Entity type identifier (may be EntityType or custom type from workspace) */
  type: string;
  /** Available fields for this entity type */
  fields: FieldDefinition[];
  /** Supported lifecycle operations */
  lifecycle?: {
    create?: LifecycleOperation;
    update?: LifecycleOperation;
    delete?: LifecycleOperation;
  };
}

// =============================================================================
// Validation Types
// =============================================================================

/** Types of validation issues */
export type ValidationIssue =
  | 'missing_required' // Required field not provided
  | 'invalid_value' // Value doesn't match options
  | 'type_mismatch' // Value type doesn't match field type
  | 'constraint_violation'; // Value violates validation constraint

/** A validation warning (non-blocking) */
export interface ValidationWarning {
  /** Field that triggered the warning */
  field: string;
  /** Type of validation issue */
  issue: ValidationIssue;
  /** Human-readable warning message */
  message: string;
  /** Suggested fix or available options */
  suggestion?: string;
}

/** Result of field validation */
export interface ValidationResult {
  /** Whether all validations passed (no warnings) */
  valid: boolean;
  /** List of validation warnings */
  warnings: ValidationWarning[];
}

/** Session cache for configuration data */
export interface ConfigCache {
  /** Cached configurations by entity type */
  configs: Map<string, EntityConfiguration>;
  /** Track if initial fetch has been done */
  initialized: boolean;
}

// =============================================================================
// Relationship Types
// =============================================================================

/**
 * Relationship types for ProductBoard API v2
 *
 * Supported by POST /entities/{id}/relationships (createRelationship):
 * - parent: identifies target as parent of source entity
 * - child: identifies target as child of source entity
 * - link: non-hierarchical connection (e.g., feature to objective)
 * - isBlockedBy: dependency - source is blocked by target
 * - isBlocking: dependency - source blocks target
 */
export type RelationshipType = 'parent' | 'child' | 'link' | 'isBlockedBy' | 'isBlocking';

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
