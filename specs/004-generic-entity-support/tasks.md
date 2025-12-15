# Tasks: Generic Entity Support

**Input**: Design documents from `/specs/004-generic-entity-support/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Project structure verification and configuration (project already exists)

- [X] T001 Verify Node.js 20 LTS and TypeScript 5.4+ dependencies in package.json
- [X] T002 [P] Verify vitest configuration exists for unit and live tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and API methods that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Extend EntityType union with all 9 types including company and user in src/client/types.ts
- [X] T004 [P] Add Entity interface with fields, relationships, links in src/client/types.ts
- [X] T005 [P] Add EntityConfiguration and FieldConfig interfaces in src/client/types.ts
- [X] T006 [P] Add ValidationResult, ValidationWarning, ValidationError interfaces in src/client/types.ts
- [X] T007 Add generic entity API methods (createEntity, getEntity, updateEntity, listEntities) in src/client/api.ts
- [X] T008 Add configuration cache and getEntityConfigurations method in src/client/api.ts
- [X] T009 [P] Add Zod schemas for generic entity inputs (entityType enum, generic fields) in src/schemas/inputs.ts
- [X] T010 Create generic entity tool file skeleton in src/tools/entities.ts

**Checkpoint**: Foundation ready - generic entity types and API methods available

---

## Phase 3: User Story 1 - Generic Entity CRUD Operations (Priority: P1)

**Goal**: Users can create, read, update, and list any entity type using consistent generic tools

**Independent Test**: Create an objective with name, description, owner, and status using `pb_entity_create`, then retrieve it with `pb_entity_get`

### Implementation for User Story 1

- [X] T011 [US1] Implement pb_entity_create tool handler in src/tools/entities.ts
- [X] T012 [US1] Implement pb_entity_get tool handler in src/tools/entities.ts
- [X] T013 [US1] Implement pb_entity_update tool handler in src/tools/entities.ts
- [X] T014 [US1] Implement pb_entity_list tool handler with pagination in src/tools/entities.ts
- [X] T015 [US1] Register pb_entity_create, pb_entity_get, pb_entity_update, pb_entity_list tools in src/index.ts
- [X] T016 [US1] Add live test: create objective, get by ID, update fields in tests/live/entities.test.ts
- [X] T017 [US1] Add live test: list components with pagination in tests/live/entities.test.ts

**Checkpoint**: Generic CRUD operations work for all entity types

---

## Phase 4: User Story 2 - Entity-Specific Tool Aliases (Priority: P1)

**Goal**: Existing feature/subfeature tools continue working, internally using generic handler

**Independent Test**: Create a feature using `pb_create_feature` and verify it works identically to `pb_entity_create` with type="feature"

### Implementation for User Story 2

- [X] T018 [US2] Create shared generic handler function for entity operations in src/tools/entities.ts
- [X] T019 [US2] Refactor pb_create_feature to delegate to generic handler in src/tools/features.ts
- [X] T020 [US2] Refactor pb_get_feature to delegate to generic handler in src/tools/features.ts
- [X] T021 [US2] Refactor pb_update_feature to delegate to generic handler in src/tools/features.ts
- [X] T022 [US2] Refactor pb_list_features to delegate to generic handler in src/tools/features.ts
- [X] T023 [US2] Refactor subfeature tools to delegate to generic handler in src/tools/subfeatures.ts
- [X] T024 [US2] Verify existing feature tests still pass in tests/live/features.test.ts

**Checkpoint**: All existing tools work unchanged with generic backend

---

## Phase 5: User Story 3 - Configuration-Driven Field Validation (Priority: P2)

**Goal**: Field validation using live configuration with warnings for read-only and required fields

**Independent Test**: Attempt to set a read-only field on a feature and verify a warning is returned before the API call

### Implementation for User Story 3

- [X] T025 [US3] Add validateFieldsAgainstConfig function in src/utils/validation.ts
- [X] T026 [US3] Add filterReadOnlyFields function to remove read-only fields from request in src/utils/validation.ts
- [X] T027 [US3] Add checkRequiredFields function for missing required field warnings in src/utils/validation.ts
- [X] T028 [US3] Extend richtext validation to check all allowed tags (b,i,s,u,br,a,code,img,p) in src/utils/richtext.ts
- [X] T029 [US3] Add suggestion for strong->b and em->i conversions in src/utils/richtext.ts
- [X] T030 [US3] Integrate validation into pb_entity_create and pb_entity_update handlers in src/tools/entities.ts
- [X] T031 [US3] Add unit test for field validation against config in tests/unit/validation.test.ts
- [X] T032 [US3] Add live test: verify read-only field warning in tests/live/entities.test.ts

**Checkpoint**: All entity operations validate fields before API submission

---

## Phase 6: User Story 4 - Entity Search Across Types (Priority: P2)

**Goal**: Search entities by name, status, owner, and other filters for types that support search

**Independent Test**: Search for objectives by status using `pb_entity_search` with type="objective" and status filter

### Implementation for User Story 4

- [X] T033 [US4] Add searchEntities method supporting name, statuses, owners, parent filters in src/client/api.ts
- [X] T034 [US4] Add Zod schema for pb_entity_search input with filter validation in src/schemas/inputs.ts
- [X] T035 [US4] Implement pb_entity_search tool handler with supported type check in src/tools/entities.ts
- [X] T036 [US4] Register pb_entity_search tool in src/index.ts
- [X] T037 [US4] Refactor pb_search_features to delegate to generic search handler in src/tools/features.ts
- [X] T038 [US4] Add live test: search features by name and status in tests/live/entities.test.ts

**Checkpoint**: Search works for feature, subfeature, and objective types

---

## Phase 7: User Story 5 - List Available Entity Types (Priority: P3)

**Goal**: Users can discover available entity types and their field configurations

**Independent Test**: Call `pb_entity_types` and verify all 9 entity types are listed with field summaries

### Implementation for User Story 5

- [X] T039 [US5] Add Zod schema for pb_entity_types input (optional entityType, includeFields) in src/schemas/inputs.ts
- [X] T040 [US5] Implement pb_entity_types tool handler with field summaries in src/tools/entities.ts
- [X] T041 [US5] Implement pb_refresh_config tool handler to clear cache in src/tools/entities.ts
- [X] T042 [US5] Register pb_entity_types and pb_refresh_config tools in src/index.ts
- [X] T043 [US5] Add live test: list entity types with and without includeFields in tests/live/entities.test.ts

**Checkpoint**: Entity type discovery works with optional field details

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, documentation, and validation

- [X] T044 [P] Update tool documentation strings with usage examples in src/tools/entities.ts
- [X] T045 [P] Add error code constants (VALIDATION_ERROR, RATE_LIMIT, NOT_FOUND, UNSUPPORTED_TYPE) in src/client/errors.ts
- [X] T046 [P] Add rate limit error handling with retryAfter in API client in src/client/api.ts
- [X] T047 Run all live tests to verify end-to-end functionality
- [X] T048 Run quickstart.md validation scenarios manually
- [X] T049 Update CLAUDE.md with any new commands or patterns discovered

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs generic handler)
- **User Story 3 (Phase 5)**: Depends on Phase 2 only (validation independent of tools)
- **User Story 4 (Phase 6)**: Depends on Phase 2 only
- **User Story 5 (Phase 7)**: Depends on Phase 2 only
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundational)
    │
    ├──► Phase 3 (US1: Generic CRUD) ──► Phase 4 (US2: Tool Aliases)
    │
    ├──► Phase 5 (US3: Validation) [can run parallel with US1]
    │
    ├──► Phase 6 (US4: Search) [can run parallel with US1]
    │
    └──► Phase 7 (US5: Type Discovery) [can run parallel with US1]
```

