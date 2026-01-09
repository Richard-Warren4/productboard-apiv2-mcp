# Tasks: Custom Fields Support

**Feature**: 006-custom-fields-support
**Input**: Design documents from `/specs/006-custom-fields-support/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks included as per constitution principle VI (MCP Integration Testing required).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (No Setup Needed)

**Purpose**: This feature enhances an existing MCP server with no new project setup required.

> **SKIP**: No setup tasks needed. Project already initialized with TypeScript, vitest, and all dependencies.

---

## Phase 2: Foundational (Shared Infrastructure)

**Purpose**: Core types and utilities that ALL user stories depend on

**CRITICAL**: These tasks MUST complete before any user story can begin.

- [ ] T001 [P] Add CustomFieldConfig, CustomFieldMapping, CustomFieldValue, and CustomFieldFilter type definitions in src/client/types.ts
- [ ] T002 [P] Create src/utils/custom-fields.ts with buildCustomFieldMapping() function that extracts custom fields from config
- [ ] T003 Add transformCustomFields() function in src/utils/custom-fields.ts that converts UUID-keyed fields to named customFields object
- [ ] T004 Export custom-fields utilities from src/utils/custom-fields.ts and add barrel export if needed

**Checkpoint**: Foundation ready - custom field mapping and transformation utilities available for all user stories.

---

## Phase 3: User Story 1 - View Custom Fields in Lists (Priority: P1) MVP

**Goal**: Add `customFields` object with human-readable field names to `pb_entity_list` and `pb_entity_search` responses.

**Independent Test**: Call `pb_entity_list({ entityType: "feature" })` and verify each feature includes `customFields` with named keys (e.g., "Reach", "Impact").

### Implementation for User Story 1

- [ ] T005 [US1] Modify formatEntityList() in src/tools/entities.ts to fetch custom field config via getSessionCached()
- [ ] T006 [US1] Call transformCustomFields() in formatEntityList() to add customFields to each entity in list results
- [ ] T007 [US1] Modify formatEntity() in src/tools/entities.ts to call transformCustomFields() for single entity formatting
- [ ] T008 [US1] Handle empty/null custom field values gracefully in transformCustomFields() - omit or set to null (FR-006)
- [ ] T009 [US1] Update pb_entity_list tool handler in src/tools/entities.ts to pass config to formatEntityList()
- [ ] T010 [US1] Update pb_entity_search tool handler in src/tools/entities.ts to pass config to formatEntityList()

**Checkpoint**: `pb_entity_list` and `pb_entity_search` now return `customFields` with human-readable names. US1 is independently testable.

---

## Phase 4: User Story 2 - Filter by Custom Fields (Priority: P2)

**Goal**: Add `customFieldFilters` input parameter to `pb_entity_search` for client-side filtering by custom field values.

**Independent Test**: Call `pb_entity_search({ entityType: "feature", customFieldFilters: [{ field: "Reach", operator: ">=", value: 50 }] })` and verify only matching features are returned.

### Implementation for User Story 2

- [ ] T011 [P] [US2] Add CustomFieldFilterSchema Zod schema in src/schemas/inputs.ts with field (string), operator (enum), value (union) validation
- [ ] T012 [P] [US2] Add customFieldFilters optional array to EntitySearchInputSchema in src/schemas/inputs.ts
- [ ] T013 [US2] Add validateCustomFieldFilters() function in src/utils/custom-fields.ts to check field names exist and operators valid for type
- [ ] T014 [US2] Add applyCustomFieldFilters() function in src/utils/custom-fields.ts to filter entity array by custom field criteria
- [ ] T015 [US2] Implement numeric operators (=, !=, <, <=, >, >=) in applyCustomFieldFilters() for number fields
- [ ] T016 [US2] Implement select operators (=, !=) in applyCustomFieldFilters() for single_select and multi_select fields
- [ ] T017 [US2] Modify pb_entity_search handler in src/tools/entities.ts to validate customFieldFilters before API call
- [ ] T018 [US2] Modify pb_entity_search handler to fetch all pages when customFieldFilters present (pagination handling)
- [ ] T019 [US2] Modify pb_entity_search handler to call applyCustomFieldFilters() after API response transformation
- [ ] T020 [US2] Add filteringInfo metadata (totalBeforeFiltering, totalAfterFiltering, pagesFetched) to search response
- [ ] T021 [US2] Add clear error messages for invalid field names with "Did you mean?" suggestions (FR-007)
- [ ] T022 [US2] Add clear error messages for invalid operators per field type (FR-007)

**Checkpoint**: `pb_entity_search` accepts `customFieldFilters` and returns only matching features. US2 is independently testable.

---

## Phase 5: User Story 3 - Individual Feature with All Custom Fields (Priority: P3)

**Goal**: Ensure `pb_entity_get` reliably returns all custom field values with human-readable names.

**Independent Test**: Call `pb_entity_get({ id: "feature-uuid" })` for a feature with DRICE scores and verify all custom fields appear in response.

### Implementation for User Story 3

- [ ] T023 [US3] Verify formatEntity() already includes all non-standard fields from API response in src/tools/entities.ts
- [ ] T024 [US3] Ensure pb_entity_get handler passes config to formatEntity() for transformation
- [ ] T025 [US3] Add customFields output to pb_entity_get response structure (may already be handled by T007)
- [ ] T026 [US3] Test edge case: feature with some custom fields empty - verify populated fields show values, empty show null

**Checkpoint**: `pb_entity_get` returns complete `customFields` object. US3 is independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: MCP integration testing and documentation

- [ ] T027 Build project with `npm run build` and verify no TypeScript errors
- [ ] T028 Run `npm run lint` and fix any linting issues
- [ ] T029 [P] Add custom field test scenarios to specs/mcp-test-checklist.md
- [ ] T030 Execute MCP integration test: pb_entity_list returns customFields for features
- [ ] T031 Execute MCP integration test: pb_entity_search returns customFields for features
- [ ] T032 Execute MCP integration test: pb_entity_search with customFieldFilters returns filtered results
- [ ] T033 Execute MCP integration test: pb_entity_get returns all customFields
- [ ] T034 Execute MCP integration test: Invalid field name returns helpful error
- [ ] T035 Execute MCP integration test: Invalid operator for field type returns helpful error
- [ ] T036 [P] Update CLAUDE.md with custom field filter documentation
- [ ] T037 Run quickstart.md scenarios to validate examples work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: SKIP - not needed
- **Phase 2 (Foundational)**: No dependencies - start immediately - **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 completion
- **Phase 4 (US2)**: Depends on Phase 2 completion (can run parallel with US1)
- **Phase 5 (US3)**: Depends on Phase 2 completion (can run parallel with US1/US2, but shares T007)
- **Phase 6 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (P1) | Phase 2 (T001-T004) | T004 complete |
| US2 (P2) | Phase 2 (T001-T004) | T004 complete |
| US3 (P3) | Phase 2 (T001-T004), US1 T007 | T007 complete |

### Within Each User Story

1. Schema/types before functions
2. Utility functions before tool handlers
3. Core logic before edge cases
4. Validation before error handling

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T001 and T002 can run in parallel (different files)

**Phase 4 (US2)**:
- T011 and T012 can run in parallel (same file but independent schemas)

**Phase 6 (Polish)**:
- T029 and T036 can run in parallel (different files)
- T030-T035 should run sequentially (MCP integration tests)

---

## Parallel Example: Phase 2 Foundation

```bash
# Launch foundational tasks in parallel:
Task: "Add type definitions in src/client/types.ts"
Task: "Create buildCustomFieldMapping() in src/utils/custom-fields.ts"
```

## Parallel Example: User Story 2 Schemas

```bash
# Launch schema tasks in parallel:
Task: "Add CustomFieldFilterSchema in src/schemas/inputs.ts"
Task: "Add customFieldFilters to EntitySearchInputSchema in src/schemas/inputs.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T004)
2. Complete Phase 3: User Story 1 (T005-T010)
3. **STOP and VALIDATE**: Test `pb_entity_list` returns customFields
4. Build and run basic MCP integration test
5. **MVP DELIVERED**: PMs can see custom field values in feature lists

