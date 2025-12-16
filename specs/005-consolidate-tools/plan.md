# Implementation Plan: Consolidate MCP Tools

**Branch**: `005-consolidate-tools` | **Date**: 2025-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-consolidate-tools/spec.md`

## Summary

Consolidate the MCP tool surface by removing type-specific feature/subfeature tools in favor of the existing generic entity tools. This reduces the tool count from 23 to 14 (39% reduction) while maintaining full functionality. The generic `pb_entity_*` tools already support all operations; this task removes redundant code and updates documentation.

## Technical Context

**Language/Version**: TypeScript 5.4+ with Node.js 20 LTS
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.0.0, zod ^3.23.0, native fetch
**Storage**: N/A (API client only)
**Testing**: vitest for unit tests, live API tests via npm run test:live, MCP integration tests via Claude Code
**Target Platform**: Node.js MCP server (stdio transport)
**Project Type**: Single project (MCP server)
**Performance Goals**: N/A (refactoring only)
**Constraints**: Must maintain API compatibility for all entity operations
**Scale/Scope**: 9 tools removed, ~867 lines of code deleted, 1 documentation file updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. MCP-First Design | PASS | Consolidating to cleaner, more consistent tool set improves MCP usability |
| II. Type Safety & Validation | PASS | No type changes needed; removing code only |
| III. API Contract Fidelity | PASS | Generic tools already faithfully represent all ProductBoard operations |
| IV. API Beta Awareness | PASS | No API changes; pure refactoring |
| V. Documentation-Verified | PASS | Removing redundant implementations that duplicate generic tools |
| VI. MCP Integration Testing | REQUIRED | Must run full MCP test checklist after consolidation |

**Gate Status**: PASSED - No violations. Proceed to implementation.

## Project Structure

### Documentation (this feature)

```text
specs/005-consolidate-tools/
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal - no unknowns)
├── tasks.md             # Phase 2 output (/speckit.tasks command)
└── checklists/
    └── requirements.md  # Spec validation (completed)
```

### Source Code (changes)

```text
src/tools/
├── features.ts          # DELETE (526 lines)
├── subfeatures.ts       # DELETE (341 lines)
├── search.ts            # DELETE (~100 lines)
├── entities.ts          # KEEP (generic entity tools)
├── relationships.ts     # KEEP (relationship tools)
└── config.ts            # KEEP (configuration tools)

src/
├── index.ts             # MODIFY (remove tool registrations)
└── schemas/inputs.ts    # REVIEW (may have unused schemas)

CLAUDE.md                # UPDATE (document consolidated tools)
```

**Structure Decision**: Single project structure. This is a refactoring task that removes files and updates existing files. No new directories or structures needed.

## Complexity Tracking

> **No violations - section not applicable**

This is a code reduction task with no additional complexity.

## Implementation Approach

### Phase 1: Remove Tool Files

1. Delete `src/tools/features.ts`
2. Delete `src/tools/subfeatures.ts`
3. Delete `src/tools/search.ts`

### Phase 2: Update Entry Point

1. Remove imports of deleted tool files from `src/index.ts`
2. Remove tool registration calls for deleted tools
3. Verify build succeeds

### Phase 3: Clean Up Schemas

1. Review `src/schemas/inputs.ts` for unused schemas
2. Remove schemas only used by deleted tools:
   - `CreateFeatureInputSchema` (if only in features.ts)
   - `UpdateFeatureInputSchema` (if only in features.ts)
   - `SearchFeaturesInputSchema` (if only in search.ts)
   - Subfeature-related schemas

### Phase 4: Update Documentation

1. Update `CLAUDE.md` to:
   - Remove references to deleted tools
   - Document the 14 retained tools with usage examples
   - Update the tool table

### Phase 5: Verify and Test

1. Run `npm run build` - ensure clean compilation
2. Run `npm test` - all tests must pass
3. Update any test files that reference deleted tools
4. Run MCP integration tests per constitution requirement

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tests reference deleted tools | Medium | Low | Update test files in same PR |
| Users rely on old tool names | Low | Medium | Document migration in PR notes |
| Generic tools missing functionality | Low | High | Verified in spec - already equivalent |

## Dependencies

- None - all generic tools are already implemented and tested

## Deliverables

1. Deleted files: features.ts, subfeatures.ts, search.ts
2. Updated: src/index.ts (tool registrations removed)
3. Updated: CLAUDE.md (consolidated tool documentation)
4. Cleaned: src/schemas/inputs.ts (unused schemas removed)
5. Updated: Any test files referencing deleted tools
