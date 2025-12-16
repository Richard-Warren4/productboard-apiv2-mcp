/**
 * Field Validation Utilities
 *
 * Validates field values against workspace configuration.
 * Validation is warn-only (non-blocking) per FR-005.
 *
 * @module utils/validation
 */

import type { ValidationResult, ValidationWarning } from '../client/types.js';
import { normalizeFields } from '../tools/config.js';

/** Raw API field type (accepts string for type since API returns generic strings) */
interface RawFieldConfig {
  id: string;
  name: string;
  displayName: string;
  type: string;
  required: boolean;
  readOnly: boolean;
  options?: Array<{ id: string; name: string }>;
}

/**
 * Validate fields against entity configuration.
 * Returns warnings (non-blocking) for validation issues.
 *
 * @param fields - Field values being submitted
 * @param config - Field configuration from API
 * @param operation - 'create' or 'update' (affects required field checks)
 * @returns ValidationResult with valid flag and warnings array
 */
export function validateFieldsAgainstConfig(
  fields: Record<string, unknown>,
  config: RawFieldConfig[] | null,
  operation: 'create' | 'update'
): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // If no config available, skip validation (graceful degradation)
  if (!config || config.length === 0) {
    return { valid: true, warnings: [] };
  }

  // Build a map of field configs for quick lookup
  const configMap = new Map<string, RawFieldConfig>();
  for (const field of config) {
    configMap.set(field.name, field);
  }

  // Check for missing required fields (only on create)
  if (operation === 'create') {
    for (const fieldConfig of config) {
      if (fieldConfig.required && !fieldConfig.readOnly) {
        const providedValue = fields[fieldConfig.name];
        if (providedValue === undefined || providedValue === null || providedValue === '') {
          warnings.push({
            field: fieldConfig.name,
            issue: 'missing_required',
            message: `Required field '${fieldConfig.displayName}' is not provided`,
            suggestion: `Please provide a value for '${fieldConfig.name}'`,
          });
        }
      }
    }
  }

  // Validate provided field values
  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    const fieldConfig = configMap.get(fieldName);

    // Skip validation for unknown fields (silent skip per FR-008)
    if (!fieldConfig) {
      continue;
    }

    // Skip null/undefined values (they might be intentional clears)
    if (fieldValue === undefined || fieldValue === null) {
      continue;
    }

    // Validate based on field type
    const fieldWarnings = validateFieldValue(fieldName, fieldValue, fieldConfig);
    warnings.push(...fieldWarnings);
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Validate a single field value against its configuration.
 */
function validateFieldValue(
  fieldName: string,
  value: unknown,
  config: RawFieldConfig
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  switch (config.type) {
    case 'status':
    case 'single_select':
    case 'singleSelect':
      warnings.push(...validateSelectValue(fieldName, value, config, false));
      break;

    case 'multi_select':
    case 'multiSelect':
      warnings.push(...validateSelectValue(fieldName, value, config, true));
      break;

    case 'text':
    case 'richtext':
      warnings.push(...validateTextValue(fieldName, value, config));
      break;

    case 'number':
      warnings.push(...validateNumberValue(fieldName, value, config));
      break;

    // member, team, date, datetime, boolean - basic type checks only
    case 'member':
      warnings.push(...validateMemberValue(fieldName, value));
      break;

    case 'team':
      warnings.push(...validateTeamValue(fieldName, value));
      break;

    // Other types: no specific validation
    default:
      break;
  }

  return warnings;
}

/**
 * Validate status or select field values against available options.
 */
