# Tasks: ProductBoard MCP Server

**Input**: Design documents from `/specs/001-productboard-mcp/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec. Live testing via US7 (Self-Testing via MCP) will validate functionality.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Single project structure per plan.md:
- Source: `src/`
- Tests: `tests/`
- Documentation: `docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and TypeScript/MCP configuration

- [x] T001 Create project directory structure per plan.md in repository root
- [x] T002 Initialize Node.js project with package.json (type: module, Node 20+)
- [x] T003 [P] Configure TypeScript with strict mode in tsconfig.json
- [x] T004 [P] Install dependencies: @modelcontextprotocol/sdk, zod
- [x] T005 [P] Configure ESLint and Prettier for TypeScript in .eslintrc.js and .prettierrc
- [x] T006 Add build scripts (tsc) and dev scripts to package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Define all TypeScript interfaces from data-model.md in src/client/types.ts
- [x] T008 [P] Create Zod schemas for API responses in src/schemas/responses.ts
- [x] T009 [P] Create Zod schemas for MCP tool inputs in src/schemas/inputs.ts
- [x] T010 Implement ProductBoard API client with auth and base request in src/client/api.ts
- [x] T011 Implement rate limiting with exponential backoff in src/client/api.ts
- [x] T012 Implement cursor-based pagination helper in src/utils/pagination.ts
- [x] T013 [P] Implement richtext validation utility in src/utils/richtext.ts
- [x] T014 Implement error mapping and MCP error responses in src/client/errors.ts
- [x] T015 Create MCP server entry point with tool registration scaffold in src/index.ts
- [x] T016 Add environment configuration for PRODUCTBOARD_API_TOKEN in src/index.ts

**Checkpoint**: Foundation ready - MCP server starts, connects to ProductBoard API

---

## Phase 3: User Story 1 - View Team Backlog (Priority: P1)

**Goal**: List features filtered by team, enabling backlog visibility

**Independent Test**: Ask Claude "show me all features assigned to the front-end team" and verify list matches ProductBoard UI

### Implementation for User Story 1

- [x] T017 [US1] Implement pb_list_features tool in src/tools/features.ts
- [x] T018 [US1] Add team filtering logic (by ID or name) in src/tools/features.ts
- [x] T019 [US1] Add status and component filtering in src/tools/features.ts
- [x] T020 [US1] Implement pagination support for large result sets in src/tools/features.ts
- [x] T021 [US1] Register pb_list_features tool in src/index.ts
- [x] T022 [US1] Format output for AI readability (feature list with key attributes)

**Checkpoint**: US1 complete - can list features by team with pagination

---

## Phase 4: User Story 2 - View Feature Details (Priority: P1)

**Goal**: View comprehensive details for a single feature including relationships

**Independent Test**: Ask Claude "show me details for feature [name/ID]" and verify all fields returned

### Implementation for User Story 2

- [x] T023 [US2] Implement pb_get_feature tool in src/tools/features.ts
- [x] T024 [US2] Support lookup by ID or name (search if name provided)
- [x] T025 [US2] Include relationship data (product, component, parent, subfeatures)
- [x] T026 [US2] Register pb_get_feature tool in src/index.ts
- [x] T027 [US2] Format detailed output with ProductBoard UI link

**Checkpoint**: US1+US2 complete - Read-only MVP functional

---

## Phase 5: User Story 3 - Create New Feature (Priority: P2)

**Goal**: Create features in ProductBoard via natural language commands

**Independent Test**: Ask Claude "create a new feature called [name] for the desktop team" and verify in ProductBoard

### Implementation for User Story 3

- [ ] T028 [US3] Implement pb_create_feature tool in src/tools/features.ts
- [ ] T029 [US3] Validate required fields (name) and optional fields
- [ ] T030 [US3] Implement team assignment by ID or name lookup
- [ ] T031 [US3] Implement status assignment with config validation
- [ ] T032 [US3] Add richtext validation for description field
- [ ] T033 [US3] Register pb_create_feature tool in src/index.ts
- [ ] T034 [US3] Return created feature details with confirmation message

**Checkpoint**: US3 complete - can create features with team and status

---

## Phase 6: User Story 4 - Update Feature Properties (Priority: P2)

**Goal**: Update existing feature properties without leaving Claude workflow

**Independent Test**: Ask Claude "update feature [X] to status [Y]" and verify change in ProductBoard

### Implementation for User Story 4

- [ ] T035 [US4] Implement pb_update_feature tool in src/tools/features.ts
- [ ] T036 [US4] Support partial updates (only provided fields changed)
- [ ] T037 [US4] Implement owner reassignment by ID or email
- [ ] T038 [US4] Implement team reassignment by ID or name
- [ ] T039 [US4] Register pb_update_feature tool in src/index.ts
- [ ] T040 [US4] Return updated feature with list of changed fields

**Checkpoint**: US4 complete - full feature CRUD (except delete, out of scope)

---

## Phase 7: User Story 5 - Search and Filter Features (Priority: P2)

**Goal**: Search features by name and multiple filter criteria

**Independent Test**: Ask Claude "find all features with status 'In Progress' for the front-end team"

### Implementation for User Story 5

- [ ] T041 [US5] Implement pb_search_features tool in src/tools/search.ts
- [ ] T042 [US5] Implement name-based search (contains matching)
- [ ] T043 [US5] Combine search with filters (team, status, component)
- [ ] T044 [US5] Register pb_search_features tool in src/index.ts
- [ ] T045 [US5] Return search results with applied filters displayed

**Checkpoint**: US5 complete - efficient feature discovery

---

## Phase 8: User Story 6 - Manage Feature Relationships (Priority: P3)