### Incremental Delivery

1. **Phase 2** → Foundation ready (types, utilities)
2. **Add US1** → Test independently → **MVP: View custom fields in lists**
3. **Add US2** → Test independently → **Filter by DRICE scores**
4. **Add US3** → Test independently → **Complete single feature fetch**
5. **Polish** → Full MCP integration testing, documentation

### Recommended Order

1. T001-T004 (Foundation)
2. T005-T010 (US1 - MVP)
3. T027-T028 (Build & lint check)
4. T030-T031 (Basic MCP tests)
5. T011-T022 (US2 - Filtering)
6. T032, T034-T035 (Filter MCP tests)
7. T023-T026 (US3 - Individual fetch)
8. T033 (Individual fetch MCP test)
9. T029, T036-T037 (Documentation)

---

## Task Summary

| Phase | Tasks | Story Coverage |
|-------|-------|----------------|
| Phase 1: Setup | 0 | N/A (skip) |
| Phase 2: Foundational | 4 | All stories |
| Phase 3: US1 | 6 | View custom fields in lists |
| Phase 4: US2 | 12 | Filter by custom fields |
| Phase 5: US3 | 4 | Individual feature fetch |
| Phase 6: Polish | 11 | Cross-cutting |
| **Total** | **37** | |

---

## Notes

- [P] tasks can run in parallel (different files, no dependencies)
- [US*] label maps task to specific user story
- Each user story should be independently completable and testable
- MCP integration tests (T030-T035) are REQUIRED per constitution principle VI
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