### Within Each User Story

- API client methods before tool handlers
- Tool handlers before tool registration
- Tool registration before tests
- Core implementation before integration

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
```
T003 (EntityType) ─┬─► T007 (API methods)
T004 (Entity) ─────┤
T005 (Config) ─────┤
T006 (Validation) ─┘
T009 (Zod schemas) ──► T010 (file skeleton)
```

**After Phase 2 completes**:
```
US1 (CRUD) ──► US2 (Aliases) [sequential - US2 needs US1's handler]
US3 (Validation)             [parallel with US1]
US4 (Search)                 [parallel with US1]
US5 (Types)                  [parallel with US1]
```

---

## Parallel Example: Phase 2 Foundational

```bash
# Launch type definitions in parallel:
Task: "Extend EntityType union with all 9 types in src/client/types.ts"
Task: "Add Entity interface in src/client/types.ts"
Task: "Add EntityConfiguration interfaces in src/client/types.ts"
Task: "Add ValidationResult interfaces in src/client/types.ts"
Task: "Add Zod schemas for generic entity inputs in src/schemas/inputs.ts"

# Then sequentially:
Task: "Add generic entity API methods in src/client/api.ts"
Task: "Create generic entity tool file skeleton in src/tools/entities.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (verification)
2. Complete Phase 2: Foundational (types, API methods)
3. Complete Phase 3: User Story 1 (generic CRUD)
4. Complete Phase 4: User Story 2 (tool aliases - ensures backward compatibility)
5. **STOP and VALIDATE**: Test all entity types work, existing tests pass
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Generic CRUD works -> Deploy/Demo (MVP!)
3. Add User Story 2 -> Backward compatibility verified -> Deploy/Demo
4. Add User Story 3 -> Validation warnings active -> Deploy/Demo
5. Add User Story 4 -> Search works -> Deploy/Demo
6. Add User Story 5 -> Full discovery available -> Deploy/Demo

### Suggested MVP Scope

**Minimum**: User Stories 1 + 2 (P1 priority)
- Generic CRUD for all entity types
- Existing tools continue working
- 17 tasks (T001-T017, then jump to T018-T024)

**Recommended**: Add User Story 3 (Validation)
- Prevents API errors from invalid HTML
- Better user experience with warnings
- Adds 8 more tasks (T025-T032)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- User type is read-only - no create/update for user entities
- Search only works for feature, subfeature, objective types
