/**
 * Custom Fields Utilities (Feature 006)
 *
 * Utilities for transforming ProductBoard custom fields:
 * - buildCustomFieldMapping(): Build UUID → name mapping from config
 * - transformCustomFields(): Transform entity fields to add customFields object
 *
 * @module utils/custom-fields
 */

import type {
  CustomFieldConfig,
  CustomFieldMapping,
  CustomFieldType,
  CustomFieldValue,
  SelectOption,
  GenericEntityFields,
} from '../client/types.js';

/**
 * Schema names from ProductBoard API mapped to our custom field types.
 * Only these schema types are considered custom fields.
 */
const CUSTOM_FIELD_SCHEMAS: Record<string, CustomFieldType> = {
  NumberFieldValue: 'number',
  TextFieldValue: 'text',
  RichTextFieldValue: 'richtext',
  SingleSelectFieldValue: 'single_select',
  MultiSelectFieldValue: 'multi_select',
  MemberFieldValue: 'member',
  BooleanFieldValue: 'boolean',
  DateFieldValue: 'date',
  DateTimeFieldValue: 'datetime',
};

/**
 * Standard fields that should NOT be treated as custom fields.
 * These are ProductBoard's built-in fields that exist on all entities.
 */
const STANDARD_FIELDS = new Set([
  'name',
  'description',
  'status',
  'owner',
  'teams',
  'team',
  'archived',
  'parent',
  'product',
  'component',
  'createdAt',
  'updatedAt',
]);

/**
 * Check if a string looks like a UUID (custom field key pattern).
 * ProductBoard uses UUIDs for custom field keys in API responses.
 */
function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Raw field definition from ProductBoard API configuration.
 */
interface RawFieldConfig {
  id: string;
  name: string;
  schema?: string;
  options?: Array<{ id: string; name: string; color?: string }>;
}

/**
 * Build a custom field mapping from entity configuration.
 *
 * Extracts custom fields (those with UUID keys and recognized schemas) from
 * the configuration and builds two lookup maps:
 * - byId: UUID → CustomFieldConfig (for transforming API responses)
 * - byName: lowercase field name → CustomFieldConfig (for filter validation)
 *
 * @param configFields - Fields object from entity configuration (keyed by field ID)
 * @returns CustomFieldMapping with byId and byName maps
 */
export function buildCustomFieldMapping(
  configFields: Record<string, RawFieldConfig> | RawFieldConfig[] | undefined
): CustomFieldMapping {
  const byId = new Map<string, CustomFieldConfig>();
  const byName = new Map<string, CustomFieldConfig>();

  if (!configFields) {
    return { byId, byName };
  }

  // Convert to array if object
  const fieldsArray = Array.isArray(configFields)
    ? configFields
    : Object.values(configFields);

  for (const field of fieldsArray) {
    // Only process fields with UUID IDs and recognized custom field schemas
    if (field.id === undefined || field.id === null || field.id === '' || !isUUID(field.id)) {
      continue;
    }

    // Check if this is a recognized custom field schema
    const fieldType = field.schema !== undefined && field.schema !== null && field.schema !== ''
      ? CUSTOM_FIELD_SCHEMAS[field.schema]
      : undefined;
    if (fieldType === undefined) {
      continue;
    }

    // Build the config object
    const config: CustomFieldConfig = {
      id: field.id,
      name: field.name,
      type: fieldType,
    };

    // Add options for select fields
    if (field.options && field.options.length > 0) {
      config.options = field.options.map((opt): SelectOption => ({
        id: opt.id,
        name: opt.name,
        color: opt.color,
      }));
    }

    byId.set(field.id, config);
    byName.set(field.name.toLowerCase(), config);
  }

  return { byId, byName };
}

/**
 * Transform entity fields to add a customFields object with human-readable names.
 *
 * Takes the raw fields from an API response and extracts custom fields
 * (those with UUID keys), transforming them into a customFields object
 * with human-readable field names as keys.
 *
 * @param fields - Raw fields object from API response
 * @param mapping - Custom field mapping built from configuration
 * @returns Object with customFields property containing named custom field values
 */
