# Tasks: Fix Search Feature Stale Results

**Input**: Design documents from `/specs/002-fix-search-stale-results/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Tests**: Live API tests included as specified in plan.md for verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (API Client Update)

**Purpose**: Add `name` parameter support to the API client - MUST complete before search tool can be fixed

**⚠️ CRITICAL**: The search tool fix depends on this phase being complete

- [x] T001 Add `name?: string` parameter to searchFeatures method signature in src/client/api.ts
- [x] T002 Include `name` in the search request body when provided in src/client/api.ts

**Checkpoint**: API client now supports server-side name filtering

---

## Phase 2: User Story 1 - Search Feature by Name (Priority: P1) 🎯 MVP

**Goal**: Users can find any feature by name, regardless of position in the feature list

**Independent Test**: Search for "Store Web App MVP" and verify it appears in results (it's at position 130 of 722)

### Implementation for User Story 1

- [x] T003 [US1] Remove conditional fallback to listFeatures in src/tools/search.ts (lines 118-130)
- [x] T004 [US1] Always call searchFeatures with name parameter in src/tools/search.ts
- [x] T005 [US1] Remove client-side name filtering logic in src/tools/search.ts (lines 133-137)
- [x] T006 [US1] Verify exact name search works via live API test

**Checkpoint**: Core search functionality fixed - users can find features by name

---

## Phase 3: User Story 2 - Search with Team Filter (Priority: P2)

**Goal**: Users can combine text search with team filtering

**Independent Test**: Search for "Store" with teamName "H4C Frontend" and verify correct results

### Implementation for User Story 2

- [x] T007 [US2] Verify client-side team filtering still works with new search implementation in src/tools/search.ts
- [x] T008 [US2] Test combined name + team search via live API test

**Checkpoint**: Team filtering works correctly with name-based search

---

## Phase 4: User Story 3 - Search with Combined Filters (Priority: P3)

**Goal**: Users can combine name, status, owner, and team filters

**Independent Test**: Search with query + status + team filters and verify results match all criteria

### Implementation for User Story 3

- [x] T009 [US3] Verify combined filters (name + status + owner) work correctly in src/tools/search.ts
- [x] T010 [US3] Test combined filters via live API test

**Checkpoint**: All filter combinations work correctly

---

## Phase 5: Polish & Verification

**Purpose**: Final verification and documentation

- [x] T011 Run full test suite with `npm test`
- [x] T012 Run live API tests with `npm run test:live`
- [x] T013 Verify "Store Web App MVP" (position 130) is found via pb_search_features
- [x] T014 Update CLAUDE.md if any additional API discoveries made

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies - can start immediately. BLOCKS all user stories.
- **User Story 1 (Phase 2)**: Depends on Phase 1 completion
- **User Story 2 (Phase 3)**: Depends on Phase 2 completion (needs search working first)
- **User Story 3 (Phase 4)**: Depends on Phase 2 completion (needs search working first)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Core fix - must complete first
- **User Story 2 (P2)**: Can start after US1 - verifies team filtering still works
- **User Story 3 (P3)**: Can start after US1 - verifies combined filters work

### Within Each User Story

- Implementation tasks are sequential (each builds on the previous)
- Verification tasks depend on implementation being complete

### Parallel Opportunities

- T007 and T009 could run in parallel after T006 completes (different filter types)
- T008 and T010 could run in parallel (independent test scenarios)

---

## Parallel Example: Verification Phase

```bash
# After US1 is complete, these verifications can run in parallel:
Task: "T007 - Verify team filtering"
Task: "T009 - Verify combined filters"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (API client update)
2. Complete Phase 2: User Story 1 (core search fix)
3. **STOP and VALIDATE**: Test with "Store Web App MVP" search
4. Deploy if ready - core bug is fixed

### Full Implementation

1. Phase 1: Add name parameter to API client (~5 min)
2. Phase 2: Fix search tool to use name parameter (~10 min)
3. Phase 3-4: Verify team and combined filters (~5 min each)
4. Phase 5: Final verification (~5 min)

**Estimated Total**: ~30 minutes for complete fix

---

## Notes

- This is a bug fix with minimal code changes (2 files modified)
- No new files created - only modifications to existing code
- Tests are verification-focused (confirming the fix works)
- The fix is primarily removing code (the fallback logic) and adding one parameter
- Keep client-side team filtering - the API doesn't support team filtering server-side
