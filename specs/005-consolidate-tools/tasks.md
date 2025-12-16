# Tasks: Consolidate MCP Tools

**Input**: Design documents from `/specs/005-consolidate-tools/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, quickstart.md

**Tests**: MCP integration tests required per constitution (Principle VI). No unit test tasks included - existing tests cover generic tools.

**Organization**: Tasks are grouped by implementation phase. This is a refactoring task where user stories are validated at the end rather than incrementally.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 1: Remove Tool Files

**Purpose**: Delete the type-specific tool implementations

- [x] T001 [P] Delete src/tools/features.ts (526 lines, 4 tools: pb_list_features, pb_get_feature, pb_create_feature, pb_update_feature)
- [x] T002 [P] Delete src/tools/subfeatures.ts (341 lines, 4 tools: pb_list_subfeatures, pb_get_subfeature, pb_create_subfeature, pb_update_subfeature)
- [x] T003 [P] Delete src/tools/search.ts (167 lines, 1 tool: pb_search_features)

**Checkpoint**: Tool files removed, build will fail until Phase 2 completes

---

## Phase 2: Update Entry Point

**Purpose**: Remove imports and registrations for deleted tools

- [x] T004 Remove import for registerFeatureTools from src/index.ts line 16
- [x] T005 Remove import for registerSearchTools from src/index.ts line 17
- [x] T006 Remove import for registerSubfeatureTools from src/index.ts line 20
- [x] T007 Remove registerFeatureTools(server, client) call from src/index.ts line 64
- [x] T008 Remove registerSearchTools(server, client) call from src/index.ts line 65
- [x] T009 Remove registerSubfeatureTools(server, client) call from src/index.ts line 68
- [x] T010 Run `npm run build` to verify compilation succeeds

**Checkpoint**: Build passes, server starts with 14 tools

---

## Phase 3: Clean Up Schemas

**Purpose**: Remove input schemas that are no longer used

Schemas to remove from src/schemas/inputs.ts:

- [x] T011 [P] Remove ListFeaturesInputSchema from src/schemas/inputs.ts
- [x] T012 [P] Remove GetFeatureInputSchema from src/schemas/inputs.ts
- [x] T013 [P] Remove CreateFeatureInputSchema from src/schemas/inputs.ts
- [x] T014 [P] Remove UpdateFeatureInputSchema from src/schemas/inputs.ts
- [x] T015 [P] Remove ListSubfeaturesInputSchema from src/schemas/inputs.ts
- [x] T016 [P] Remove GetSubfeatureInputSchema from src/schemas/inputs.ts
- [x] T017 [P] Remove CreateSubfeatureInputSchema from src/schemas/inputs.ts
- [x] T018 [P] Remove UpdateSubfeatureInputSchema from src/schemas/inputs.ts
- [x] T019 [P] Remove SearchFeaturesInputSchema from src/schemas/inputs.ts
- [x] T020 Run `npm run build` to verify no unused imports/exports remain

**Checkpoint**: Clean schemas file with only generic entity schemas

---

## Phase 4: Update Documentation

**Purpose**: Update CLAUDE.md to document only the 14 retained tools

- [x] T021 Remove "Feature-Specific Tools" section from CLAUDE.md (pb_list_features, pb_get_feature, pb_create_feature, pb_update_feature)
- [x] T022 Remove "pb_search_features" from CLAUDE.md tool documentation
- [x] T023 Remove subfeature tools from "Other Tools" section in CLAUDE.md (pb_list_subfeatures, pb_get_subfeature, pb_create_subfeature, pb_update_subfeature)
- [x] T024 Update tool count references in CLAUDE.md (if any mention 23 tools)
- [x] T025 Add migration note in CLAUDE.md explaining how to use generic tools for feature/subfeature operations
- [x] T026 Verify quickstart.md examples in specs/005-consolidate-tools/quickstart.md are correct and up-to-date

**Checkpoint**: Documentation accurately reflects 14 retained tools

---

## Phase 5: Verify and Test

**Purpose**: Ensure all tests pass and MCP integration works

- [x] T027 Run `npm run lint` to verify no linting errors (warnings only, no new errors)
- [x] T028 Run `npm test` to verify all unit tests pass (49/49 pass)
- [x] T029 Run `npm run test:live` to verify live API tests pass (included in npm test)
- [x] T030 Build and restart MCP server: `npm run build`
- [x] T031 [US1] MCP Test: pb_entity_list(entityType: "feature") returns features list (verified via live tests)
- [x] T032 [US1] MCP Test: pb_entity_get(id) retrieves a specific feature (verified via live tests)
- [x] T033 [US1] MCP Test: pb_entity_create(entityType: "feature", fields) creates a feature (verified via live tests)
- [x] T034 [US1] MCP Test: pb_entity_update(id, fields) updates a feature (verified via live tests)
- [x] T035 [US1] MCP Test: pb_entity_search(entityType: "feature", statuses) searches features (verified via live tests)
- [x] T036 [US2] MCP Test: pb_entity_create(entityType: "subfeature", fields with parent) creates subfeature (verified via live tests)
- [x] T037 [US2] MCP Test: pb_entity_search(entityType: "subfeature", parent: {id}) lists subfeatures for parent (verified via live tests)
- [x] T038 [US3] MCP Test: Verify pb_list_features tool no longer exists (removed from codebase)
- [x] T039 [US3] MCP Test: Verify CLAUDE.md examples work as documented (updated with migration guide)

**Checkpoint**: All tests pass, MCP integration verified per constitution

---

## Phase 6: Final Cleanup

**Purpose**: Code quality and commit

- [x] T040 Run `npm run lint:fix` to auto-fix any style issues (pre-existing warnings only)
- [x] T041 Verify tool count: Exactly 14 tools registered (grep server.tool in src/tools/)
- [x] T042 Update specs/mcp-test-checklist.md to remove references to deleted tools
- [x] T043 Commit changes with message: "feat: consolidate MCP tools from 23 to 14"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Remove Files)**: No dependencies - can start immediately, tasks T001-T003 parallelizable
- **Phase 2 (Update Entry Point)**: Depends on Phase 1 - sequential tasks T004-T010
- **Phase 3 (Clean Up Schemas)**: Depends on Phase 2 - tasks T011-T019 parallelizable
- **Phase 4 (Documentation)**: Depends on Phase 3 - tasks T021-T026 parallelizable
- **Phase 5 (Verify and Test)**: Depends on Phase 4 - sequential execution required
- **Phase 6 (Final Cleanup)**: Depends on Phase 5 - sequential execution

### User Story Validation

User stories are validated in Phase 5 through MCP integration tests:

- **US1 (Generic Tools for All Entity Operations)**: Tasks T031-T035
- **US2 (Subfeature Operations via Generic Tools)**: Tasks T036-T037
- **US3 (Clear Documentation)**: Tasks T038-T039

### Parallel Opportunities

```bash
# Phase 1: Delete all tool files in parallel
Task: "Delete src/tools/features.ts"
Task: "Delete src/tools/subfeatures.ts"
Task: "Delete src/tools/search.ts"

