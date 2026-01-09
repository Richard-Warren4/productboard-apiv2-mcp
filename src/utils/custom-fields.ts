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
