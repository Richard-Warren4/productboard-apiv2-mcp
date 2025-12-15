# Implementation Plan: Generic Entity Support

**Branch**: `004-generic-entity-support` | **Date**: 2025-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-generic-entity-support/spec.md`

## Summary

Extend the ProductBoard MCP server to support CRUD operations across all 9 entity types (objective, product, component, feature, subfeature, releaseGroup, release, company, user) using dynamic configuration discovery. The implementation introduces generic entity tools that leverage the entity configuration API for field validation, while maintaining backward compatibility with existing feature/subfeature-specific tools.

## Technical Context

**Language/Version**: TypeScript 5.4+ with Node.js 20 LTS
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.0.0, zod ^3.23.0, native fetch
**Storage**: In-memory session cache for entity configuration (no persistence)
**Testing**: vitest (unit + live integration tests)
**Target Platform**: Node.js server (MCP stdio transport)
**Project Type**: Single project (MCP server)
**Performance Goals**: N/A (API client, performance bound by ProductBoard API)
**Constraints**: 50 req/s rate limit (ProductBoard API), default 100 items/page pagination
**Scale/Scope**: 9 entity types, ~6 generic tools + existing specific tools

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. MCP-First Design | PASS | All operations exposed as MCP tools with clear purposes |
| II. Type Safety & Validation | PASS | TypeScript strict mode, Zod validation at tool boundaries |
| III. API Contract Fidelity | PASS | Uses config endpoints for dynamic field discovery |
| IV. API Beta Awareness | PASS | Documentation notes beta status |
| V. Documentation-Verified | PASS | Request structures verified against official docs |

**Gate Status**: PASSED - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/004-generic-entity-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── client/
│   ├── api.ts           # ProductBoard API client (extend with generic entity methods)
│   ├── types.ts         # TypeScript interfaces (add generic entity types)
│   └── errors.ts        # Error handling
├── tools/
│   ├── entities.ts      # NEW: Generic entity tools (pb_entity_*)
│   ├── config.ts        # Entity configuration tools (existing, extend)
│   ├── features.ts      # Existing feature tools (refactor to use generic handler)
│   ├── subfeatures.ts   # Existing subfeature tools (refactor to use generic handler)
│   ├── relationships.ts # Relationship tools
│   └── search.ts        # Search tools
├── schemas/
│   ├── inputs.ts        # Zod schemas (add generic entity schemas)
│   └── responses.ts     # Response schemas
├── utils/
│   ├── validation.ts    # Field validation (extend for all entity types)
│   ├── richtext.ts      # HTML validation
│   └── pagination.ts    # Pagination helpers
└── index.ts             # MCP server entry point (register new tools)

tests/
├── live/
│   ├── features.test.ts    # Existing live tests
│   ├── config.test.ts      # Existing config tests
│   └── entities.test.ts    # NEW: Generic entity live tests
├── unit/
│   └── validation.test.ts  # Existing unit tests (extend)
└── manual/
    ├── discover-entities.ts     # Entity discovery script
    └── test-create-with-fields.ts # Manual test script
```

**Structure Decision**: Extending existing single-project MCP server structure. New generic entity tools in `src/tools/entities.ts`, with existing feature/subfeature tools refactored to delegate to generic handler.

## Complexity Tracking

No complexity violations. The design:
- Adds one new tool file (`entities.ts`) rather than duplicating code per entity type
- Reuses existing validation, pagination, and error handling utilities
- Maintains backward compatibility by keeping existing tool interfaces