export function transformCustomFields(
  fields: GenericEntityFields,
  mapping: CustomFieldMapping
): Record<string, CustomFieldValue> {
  const customFields: Record<string, CustomFieldValue> = {};

  for (const [key, value] of Object.entries(fields)) {
    // Skip standard fields
    if (STANDARD_FIELDS.has(key)) {
      continue;
    }

    // Check if this is a UUID key (custom field)
    if (!isUUID(key)) {
      continue;
    }

    // Look up the field config
    const config = mapping.byId.get(key);
    if (!config) {
      // Unknown custom field - skip (may be a field added after config was fetched)
      continue;
    }

    // Transform the value based on field type
    const transformedValue = transformFieldValue(value, config.type);

    // Only include if value is meaningful (FR-006: omit null/empty)
    if (transformedValue !== null) {
      customFields[config.name] = transformedValue;
    }
  }

  return customFields;
}

/**
 * Transform a single field value based on its type.
 *
 * @param value - Raw value from API response
 * @param fieldType - The custom field type
 * @returns Transformed value or null if empty/unset
 */
function transformFieldValue(value: unknown, fieldType: CustomFieldType): CustomFieldValue {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return null;
  }

  switch (fieldType) {
    case 'number':
      // Numbers are returned as-is
      if (typeof value === 'number') {
        return value;
      }
      return null;

    case 'text':
    case 'richtext':
      // Text fields may be string or { value: string }
      if (typeof value === 'string') {
        return value || null;
      }
      if (typeof value === 'object' && value !== null && 'value' in value) {
        const textValue = (value as { value: string }).value;
        return textValue || null;
      }
      return null;

    case 'boolean':
      if (typeof value === 'boolean') {
        return value;
      }
      return null;

    case 'single_select':
      // Single select returns { id, name, color? }
      if (typeof value === 'object' && value !== null && 'id' in value && 'name' in value) {
        const select = value as { id: string; name: string; color?: string };
        return {
          id: select.id,
          name: select.name,
          color: select.color,
        };
      }
      return null;

    case 'multi_select':
      // Multi select returns array of { id, name }
      if (Array.isArray(value)) {
        const options = value
          .filter((v): v is { id: string; name: string; color?: string } =>
            typeof v === 'object' && v !== null && 'id' in v && 'name' in v
          )
          .map((v) => ({
            id: v.id,
            name: v.name,
            color: v.color,
          }));
        return options.length > 0 ? options : null;
      }
      return null;

    case 'member':
      // Member returns { id, email?, name? }
      if (typeof value === 'object' && value !== null && 'id' in value) {
        const member = value as { id: string; email?: string; name?: string };
        // Return MemberFieldValue which is compatible with CustomFieldValue
        const memberValue: { id: string; email?: string; name?: string } = {
          id: member.id,
        };
        if (member.email !== undefined && member.email !== null && member.email !== '') {
          memberValue.email = member.email;
        }
        if (member.name !== undefined && member.name !== null && member.name !== '') {
          memberValue.name = member.name;
        }
        return memberValue as CustomFieldValue;
      }
      return null;

    case 'date':
    case 'datetime':
      // Date fields return ISO string
      if (typeof value === 'string') {
        return value || null;
      }
      return null;

    default:
      // Unknown type - return as-is if primitive, null otherwise
      if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        return value;
      }
      return null;
  }
}

/**
 * Check if an entity has any custom fields in the mapping.
 * Useful for determining if transformation is needed.
 *
 * @param fields - Raw fields object from API response
 * @param mapping - Custom field mapping
 * @returns true if entity has at least one mapped custom field
 */
