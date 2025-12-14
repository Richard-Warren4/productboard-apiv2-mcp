# Implementation Plan: Fix Search Feature Stale Results

**Branch**: `002-fix-search-stale-results` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-fix-search-stale-results/spec.md`

## Summary

Fix the `pb_search_features` MCP tool which returns incomplete results by using the ProductBoard API's native `name` parameter for server-side text filtering instead of falling back to `listFeatures` with client-side filtering.

**Root Cause**: When only a `query` parameter is provided, the tool falls back to `listFeatures` which returns only page 1 (~100 features), then applies client-side filtering. Features on page 2+ are never searched.

**Solution**: Pass the user's `query` as the `name` parameter in the search API call, enabling server-side filtering across all features.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 20 LTS
**Primary Dependencies**: @modelcontextprotocol/sdk, zod, native fetch
**Storage**: N/A (API client only)
**Testing**: Vitest (npm test, npm run test:live)
**Target Platform**: Node.js CLI/MCP server
**Project Type**: Single project
**Performance Goals**: Search results returned within 5 seconds
**Constraints**: Must handle workspaces with 1000+ features
**Scale/Scope**: Bug fix affecting 2 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. MCP-First Design | PASS | Fix is within existing MCP tool `pb_search_features` |
| II. Type Safety & Validation | PASS | Will add `name` parameter to existing typed interface |
| III. API Contract Fidelity | PASS | Using documented `name` parameter in search API |
| IV. API Beta Awareness | PASS | No new beta dependencies |
| V. Documentation-Verified | PASS | `name` parameter verified via live API testing 2025-12-14 |

**Gate Result**: PASS - No violations, proceed with implementation.

## Project Structure

### Documentation (this feature)

```text
specs/002-fix-search-stale-results/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal - already verified)
├── checklists/          # Validation checklists
│   └── requirements.md
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (files to modify)

```text
src/
├── client/
│   └── api.ts           # Add `name` parameter to searchFeatures method
└── tools/
    └── search.ts        # Always use searchFeatures, pass query as name

tests/
└── live/
    └── search.test.ts   # Add/update tests for name-based search
```

**Structure Decision**: Single project, modifying existing files only. No new files required.

## Complexity Tracking

> No violations - table not required.

## Implementation Approach

### Phase 1: API Client Update

**File**: `src/client/api.ts`

1. Add `name?: string` parameter to `searchFeatures` method signature
2. Include `name` in the request body when provided:
   ```typescript
   if (params?.name) {
     data.name = params.name;
   }
   ```

### Phase 2: Search Tool Update

**File**: `src/tools/search.ts`

1. Remove the conditional logic that falls back to `listFeatures`
2. Always call `client.searchFeatures()` with the `name` parameter:
   ```typescript
   const response = await client.searchFeatures({
     name: input.query,  // Server-side name filtering
     statuses: searchParams.statuses,
     owners: searchParams.owners,
     pageCursor: input.pageCursor,
   });
   ```
3. Remove client-side name filtering (now handled by API)
4. Keep client-side team filtering (not supported by API)

### Phase 3: Testing

1. Update existing search tests to verify:
   - Feature found by exact name
   - Feature found by partial name
   - Feature found regardless of position in full list
   - Combined filters (name + status + team) work correctly
2. Run live API tests to confirm fix

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `name` parameter undocumented | Low | Low | Already verified via live API testing |
| API behavior changes in beta | Medium | Medium | Tests will catch; existing retry logic handles errors |
| Performance with large result sets | Low | Low | Server-side filtering reduces data transfer |

## Success Verification

After implementation, verify:

1. `pb_search_features` with query "Store Web App MVP" returns the feature
2. Features updated in December 2025 appear in search results
3. All existing tests pass
4. Live API tests confirm expected behavior
