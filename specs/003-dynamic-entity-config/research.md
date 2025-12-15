# Research: Dynamic Entity Configuration Discovery

**Feature**: 003-dynamic-entity-config
**Date**: 2025-12-14

## Research Summary

This document consolidates research findings for implementing dynamic entity configuration discovery in the ProductBoard MCP server.

---

## 1. Current Implementation Analysis

### Decision: Build on existing `pb_get_config` tool
**Rationale**: The tool already exists with caching infrastructure; enhancement is more efficient than replacement.
**Alternatives considered**:
- Create new tool → Rejected: Would duplicate caching logic and confuse users with two config tools

### Current State

**File**: `src/tools/config.ts`

```typescript
// Current caching (5-minute TTL)
const configCache: Map<string, { data: unknown; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Current cache check
if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
  return cached.data as T;
}
```

**API Client** (`src/client/api.ts`):
- `getEntityConfiguration(entityType?)` method exists
- Returns typed response with fields array
- Supports specific type or all configurations

### Required Changes

1. **Remove TTL check** → Session-based caching (per clarification)
2. **Enhance field formatting** → Include required status, options, validation rules
3. **Add validation utility** → Reusable for features.ts and subfeatures.ts

---

## 2. Session-Based Caching Strategy

### Decision: Simple Map without TTL expiration
**Rationale**: MCP servers run as single-session processes; cache naturally clears on restart.
**Alternatives considered**:
- Time-based TTL (current) → Rejected: Per clarification, session-based preferred
- LRU cache → Rejected: Over-engineering for <10 cached items

### Implementation Pattern

```typescript
// Simplified session cache (no TTL)
const sessionCache: Map<string, unknown> = new Map();

async function getSessionCached<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  const cached = sessionCache.get(key);
  if (cached !== undefined) {
    return cached as T;
  }
  const data = await fetchFn();
  sessionCache.set(key, data);
  return data;
}
```

---

## 3. Field Validation Pattern

### Decision: Warn-only validation with detailed messages
**Rationale**: Per clarification, validation should not block operations.
**Alternatives considered**:
- Blocking validation → Rejected: Could be more restrictive than actual API
- No validation → Rejected: Loses opportunity for helpful feedback

### Validation Utility Design

```typescript
interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
}

interface ValidationWarning {
  field: string;
  issue: 'missing_required' | 'invalid_value' | 'unknown_field';
  message: string;
  suggestion?: string;
}

function validateFieldsAgainstConfig(
  fields: Record<string, unknown>,
  config: FieldConfig[],
  operation: 'create' | 'update'
): ValidationResult
```

### Key Validation Rules

| Rule | Behavior |
|------|----------|
| Missing required field (create) | Warn with field name |
| Invalid status/select value | Warn with available options |
| Unknown field | Silent skip (per clarification) |
| Type mismatch | Warn with expected type |

---

## 4. Integration Points

### Decision: Add validation at tool layer, not API client layer
**Rationale**: Keeps API client clean; validation is MCP-specific concern.
**Alternatives considered**:
- Validate in API client → Rejected: Couples validation to all API usage
- Validate in each tool separately → Rejected: Code duplication

### Integration Pattern

```typescript
// In features.ts pb_create_feature handler
const config = await getSessionCached('config:feature', () => client.getEntityConfiguration('feature'));
const validation = validateFieldsAgainstConfig(createInput, config, 'create');

// Include warnings in response
return toMcpSuccess({
  message: 'Feature created successfully',
  warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
  feature: formatFeature(response.data),
});
```

---

## 5. Field Type Handling

### Decision: Support known types, silently skip unknown
**Rationale**: Per clarification, forward compatibility via silent skip.

### Known Field Types (from Constitution)

| Type | Validation |
|------|------------|
| TextFieldValue | Max length if specified |
| RichTextFieldValue | HTML tag validation |
| NumberFieldValue | Numeric check |
| BooleanFieldValue | Boolean check |
| DateFieldValue | ISO date format |
| StatusFieldValue | Must match options |
| MemberFieldValue | Valid ID or email format |
| TeamFieldValue | Valid ID or name |
| SingleSelectFieldValue | Must match options |
| MultiSelectFieldValue | All must match options |

### Unknown Type Handling

```typescript
// Skip unknown types in config display
if (!KNOWN_FIELD_TYPES.includes(field.type)) {
  continue; // Silent skip per clarification
}
```

---

## 6. Error Handling for Config Fetch

### Decision: Graceful degradation with warning
**Rationale**: Operations should proceed even without config (FR-006).

### Pattern

```typescript
async function getConfigOrDefault(entityType: string): Promise<FieldConfig[] | null> {
  try {
    const config = await getSessionCached(`config:${entityType}`, () =>
      client.getEntityConfiguration(entityType)
    );
    return config.data[0]?.fields ?? null;
  } catch (error) {
    // Log but don't fail - validation becomes no-op
    console.error(`Config fetch failed for ${entityType}:`, error);
    return null;
  }
}
```

---

## Open Questions Resolved

| Question | Resolution | Source |
|----------|------------|--------|
| Cache refresh strategy | Session-based | Clarification Q1 |
| Validation strictness | Warn but proceed | Clarification Q2 |
| Unknown field types | Silent skip | Clarification Q3 |
| Config fetch failure | Graceful degradation | Spec FR-006 |

---

## Next Steps

1. **Phase 1**: Define data model for configuration types
2. **Phase 1**: Document API contract (internal - no external APIs added)
3. **Phase 2**: Implementation tasks via `/speckit.tasks`
