# Tasks: Dynamic Entity Configuration Discovery

**Input**: Design documents from `/specs/003-dynamic-entity-config/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, quickstart.md

**Tests**: Test tasks included per vitest framework specified in plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No new project setup required - enhancing existing MCP server

- [X] T001 Verify existing project structure matches plan.md expectations in src/

**Checkpoint**: Project structure verified

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and caching infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Add EntityConfiguration interface to src/client/types.ts (type, fields, lifecycle)
- [X] T003 [P] Add FieldDefinition interface to src/client/types.ts (id, name, displayName, type, required, readOnly, options, validation)
- [X] T004 [P] Add FieldType union type to src/client/types.ts (text, richtext, number, boolean, date, datetime, status, member, team, single_select, multi_select, health, progress, timeframe, unknown)
- [X] T005 [P] Add FieldOption interface to src/client/types.ts (id, name, color)
- [X] T006 [P] Add FieldValidation interface to src/client/types.ts (maxLength, minValue, maxValue, pattern)
- [X] T007 [P] Add LifecycleOperation interface to src/client/types.ts (settableFields, requiredFields)
- [X] T008 [P] Add ValidationResult and ValidationWarning interfaces to src/client/types.ts
- [X] T009 [P] Add ValidationIssue union type to src/client/types.ts (missing_required, invalid_value, type_mismatch, constraint_violation)
- [X] T010 [P] Add ConfigCache interface to src/client/types.ts (configs Map, initialized flag)
- [X] T011 Implement session-based caching utility function getSessionCached<T> in src/tools/config.ts (replace TTL-based cache)

**Checkpoint**: Foundation ready - types defined, caching infrastructure in place. User story implementation can now begin.

---

## Phase 3: User Story 1 - Discover Workspace Field Configuration (Priority: P1) MVP

**Goal**: Users can discover all available fields for features and subfeatures in their workspace with a single request, including field names, types, required status, and available options for select fields.

**Independent Test**: Call `pb_get_config` with entityType "feature" or "subfeature" and receive a formatted list of available fields with their configuration details.

### Tests for User Story 1

- [X] T012 [P] [US1] Create live test for pb_get_config feature configuration in tests/live/config.test.ts
- [X] T013 [P] [US1] Create live test for pb_get_config subfeature configuration in tests/live/config.test.ts
- [X] T014 [P] [US1] Create live test for configuration caching behavior (second call uses cache) in tests/live/config.test.ts

### Implementation for User Story 1

- [X] T015 [US1] Update getEntityConfiguration method in src/client/api.ts to return typed EntityConfiguration response
- [X] T016 [US1] Enhance pb_get_config tool in src/tools/config.ts to format field configuration output with names, types, required status
- [X] T017 [US1] Add field options display to pb_get_config output for status and select-type fields in src/tools/config.ts
- [X] T018 [US1] Implement KNOWN_FIELD_TYPES constant and silent skip for unknown field types in src/tools/config.ts
- [X] T019 [US1] Add graceful error handling for configuration fetch failures in src/tools/config.ts (FR-006)
- [X] T020 [US1] Run and verify live tests pass for User Story 1 in tests/live/config.test.ts

**Checkpoint**: User Story 1 complete - users can discover workspace field configuration. Run `npm run test:live` to verify.

---

## Phase 4: User Story 2 - Validate Inputs Against Configuration (Priority: P2)

**Goal**: Provide validation warnings when inputs don't match workspace configuration. Warnings are informational and do not block operations.

**Independent Test**: Attempt to create a feature with an invalid status value and receive a clear warning message listing available options.

**Dependency**: Requires User Story 1 (configuration discovery) to be complete.

### Tests for User Story 2

- [X] T021 [P] [US2] Create unit test for validateFieldsAgainstConfig with missing required field in tests/unit/validation.test.ts
- [X] T022 [P] [US2] Create unit test for validateFieldsAgainstConfig with invalid status value in tests/unit/validation.test.ts
- [X] T023 [P] [US2] Create unit test for validateFieldsAgainstConfig with constraint violation in tests/unit/validation.test.ts
- [X] T024 [P] [US2] Create unit test for validateFieldsAgainstConfig with unknown field (silent skip) in tests/unit/validation.test.ts

### Implementation for User Story 2

- [X] T025 [US2] Create src/utils/validation.ts with validateFieldsAgainstConfig function signature
- [X] T026 [US2] Implement missing required field detection in src/utils/validation.ts
- [X] T027 [US2] Implement invalid status/select value detection with available options in src/utils/validation.ts
- [X] T028 [US2] Implement constraint violation detection (maxLength, minValue, maxValue) in src/unit/validation.ts
- [X] T029 [US2] Implement silent skip for unknown fields in src/utils/validation.ts
- [X] T030 [US2] Add validation warning integration to pb_create_feature in src/tools/features.ts
- [X] T031 [US2] Add validation warning integration to pb_update_feature in src/tools/features.ts
- [X] T032 [US2] Add validation warning integration to pb_create_subfeature in src/tools/subfeatures.ts
- [X] T033 [US2] Add validation warning integration to pb_update_subfeature in src/tools/subfeatures.ts
- [X] T034 [US2] Run and verify unit tests pass for validation utility in tests/unit/validation.test.ts
- [X] T035 [US2] Run and verify live tests pass with validation warnings in tests/live/

**Checkpoint**: User Story 2 complete - validation warnings appear in create/update operations. Run `npm test` to verify.

---

## Phase 5: User Story 3 - Dynamic Field Discovery for Create/Update (Priority: P3)

**Goal**: Create and update operations dynamically adapt to workspace configuration, allowing users to set custom fields without MCP code changes.

**Independent Test**: Configure a custom field in ProductBoard workspace and successfully use it through MCP create/update operations.

**Dependency**: Requires User Story 1 (configuration discovery) to provide field metadata.

### Tests for User Story 3

- [X] T036 [P] [US3] Create live test for custom field pass-through on feature create in tests/live/features.test.ts
- [X] T037 [P] [US3] Create live test for dynamic field handling on feature update in tests/live/features.test.ts

### Implementation for User Story 3

- [X] T038 [US3] Implement dynamic field pass-through for unknown fields in pb_create_feature in src/tools/features.ts
- [X] T039 [US3] Implement dynamic field pass-through for unknown fields in pb_update_feature in src/tools/features.ts
- [X] T040 [US3] Implement dynamic field pass-through for unknown fields in pb_create_subfeature in src/tools/subfeatures.ts
- [X] T041 [US3] Implement dynamic field pass-through for unknown fields in pb_update_subfeature in src/tools/subfeatures.ts
- [X] T042 [US3] Verify configuration refresh on server restart behavior
- [X] T043 [US3] Run and verify live tests pass for dynamic field handling in tests/live/

**Checkpoint**: User Story 3 complete - custom fields work without MCP code changes. Run `npm run test:live` to verify.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [X] T044 Run full test suite (npm test) and verify all tests pass
- [X] T045 Run live integration tests (npm run test:live) and verify all pass
- [X] T046 [P] Run quickstart.md validation scenarios manually
- [X] T047 [P] Run linter (npm run lint) and fix any issues
- [X] T048 Verify configuration caching adds max 1 API call per session (SC-004)
- [X] T049 Final code review for type safety and error handling

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verify existing structure
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 2 AND Phase 3 (needs config discovery)
- **User Story 3 (Phase 5)**: Depends on Phase 2 AND Phase 3 (needs config discovery)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 (requires configuration data for validation)
- **User Story 3 (P3)**: Depends on User Story 1 (requires configuration data for dynamic fields)

### Within Each User Story

- Tests written first, verify they fail before implementation
- Core implementation before integration
- Story complete before moving to next priority
- Commit after each task or logical group

### Parallel Opportunities

- **Phase 2**: All type definition tasks (T002-T010) can run in parallel
- **Phase 3**: All test tasks (T012-T014) can run in parallel before implementation
- **Phase 4**: All unit test tasks (T021-T024) can run in parallel before implementation
- **Phase 5**: All live test tasks (T036-T037) can run in parallel before implementation
- **Phase 6**: Polish tasks marked [P] can run in parallel

---

## Parallel Example: Phase 2 (Foundational Types)

```bash
# Launch all type definition tasks together:
Task: "Add EntityConfiguration interface to src/client/types.ts"
Task: "Add FieldDefinition interface to src/client/types.ts"
Task: "Add FieldType union type to src/client/types.ts"
Task: "Add FieldOption interface to src/client/types.ts"
Task: "Add FieldValidation interface to src/client/types.ts"
Task: "Add LifecycleOperation interface to src/client/types.ts"
Task: "Add ValidationResult and ValidationWarning interfaces to src/client/types.ts"
Task: "Add ValidationIssue union type to src/client/types.ts"
Task: "Add ConfigCache interface to src/client/types.ts"
```

---

## Parallel Example: User Story 2 (Validation Tests)

```bash
# Launch all unit tests for User Story 2 together:
Task: "Create unit test for validateFieldsAgainstConfig with missing required field"
Task: "Create unit test for validateFieldsAgainstConfig with invalid status value"
Task: "Create unit test for validateFieldsAgainstConfig with constraint violation"
Task: "Create unit test for validateFieldsAgainstConfig with unknown field (silent skip)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify structure)
2. Complete Phase 2: Foundational (types and caching)
3. Complete Phase 3: User Story 1 (configuration discovery)
4. **STOP and VALIDATE**: Test `pb_get_config` independently
5. Deploy/demo if ready - users can now see field configurations

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> Deploy (MVP - config discovery)
3. Add User Story 2 -> Test independently -> Deploy (validation warnings)
4. Add User Story 3 -> Test independently -> Deploy (dynamic fields)
5. Each story adds value without breaking previous stories