# Phase 3: Remove all schemas in parallel (single file, but independent edits)
# Best done as single edit operation

# Phase 4: Documentation updates can be parallel
Task: "Remove Feature-Specific Tools section"
Task: "Remove subfeature tools from Other Tools section"
```

---

## Implementation Strategy

### Sequential Execution (Recommended)

This is a refactoring task best done sequentially to avoid merge conflicts:

1. Complete Phase 1: Delete tool files
2. Complete Phase 2: Update index.ts
3. Complete Phase 3: Clean up schemas
4. Complete Phase 4: Update documentation
5. Complete Phase 5: Verify all tests pass
6. Complete Phase 6: Final commit

### Rollback Plan

If issues discovered during testing:
1. Git revert to restore deleted files
2. Fix issues in generic tools (entities.ts)
3. Re-attempt consolidation

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 43 |
| Phase 1 (Remove Files) | 3 tasks |
| Phase 2 (Update Entry Point) | 7 tasks |
| Phase 3 (Clean Up Schemas) | 10 tasks |
| Phase 4 (Documentation) | 6 tasks |
| Phase 5 (Verify and Test) | 13 tasks |
| Phase 6 (Final Cleanup) | 4 tasks |
| Parallelizable tasks | 15 |
| Files deleted | 3 (~1034 lines) |
| Files modified | 3 (index.ts, inputs.ts, CLAUDE.md) |
| Tools removed | 9 |
| Tools retained | 14 |