**Goal**: View and modify relationships between features and other entities

**Independent Test**: Ask Claude "link feature [X] to component [Y]" and verify in ProductBoard

### Implementation for User Story 6

- [ ] T046 [US6] Implement pb_get_relationships tool in src/tools/relationships.ts
- [ ] T047 [US6] Implement pb_set_relationship tool in src/tools/relationships.ts
- [ ] T048 [US6] Implement pb_remove_relationship tool in src/tools/relationships.ts
- [ ] T049 [US6] Support relationship types: component, product, initiative, parent
- [ ] T050 [US6] Register relationship tools in src/index.ts

**Checkpoint**: US6 complete - relationship management functional

---

## Phase 9: User Story 7 - Self-Testing via MCP (Priority: P3)

**Goal**: Integrate MCP into project for live development testing

**Independent Test**: Use Claude Code in this repository to execute MCP tools against live ProductBoard

### Implementation for User Story 7

- [ ] T051 [US7] Create Claude Desktop setup documentation in docs/claude-desktop.md
- [ ] T052 [US7] Create Claude Code setup documentation in docs/claude-code.md
- [ ] T053 [US7] Add MCP server configuration to project's .claude/settings.json
- [ ] T054 [US7] Create example slash command for listing features in .claude/commands/pb-features.md
- [ ] T055 [US7] Create example slash command for feature details in .claude/commands/pb-detail.md
- [ ] T056 [US7] Create ProductBoard workflow skills guide in docs/skills/productboard.md

**Checkpoint**: US7 complete - MCP usable within this project

---

## Phase 10: Supporting Tools & Configuration Discovery

**Purpose**: Configuration tools needed across multiple user stories

- [ ] T057 Implement pb_get_config tool in src/tools/config.ts
- [ ] T058 Implement pb_list_products tool in src/tools/config.ts
- [ ] T059 Implement pb_list_components tool in src/tools/config.ts
- [ ] T060 Register configuration tools in src/index.ts
- [ ] T061 Cache configuration data to reduce API calls

**Checkpoint**: Configuration discovery complete - tools can validate inputs

---

## Phase 11: Subfeature Support

**Purpose**: Subfeature CRUD operations (supports US1-US4 for subfeatures)

- [ ] T062 Implement pb_list_subfeatures tool in src/tools/subfeatures.ts
- [ ] T063 Implement pb_get_subfeature tool in src/tools/subfeatures.ts
- [ ] T064 Implement pb_create_subfeature tool in src/tools/subfeatures.ts
- [ ] T065 Implement pb_update_subfeature tool in src/tools/subfeatures.ts
- [ ] T066 Register subfeature tools in src/index.ts

**Checkpoint**: Subfeature operations complete

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T067 [P] Add JSDoc comments to all MCP tools
- [ ] T068 [P] Create README.md with project overview and quick start
- [ ] T069 Run quickstart.md validation (install and configure in fresh environment)
- [ ] T070 Add beta API disclaimer to all documentation
- [ ] T071 Review and improve error messages across all tools

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational - first user story
- **US2 (Phase 4)**: Depends on Foundational - can parallel with US1
- **US3 (Phase 5)**: Depends on Foundational - requires US1/US2 patterns
- **US4 (Phase 6)**: Depends on US3 (shared feature tools file)
- **US5 (Phase 7)**: Depends on Foundational - can parallel after US1/US2
- **US6 (Phase 8)**: Depends on Foundational - independent of other stories
- **US7 (Phase 9)**: Depends on at least US1+US2 working
- **Supporting (Phase 10)**: Can be done anytime after Foundational
- **Subfeatures (Phase 11)**: Can be done anytime after US1-US4
- **Polish (Phase 12)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Priority | Dependencies | Can Parallel With |
|-------|----------|--------------|-------------------|
| US1 | P1 | Foundational | US2 |
| US2 | P1 | Foundational | US1 |
| US3 | P2 | Foundational | US5, US6 |
| US4 | P2 | US3 (shared file) | US5, US6 |
| US5 | P2 | Foundational | US3, US4, US6 |
| US6 | P3 | Foundational | All others |
| US7 | P3 | US1+US2 minimum | None (sequential) |

### Parallel Opportunities

Within Setup:
- T003, T004, T005 can run in parallel

Within Foundational:
- T008, T009, T013 can run in parallel (Zod schemas + richtext)

After Foundational:
- US1 and US2 can start in parallel (both P1)
- US3, US5, US6 can all start after US1/US2

---

## Parallel Example: P1 Stories

```bash
# After Foundational complete, launch US1 and US2 in parallel:

# US1 tasks:
Task: "Implement pb_list_features tool in src/tools/features.ts"
Task: "Add team filtering logic in src/tools/features.ts"

# US2 tasks (different section of same file, or can be sequenced):
Task: "Implement pb_get_feature tool in src/tools/features.ts"
Task: "Support lookup by ID or name"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US1 - View Team Backlog
4. Complete Phase 4: US2 - View Feature Details
5. **STOP and VALIDATE**: Test read operations with live ProductBoard
6. Deploy/configure for use

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 + US2 → Read-only MVP! Test independently
3. US3 + US4 → Feature creation/update capabilities
4. US5 → Search functionality
5. US6 → Relationship management
6. US7 → Self-testing integration
7. Supporting + Subfeatures → Complete feature set
8. Polish → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- US1+US2 form the read-only MVP (P1 priority)
- US3+US4+US5 add write operations (P2 priority)
- US6+US7 are enhancements (P3 priority)
- Subfeature support spans multiple stories but is implemented after feature CRUD works
- Configuration tools support validation across all write operations
