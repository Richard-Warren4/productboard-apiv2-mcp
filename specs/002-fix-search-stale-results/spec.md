# Feature Specification: Fix Search Feature Stale Results

**Feature Branch**: `002-fix-search-stale-results`
**Created**: 2025-12-14
**Status**: Draft
**Type**: Bug Fix
**Input**: Bug Report - pb_search_features returns stale/incomplete results and fails to find recently updated features

## Problem Statement

The `pb_search_features` MCP tool returns incomplete results when searching for features by name. Users cannot find features that exist in their ProductBoard workspace, even when searching with the exact feature name.

### Root Cause

The current implementation has a fundamental flaw in how it handles text-based searches:

1. **Single-page limitation**: When searching with only a `query` parameter (no status/owner filters), the tool falls back to `listFeatures` which returns only the first page of results (typically ~100 features)

2. **Client-side filtering**: The text search (`query` parameter) is applied client-side after fetching results, meaning it only searches within the first page of data

3. **Result**: Features beyond the first page are never searched, causing the tool to report "no results" for features that exist but aren't on page 1

### Impact

- Users cannot reliably find features by name
- Search results appear stale (all from August 2025 due to ordering)
- Users must fall back to manual pagination with `pb_list_features`
- Undermines trust in the MCP tool's search capability

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search Feature by Name (Priority: P1)

A user wants to find a specific feature by searching for its name. They enter the feature name or a partial match and expect to see all matching features from their entire ProductBoard workspace.

**Why this priority**: This is the core use case of the search tool - finding features by name. Without this working, the search tool is fundamentally broken.

**Independent Test**: Can be fully tested by searching for a known feature name and verifying it appears in results, regardless of when it was created or its position in the feature list.

**Acceptance Scenarios**:

1. **Given** a feature "Store Web App MVP" exists in ProductBoard, **When** user searches with query "Store Web App MVP", **Then** the feature appears in search results
2. **Given** a feature was recently updated (December 2025), **When** user searches for that feature's name, **Then** the feature is found regardless of update date
3. **Given** a feature exists on page 3 of the full feature list, **When** user searches for its exact name, **Then** the feature is found

---

### User Story 2 - Search with Team Filter (Priority: P2)

A user wants to find features belonging to a specific team. They combine a text search with a team filter to narrow results.

**Why this priority**: Team filtering is a common workflow for users managing features across multiple teams. This builds on the core search functionality.

**Independent Test**: Can be tested by searching for features with a team name filter and verifying only features assigned to that team appear.

**Acceptance Scenarios**:

1. **Given** features exist assigned to "H4C Frontend" team, **When** user searches with teamName "H4C Frontend", **Then** only features from that team appear
2. **Given** a feature "Store Web App MVP" is assigned to "H4C Frontend", **When** user searches query "Store" with teamName "H4C Frontend", **Then** the feature appears in results

---

### User Story 3 - Search with Combined Filters (Priority: P3)

A user wants to find features matching multiple criteria (status, owner, team, text query).

**Why this priority**: Power users need to narrow down large result sets with multiple filters. This extends the basic search capability.

**Independent Test**: Can be tested by applying multiple filters and verifying results match all criteria.

**Acceptance Scenarios**:

1. **Given** features exist with status "In Progress" owned by a specific user, **When** user searches with statusNames and ownerEmails filters, **Then** only matching features appear
2. **Given** a feature matches query "MVP" AND status "In Progress" AND team "H4C Frontend", **When** user applies all three filters, **Then** only that feature appears

---

### Edge Cases

- What happens when search returns zero results? → User receives clear message with suggestions
- What happens when the feature name contains special characters? → Search handles special characters correctly
- What happens when searching with an empty query string? → Returns error or treats as "list all" with appropriate behavior
- What happens when ProductBoard API rate limits are hit during pagination? → Graceful handling with partial results or retry
- What happens when a feature was very recently created? → Feature is findable within reasonable time (API consistency)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST search across all features in the workspace, not just the first page of results
- **FR-002**: System MUST find features regardless of their position in the paginated list
- **FR-003**: System MUST return recently updated features (not just historically old entries)
- **FR-004**: System MUST support text-based search queries (partial name matching)
- **FR-005**: System MUST support filtering by team name or team ID
- **FR-006**: System MUST support filtering by status name(s)
- **FR-007**: System MUST support filtering by owner email(s)
- **FR-008**: System MUST combine multiple filters with AND logic
- **FR-009**: System MUST provide pagination support for large result sets
- **FR-010**: System MUST handle API rate limits gracefully during multi-page searches

### Key Entities

- **Feature**: ProductBoard feature entity with fields including name, status, owner, team(s), and timestamps
- **Search Query**: User-provided text to match against feature names (case-insensitive partial match)
- **Filters**: Optional constraints (status, owner, team) to narrow search results

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find any feature by name within 5 seconds, regardless of feature count or position in list
- **SC-002**: Search returns features updated within the last 30 days when they match the query
- **SC-003**: Zero false negatives - if a feature exists and matches the query, it appears in results
- **SC-004**: Search handles workspaces with 1000+ features without timeout or failure
- **SC-005**: Combined filter searches (query + team + status) return accurate results

## Technical Discovery

**Verified 2025-12-14**: The ProductBoard API v2 `/entities/search` endpoint **does support server-side name filtering** via the `name` parameter in the request body.

### API Test Results

| Query | Results | Behavior |
|-------|---------|----------|
| `"Store Web App MVP"` | 1 | Exact match |
| `"Store Web App"` | 3 | Partial match (prefix) |
| `"Store"` | 7 | Single word match |
| `"store web"` | 3 | Case-insensitive |
| `"MVP"` | 4 | Matches anywhere in name |

### Working API Request

```json
POST /entities/search
{
  "data": {
    "type": "feature",
    "name": "Store Web App MVP"
  }
}
```

This returns the correct feature immediately without pagination.

### Current Bug Location

The issue is in `src/tools/search.ts:118-130` where:
1. When only `query` is provided (no status/owner filters), code falls back to `listFeatures`
2. `listFeatures` only returns page 1 (~100 features)
3. Client-side filtering misses features on subsequent pages

### Fix Required

Pass the user's `query` parameter as `name` in the search API call. This enables server-side filtering and eliminates the pagination issue entirely.

## Assumptions

- ProductBoard API v2 `/entities/search` endpoint supports `name` parameter (verified by testing)
- The `name` parameter supports partial, case-insensitive matching (verified by testing)
- Rate limits (429 responses) are handled by existing retry logic with exponential backoff
- Maximum reasonable feature count per workspace is ~10,000 features