export function hasCustomFields(
  fields: GenericEntityFields,
  mapping: CustomFieldMapping
): boolean {
  if (mapping.byId.size === 0) {
    return false;
  }

  for (const key of Object.keys(fields)) {
    if (isUUID(key) && mapping.byId.has(key)) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// Custom Field Filtering (US2)
// =============================================================================

/**
 * Filter input as provided by the user
 */
export interface CustomFieldFilterInput {
  field: string;
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=';
  value: number | string | boolean;
}

/**
 * Result of filter validation
 */
export interface FilterValidationResult {
  valid: boolean;
  errors: FilterValidationError[];
}

/**
 * A single filter validation error
 */
export interface FilterValidationError {
  field: string;
  code: 'INVALID_FIELD' | 'INVALID_OPERATOR' | 'TYPE_MISMATCH';
  message: string;
  suggestion?: string;
  availableFields?: string[];
  validOperators?: string[];
}

/**
 * Find the closest matching field name using Levenshtein distance.
 * Returns the best match if similarity is close enough.
 */
function findClosestMatch(input: string, options: string[]): string | undefined {
  const inputLower = input.toLowerCase();
  let bestMatch: string | undefined;
  let bestScore = Infinity;

  for (const option of options) {
    const optionLower = option.toLowerCase();
    // Simple edit distance calculation
    const distance = levenshteinDistance(inputLower, optionLower);
    // Only suggest if reasonably close (within 3 edits for short strings, 5 for longer)
    const threshold = Math.max(3, Math.floor(option.length / 2));
    if (distance < bestScore && distance <= threshold) {
      bestScore = distance;
      bestMatch = option;
    }
  }

  return bestMatch;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Operators valid for numeric fields
 */
const NUMERIC_OPERATORS = new Set(['=', '!=', '<', '<=', '>', '>=']);

/**
 * Operators valid for select and text fields
 */
const SELECT_OPERATORS = new Set(['=', '!=']);

/**
 * Validate custom field filters against the configuration.
 * Checks that field names exist and operators are valid for the field type.
 *
 * @param filters - Array of filter specifications
 * @param mapping - Custom field mapping from configuration
 * @returns Validation result with any errors
 */
export function validateCustomFieldFilters(
  filters: CustomFieldFilterInput[],
  mapping: CustomFieldMapping
): FilterValidationResult {
  const errors: FilterValidationError[] = [];
  const availableFields = Array.from(mapping.byName.keys()).map(
    (key) => mapping.byName.get(key)?.name ?? key
  );

  for (const filter of filters) {
    // Look up field by name (case-insensitive)
    const fieldConfig = mapping.byName.get(filter.field.toLowerCase());

    if (fieldConfig === undefined) {
      // Field not found - suggest closest match
      const suggestion = findClosestMatch(filter.field, availableFields);
      errors.push({
        field: filter.field,
        code: 'INVALID_FIELD',
        message: `Custom field '${filter.field}' not found`,
        suggestion: suggestion !== undefined ? `Did you mean '${suggestion}'?` : undefined,
        availableFields: availableFields.slice(0, 10), // Show first 10
      });
      continue;
    }

    // Validate operator for field type
    const isNumericField = fieldConfig.type === 'number';
    const validOperators = isNumericField ? NUMERIC_OPERATORS : SELECT_OPERATORS;

    if (!validOperators.has(filter.operator)) {
      errors.push({
        field: filter.field,
        code: 'INVALID_OPERATOR',
        message: `Operator '${filter.operator}' not valid for ${fieldConfig.type} field '${filter.field}'`,
        suggestion: isNumericField
          ? undefined
          : `Use '=' or '!=' for ${fieldConfig.type} fields`,
        validOperators: Array.from(validOperators),
      });
      continue;
    }

    // Validate value type for numeric fields
    if (isNumericField && typeof filter.value !== 'number') {
      errors.push({
        field: filter.field,
        code: 'TYPE_MISMATCH',
        message: `Filter value must be a number for field '${filter.field}'`,
        suggestion: `Got ${typeof filter.value} '${filter.value}', expected number`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Entity with transformed custom fields (for filtering)
 * Uses unknown for flexibility with various entity formats
 */
interface EntityWithCustomFields {
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Apply custom field filters to an array of entities.
 * Entities must have already been transformed to include customFields.
 *
 * @param entities - Array of entities with customFields property
 * @param filters - Array of filter specifications
 * @param mapping - Custom field mapping for type information
 * @returns Filtered array of entities
 */
export function applyCustomFieldFilters<T extends EntityWithCustomFields>(
  entities: T[],
  filters: CustomFieldFilterInput[],
  mapping: CustomFieldMapping
): T[] {
  if (filters.length === 0) {
    return entities;
  }

  return entities.filter((entity) => {
    const customFields = entity.customFields;
    if (customFields === undefined) {
      // Entity has no custom fields - doesn't match any filter
      return false;
    }

    // All filters must match (AND logic)
    for (const filter of filters) {
      const fieldConfig = mapping.byName.get(filter.field.toLowerCase());
      if (fieldConfig === undefined) {
        // Unknown field - skip (validation should have caught this)
        continue;
      }

      // Find the field value (case-insensitive match)
      let fieldValue: unknown = null;
      for (const [key, value] of Object.entries(customFields)) {
        if (key.toLowerCase() === filter.field.toLowerCase()) {
          fieldValue = value;
          break;
        }
      }

      // Check if filter matches
      if (!matchesFilter(fieldValue, filter, fieldConfig.type)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Check if a field value matches a filter condition.
 *
 * @param value - The custom field value (unknown to support various input types)
 * @param filter - The filter specification
 * @param fieldType - The field type for proper comparison
 * @returns true if value matches the filter
 */
function matchesFilter(
  value: unknown,
  filter: CustomFieldFilterInput,
  fieldType: CustomFieldType
): boolean {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    // Only != null returns true
    return filter.operator === '!=' && filter.value !== null;
  }

  switch (fieldType) {
    case 'number':
      return matchesNumericFilter(value as number, filter.operator, filter.value as number);

    case 'single_select':
      return matchesSelectFilter(value as { name: string }, filter.operator, filter.value as string);

    case 'multi_select':
      return matchesMultiSelectFilter(
        value as Array<{ name: string }>,
        filter.operator,
        filter.value as string
      );

    case 'text':
    case 'richtext':
      return matchesTextFilter(value as string, filter.operator, filter.value as string);

    case 'boolean':
      return matchesBooleanFilter(value as boolean, filter.operator, filter.value as boolean);

    case 'member':
      return matchesMemberFilter(
        value as { email?: string; name?: string },
        filter.operator,
        filter.value as string
      );

    default:
      // Unknown field type - treat as string equality
      return String(value) === String(filter.value);
  }
}

/**
 * Match numeric field value against filter
 */
function matchesNumericFilter(
  value: number,
  operator: string,
  filterValue: number
): boolean {
  switch (operator) {
    case '=':
      return value === filterValue;
    case '!=':
      return value !== filterValue;
    case '<':
      return value < filterValue;
    case '<=':
      return value <= filterValue;
    case '>':
      return value > filterValue;
    case '>=':
      return value >= filterValue;
    default:
      return false;
  }
}

/**
 * Match single select field value against filter
 */
function matchesSelectFilter(
  value: { name: string },
  operator: string,
  filterValue: string
): boolean {
  const matches = value.name.toLowerCase() === filterValue.toLowerCase();
  return operator === '=' ? matches : !matches;
}

/**
 * Match multi select field value against filter.
 * For '=', matches if ANY option matches the filter value.
 * For '!=', matches if NO option matches the filter value.
 */
function matchesMultiSelectFilter(
  values: Array<{ name: string }>,
  operator: string,
  filterValue: string
): boolean {
  const hasMatch = values.some(
    (v) => v.name.toLowerCase() === filterValue.toLowerCase()
  );
  return operator === '=' ? hasMatch : !hasMatch;
}

/**
 * Match text field value against filter (case-insensitive)
 */
function matchesTextFilter(
  value: string,
  operator: string,
  filterValue: string
): boolean {
  const matches = value.toLowerCase() === filterValue.toLowerCase();
  return operator === '=' ? matches : !matches;
}

/**
 * Match boolean field value against filter
 */
function matchesBooleanFilter(
  value: boolean,
  operator: string,
  filterValue: boolean
): boolean {
  const matches = value === filterValue;
  return operator === '=' ? matches : !matches;
}

/**
 * Match member field value against filter.
 * Matches against email or name (case-insensitive).
 */
function matchesMemberFilter(
  value: { email?: string; name?: string },
  operator: string,
  filterValue: string
): boolean {
  const filterLower = filterValue.toLowerCase();
  const emailMatch = value.email?.toLowerCase() === filterLower;
  const nameMatch = value.name?.toLowerCase() === filterLower;
  const matches = emailMatch || nameMatch;
  return operator === '=' ? matches : !matches;
}