function validateSelectValue(
  fieldName: string,
  value: unknown,
  config: RawFieldConfig,
  isMulti: boolean
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const options = config.options ?? [];

  if (options.length === 0) {
    // No options to validate against
    return warnings;
  }

  const availableNames = options.map((o) => o.name);
  const availableIds = options.map((o) => o.id);

  // Extract the value to check
  const valuesToCheck: Array<{ name?: string; id?: string }> = [];

  if (isMulti && Array.isArray(value)) {
    valuesToCheck.push(...(value as Array<{ name?: string; id?: string }>));
  } else if (typeof value === 'object' && value !== null) {
    valuesToCheck.push(value as { name?: string; id?: string });
  } else if (typeof value === 'string') {
    // Direct string value (treated as name)
    valuesToCheck.push({ name: value });
  }

  for (const v of valuesToCheck) {
    let isValid = false;

    if (v.name) {
      isValid = availableNames.some(
        (name) => name.toLowerCase() === v.name!.toLowerCase()
      );
    } else if (v.id) {
      isValid = availableIds.includes(v.id);
    }

    if (!isValid && (v.name || v.id)) {
      const providedValue = v.name ?? v.id;
      warnings.push({
        field: fieldName,
        issue: 'invalid_value',
        message: `Value '${providedValue}' is not valid for '${config.displayName}'`,
        suggestion: `Available options: ${availableNames.join(', ')}`,
      });
    }
  }

  return warnings;
}

/**
 * Validate text field values.
 * Currently performs no validation (constraints handled elsewhere).
 * Placeholder for future maxLength/pattern validation.
 */
function validateTextValue(
  _fieldName: string,
  _value: unknown,
  _config: RawFieldConfig
): ValidationWarning[] {
  // Text validation placeholder - future: add maxLength, pattern checks
  // Required field check is handled in main validation function
  return [];
}

/**
 * Validate number field values.
 */
function validateNumberValue(
  fieldName: string,
  value: unknown,
  config: RawFieldConfig
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  const numValue = typeof value === 'number' ? value : Number(value);

  if (isNaN(numValue)) {
    warnings.push({
      field: fieldName,
      issue: 'type_mismatch',
      message: `Value for '${config.displayName}' must be a number`,
      suggestion: `Provide a numeric value`,
    });
  }

  // Note: min/max constraints would be checked here if available in config.validation

  return warnings;
}

/**
 * Validate member field values (must have id or email).
 */
function validateMemberValue(fieldName: string, value: unknown): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (typeof value !== 'object' || value === null) {
    return warnings;
  }

  const memberValue = value as Record<string, unknown>;

  if (!memberValue.id && !memberValue.email) {
    warnings.push({
      field: fieldName,
      issue: 'invalid_value',
      message: `Member value must have either 'id' or 'email'`,
      suggestion: `Provide member as { id: "..." } or { email: "..." }`,
    });
  }

  return warnings;
}

/**
 * Validate team field values (must have id or name).
 */
function validateTeamValue(fieldName: string, value: unknown): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (typeof value !== 'object' || value === null) {
    return warnings;
  }

  const teamValue = value as Record<string, unknown>;

  if (!teamValue.id && !teamValue.name) {
    warnings.push({
      field: fieldName,
      issue: 'invalid_value',
      message: `Team value must have either 'id' or 'name'`,
      suggestion: `Provide team as { id: "..." } or { name: "..." }`,
    });
  }

  return warnings;
}

/**
 * Get configuration for a specific entity type.
 * Returns null if config fetch fails (graceful degradation).
 */
export async function getConfigForValidation(
  client: { getEntityConfiguration: (type?: string) => Promise<{ data: unknown }> },
  entityType: string,
  getSessionCached: <T>(key: string, fn: () => Promise<T>) => Promise<T>
): Promise<RawFieldConfig[] | null> {
  try {
    const config = await getSessionCached(`config:${entityType}`, () =>
      client.getEntityConfiguration(entityType)
    );

    // Handle both array (all types) and object (single type) responses
    let entityConfig: { type: string; fields: unknown } | undefined;
    if (Array.isArray(config.data)) {
      entityConfig = config.data.find((c: { type: string }) => c.type === entityType);
    } else if (config.data && typeof config.data === 'object') {
      // Single entity type returns object directly
      entityConfig = config.data as { type: string; fields: unknown };
    }

    if (!entityConfig) {
      return null;
    }

    // Normalize fields from API format (object keyed by ID) to array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedFields = normalizeFields(entityConfig.fields as any);
    return normalizedFields;
  } catch (error) {
    // Graceful degradation - validation becomes no-op
    console.error(`Config fetch failed for ${entityType}:`, error);
    return null;
  }
}
