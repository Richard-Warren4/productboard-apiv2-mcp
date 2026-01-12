# Tasks: ProductBoard MCP Skills Proof of Concept

**Input**: Design documents from `/specs/007-pb-skills-poc/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/skill-schema.md

**Tests**: No automated tests requested. Evaluation scenarios serve as the validation mechanism.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Documentation feature**: `skills/`, `evaluations/`, `.claude-plugin/` at repository root
- All paths are relative to repository root

---

## Phase 1: Setup (Directory Structure)

**Purpose**: Create directory structure for skills, evaluations, and plugin configuration

- [x] T001 Create skills directory structure: `mkdir -p skills/pb-tools-expert`
- [x] T002 [P] Create evaluations directory structure: `mkdir -p evaluations/pb-tools-expert`
- [x] T003 [P] Create plugin directory structure: `mkdir -p .claude-plugin`

---

## Phase 2: Foundational (Plugin Configuration)

**Purpose**: Plugin configuration that enables skill loading in Claude Code

**CRITICAL**: Plugin config is required for Claude Code integration

- [x] T004 Create plugin manifest in `.claude-plugin/plugin.json` with name, version, description, author, license, keywords, repository, homepage fields per contracts/skill-schema.md
- [x] T005 [P] Create marketplace metadata in `.claude-plugin/marketplace.json` (optional, for future marketplace listing)

**Checkpoint**: Plugin configuration ready - skill content can now be created

---

## Phase 3: User Story 1 - Tool Selection Guidance (Priority: P1) MVP

**Goal**: AI assistant knows which of 14 ProductBoard MCP tools to use for any given task

**Independent Test**: Present common ProductBoard queries to AI with skill loaded; verify correct tool selection

### Implementation for User Story 1

- [x] T006 [US1] Create SKILL.md frontmatter in `skills/pb-tools-expert/SKILL.md` with name: "ProductBoard MCP Tools Expert", description for activation matching, priority: highest
- [x] T007 [US1] Write Overview section in `skills/pb-tools-expert/SKILL.md` explaining skill purpose and when it activates
- [x] T008 [US1] Create Tool Selection Guide table in `skills/pb-tools-expert/SKILL.md` covering all 14 tools with columns: Goal, Tool, Parameters, Notes
  - Entity Tools (7): pb_entity_create, pb_entity_get, pb_entity_update, pb_entity_list, pb_entity_search, pb_entity_types, pb_refresh_config
  - Relationship Tools (4): pb_get_relationships, pb_create_relationship, pb_set_relationship, pb_remove_relationship
  - Configuration Tools (3): pb_get_config, pb_list_products, pb_list_components
- [x] T009 [US1] Add tool selection by user goal section in `skills/pb-tools-expert/SKILL.md` organized by: Find, Create, Update, Link
- [x] T010 [US1] Create evaluation scenario `evaluations/pb-tools-expert/eval-001-tool-selection.json` with query: "Find all features owned by sarah@example.com", expected behaviors per contracts/skill-schema.md

**Checkpoint**: User Story 1 complete - skill provides tool selection guidance, testable via eval-001

---

## Phase 4: User Story 2 - Common Mistakes Prevention (Priority: P2)

**Goal**: AI assistant avoids known ProductBoard API gotchas

**Independent Test**: Present error-prone queries; verify AI applies correct formatting without correction

### Implementation for User Story 2

- [x] T011 [US2] Add Common Mistakes section header in `skills/pb-tools-expert/SKILL.md`
- [x] T012 [US2] Document Mistake 1: Case-sensitive status names in `skills/pb-tools-expert/SKILL.md` - Wrong: "In Progress", Right: "In progress"
- [x] T013 [P] [US2] Document Mistake 2: Missing parent ID for subfeatures in `skills/pb-tools-expert/SKILL.md` - Must include parent: {id} field
- [x] T014 [P] [US2] Document Mistake 3: Using unsupported entity type "initiative" in `skills/pb-tools-expert/SKILL.md` - API v2 does not support initiatives
- [x] T015 [P] [US2] Document Mistake 4: Using pb_entity_list for filtered queries in `skills/pb-tools-expert/SKILL.md` - Use pb_entity_search instead
- [x] T016 [P] [US2] Document Mistake 5: Assuming pageSize parameter works in `skills/pb-tools-expert/SKILL.md` - API returns 100 items/page, not configurable
- [x] T017 [US2] Create evaluation scenario `evaluations/pb-tools-expert/eval-002-common-mistakes.json` with query: "Search for features that are In Progress", expected behaviors for correct casing

**Checkpoint**: User Story 2 complete - skill documents 5 common mistakes, testable via eval-002

---

## Phase 5: User Story 3 - Workflow Patterns (Priority: P3)

**Goal**: AI assistant follows optimal multi-step tool sequences

**Independent Test**: Present multi-step tasks; verify AI follows recommended workflow patterns

### Implementation for User Story 3

- [x] T018 [US3] Add Workflow Patterns section header in `skills/pb-tools-expert/SKILL.md`
- [x] T019 [US3] Document Pattern 1: Feature Discovery Flow in `skills/pb-tools-expert/SKILL.md` - pb_entity_search -> pb_entity_get -> pb_get_relationships
- [x] T020 [P] [US3] Document Pattern 2: Create and Link Feature in `skills/pb-tools-expert/SKILL.md` - pb_entity_create -> pb_create_relationship (link to objective)
- [x] T021 [P] [US3] Document Pattern 3: Feature Hierarchy Creation in `skills/pb-tools-expert/SKILL.md` - Create parent feature first, then create subfeatures with parent reference
- [x] T022 [US3] Create evaluation scenario `evaluations/pb-tools-expert/eval-003-workflow-patterns.json` with query: "Find a feature and link it to an objective", expected multi-step sequence

**Checkpoint**: User Story 3 complete - skill documents 3 workflow patterns, testable via eval-003

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, best practices, and documentation updates

- [x] T023 [P] Add Best Practices section in `skills/pb-tools-expert/SKILL.md` with Do/Don't lists covering all user stories
- [x] T024 [P] Add edge case guidance in `skills/pb-tools-expert/SKILL.md` - what to do when query doesn't match patterns, recommending pb_get_config for workspace discovery
- [x] T025 Validate SKILL.md frontmatter against contracts/skill-schema.md - ensure name, description, priority are present and valid
- [x] T026 Validate all evaluation JSON files against contracts/skill-schema.md schema
- [ ] T027 Manual test: Load skill in Claude Code and execute eval-001 scenario
- [ ] T028 Manual test: Execute eval-002 scenario with skill loaded
- [ ] T029 Manual test: Execute eval-003 scenario with skill loaded
- [ ] T030 Update README.md with skills documentation reference (optional)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3-5)**: Depend on Phase 1 Setup (directories exist); can proceed in priority order
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - creates base SKILL.md file
- **User Story 2 (P2)**: Depends on US1 (SKILL.md must exist) - adds Common Mistakes section
- **User Story 3 (P3)**: Depends on US1 (SKILL.md must exist) - adds Workflow Patterns section

### Within Each User Story

- Section header before content
- All content before evaluation scenario
- Evaluation scenario validates the story

### Parallel Opportunities

- Phase 1: T001, T002, T003 can run in parallel (different directories)
- Phase 2: T004, T005 can run in parallel (different files)
- US2: T013, T014, T015, T016 can run in parallel (different mistakes in same file, but logically separate)
- US3: T020, T021 can run in parallel (different patterns)
- Phase 6: T023, T024 can run in parallel

---

## Parallel Example: User Story 2

```bash
# After T011 (section header) and T012 (first mistake), remaining mistakes can be written in parallel:
Task: "Document Mistake 2: Missing parent ID for subfeatures"
Task: "Document Mistake 3: Using unsupported entity type initiative"
Task: "Document Mistake 4: Using pb_entity_list for filtered queries"
Task: "Document Mistake 5: Assuming pageSize parameter works"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: User Story 1 (T006-T010)
4. **STOP and VALIDATE**: Load skill, test eval-001 scenario
5. Deploy if tool selection guidance alone provides value

### Incremental Delivery

1. Setup + Foundational → Base structure ready
2. Add User Story 1 → Test eval-001 → Deploy (MVP!)
3. Add User Story 2 → Test eval-002 → Deploy (adds mistake prevention)
4. Add User Story 3 → Test eval-003 → Deploy (adds workflow patterns)
5. Polish phase → Final validation → Release

### Single Developer Strategy

Work sequentially through phases:
1. Phase 1-2: 15 minutes (directory/config setup)
2. Phase 3 (US1): 45 minutes (tool selection table + eval)
3. Phase 4 (US2): 30 minutes (5 mistakes + eval)
4. Phase 5 (US3): 30 minutes (3 patterns + eval)
5. Phase 6: 30 minutes (polish + manual testing)

**Total estimated time**: ~2.5 hours

---

## Notes

- [P] tasks = different content sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story adds a section to the same SKILL.md file
- Manual testing with Claude Code is required per Constitution Principle VI
- Evaluation scenarios are the "tests" for this documentation feature
- Commit after each task or logical group (e.g., after each user story phase)
