# Implementation Plan: Custom Fields Support

**Branch**: `006-custom-fields-support` | **Date**: 2025-01-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-custom-fields-support/spec.md`

## Summary

Transform UUID-keyed custom field values returned by ProductBoard API v2 into human-readable format with field names as keys. Additionally, implement client-side filtering by custom field values since server-side filtering is not supported by the API.

**Primary Deliverables**:
1. **P1**: Add `customFields` object to all entity responses (list, search, get) with human-readable field names
2. **P2**: Add client-side filtering capability for custom field values in search operations
3. **P3**: Ensure individual entity fetch returns all custom field values reliably

## Technical Context

**Language/Version**: TypeScript 5.4+ with Node.js 20 LTS
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.0.0, zod ^3.23.0, native fetch
**Storage**: In-memory session cache for UUID→name mapping (no persistence)
**Testing**: vitest for unit tests, live API tests via `npm run test:live`, MCP integration tests
**Target Platform**: MCP server running on Node.js (stdio transport)
**Project Type**: Single project (MCP server library)
**Performance Goals**: Entity responses within 2 seconds (same as current), no additional API calls for cached config
**Constraints**: Must not break existing tool interfaces (additive changes only)
**Scale/Scope**: Support all custom field types in workspace (currently 25+ fields including DRICE scores)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. MCP-First Design | PASS | No new tools required; enhancing existing entity tools with transformed custom field data |
| II. Type Safety & Validation | PASS | Will add TypeScript interfaces for CustomFieldConfig and transformed response types; Zod validation for filter operators |
| III. API Contract Fidelity | PASS | Faithfully represents custom fields; transforms UUID→name for UX while preserving raw data access |
| IV. API Beta Awareness | PASS | Custom field format verified via live testing 2025-01-09; defensive handling of unexpected structures |
| V. Documentation-Verified | PASS | API response structure verified against live API (official docs don't detail custom field format) |
| VI. MCP Integration Testing | PASS | Will execute test checklist including custom field scenarios before merge |

**Gates Evaluation**: All principles satisfied. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/006-custom-fields-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (MCP tool interface changes)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── client/
│   ├── api.ts           # ProductBoard API client
│   ├── types.ts         # TypeScript interfaces (ADD: CustomFieldConfig, TransformedEntity)
│   └── errors.ts        # Custom error handling
├── tools/
│   ├── entities.ts      # Entity CRUD tools (MODIFY: add customFields transformation)
│   ├── relationships.ts # Relationship tools (no changes)
│   └── config.ts        # Config tools (MODIFY: expose custom field mapping)
├── schemas/
│   ├── inputs.ts        # Zod input schemas (ADD: custom field filter schema)
│   └── responses.ts     # Response schemas (ADD: customFields schema)
├── utils/
│   ├── pagination.ts    # Pagination utilities (no changes)
│   ├── richtext.ts      # Richtext validation (no changes)
│   ├── validation.ts    # Field validation (no changes)
│   └── custom-fields.ts # NEW: UUID→name transformation, filter logic
└── index.ts             # MCP server entry point (no changes)

tests/
├── unit/
│   └── custom-fields.test.ts  # NEW: transformation and filter unit tests
└── live/
    └── custom-fields.test.ts  # NEW: live API integration tests
```

**Structure Decision**: Single project structure maintained. Feature adds one new utility module (`custom-fields.ts`) and modifies existing entity/config tools.

## Complexity Tracking

> No Constitution Check violations - section not required.