### Single Developer Strategy (Sequential)

1. Complete Setup + Foundational
2. User Story 1 (P1): Configuration discovery
3. User Story 2 (P2): Validation warnings (builds on US1)
4. User Story 3 (P3): Dynamic fields (builds on US1)
5. Polish phase

---

## Notes

- [P] tasks = different files or sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Tests use vitest framework per plan.md
- Warn-only validation (FR-005) - never blocks operations
- Unknown field types silently skipped (FR-008)
- Session-based caching - no TTL, refresh on server restart (FR-007)
- Avoid: vague tasks, same file conflicts without coordination

---

## Completion Summary

**Status**: ✅ ALL TASKS COMPLETE (T001-T049)

**Implementation Date**: 2025-12-15

**Test Results**:
- 49 tests passing (22 unit tests + 27 live tests)
- Build successful
- Lint passing (warnings only)

**Key Files Modified**:
- `src/client/types.ts` - Added configuration and validation types
- `src/tools/config.ts` - Added session caching, KNOWN_FIELD_TYPES, formatted output
- `src/tools/features.ts` - Integrated validation warnings and custom field pass-through
- `src/tools/subfeatures.ts` - Integrated validation warnings and custom field pass-through
- `src/schemas/inputs.ts` - Added `.passthrough()` for custom fields
- `src/utils/validation.ts` - NEW: Field validation utility
- `tests/unit/validation.test.ts` - NEW: 22 unit tests
- `tests/live/config.test.ts` - NEW: Configuration discovery tests
