# Research: Consolidate MCP Tools

**Feature**: 005-consolidate-tools
**Date**: 2025-12-15
**Status**: Complete (no unknowns)

## Overview

This feature is a straightforward refactoring task with no technical unknowns. All decisions have been pre-verified through existing implementation.

## Research Findings

### 1. Generic Tool Equivalence

**Question**: Do the generic `pb_entity_*` tools support all functionality of the type-specific tools?

**Finding**: YES - Fully equivalent

| Type-Specific Tool | Generic Equivalent | Notes |
|--------------------|-------------------|-------|
| `pb_list_features` | `pb_entity_list(entityType: "feature")` | Same pagination, same filters |
| `pb_get_feature` | `pb_entity_get(id)` | Auto-detects type |
| `pb_create_feature` | `pb_entity_create(entityType: "feature", fields)` | Same field support |
| `pb_update_feature` | `pb_entity_update(id, fields)` | Same field support |
| `pb_search_features` | `pb_entity_search(entityType: "feature", ...)` | Same filter params |
| `pb_list_subfeatures` | `pb_entity_search(entityType: "subfeature", parent: {id})` | Uses search with parent filter |
| `pb_get_subfeature` | `pb_entity_get(id)` | Auto-detects type |
| `pb_create_subfeature` | `pb_entity_create(entityType: "subfeature", fields)` | Parent via fields.parent |
| `pb_update_subfeature` | `pb_entity_update(id, fields)` | Same field support |

**Evidence**: All generic tools were implemented and tested in feature 004-generic-entity-support.

### 2. Schema Usage Analysis

**Question**: Which schemas in `inputs.ts` are only used by the tools being deleted?

**Finding**: Need to verify at implementation time, but likely candidates:
- `CreateFeatureInputSchema` - used by `pb_create_feature`
- `UpdateFeatureInputSchema` - used by `pb_update_feature`
- `SearchFeaturesInputSchema` - used by `pb_search_features`
- `CreateSubfeatureInputSchema` - used by `pb_create_subfeature`
- `UpdateSubfeatureInputSchema` - used by `pb_update_subfeature`
- `ListSubfeaturesInputSchema` - used by `pb_list_subfeatures`

**Decision**: Check imports during implementation and remove only schemas with no remaining references.

### 3. Test File Dependencies

**Question**: Do any test files depend on the tools being removed?

**Finding**: Need to verify at implementation time

**Decision**: Update test files to use generic tools or remove tests if redundant with generic tool tests.

## Decisions Summary

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Delete tool files entirely | Clean removal, no deprecation period | Deprecation warnings - rejected (adds complexity) |
| Keep generic tools unchanged | Already support all operations | Add convenience aliases - rejected (defeats consolidation purpose) |
| Update CLAUDE.md only | Primary user documentation | Update README.md - rejected (README is minimal) |

## Open Questions

None - all questions resolved.

## Next Steps

Proceed directly to implementation via `/speckit.tasks`.
