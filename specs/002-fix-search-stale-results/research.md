# Research: Fix Search Feature Stale Results

**Date**: 2025-12-14
**Feature**: 002-fix-search-stale-results

## Research Summary

This bug fix required minimal research as the solution was discovered through live API testing during specification.

## Decision: Use `name` Parameter in Search API

**Decision**: Pass the user's search query as the `name` parameter in the `POST /entities/search` request body.

**Rationale**:
- Live API testing confirmed the `name` parameter works for server-side text filtering
- Supports partial matching (case-insensitive)
- Returns results immediately without pagination
- Eliminates the root cause (single-page limitation)

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| Paginate through all results | Slow (722 features = 8 API calls), wasteful of rate limit quota |
| Cache all features locally | Stale data problem, memory overhead, sync complexity |
| Add `query` parameter to API | Not supported - API returns 400 error |

## API Verification Results

Tested 2025-12-14 against live ProductBoard API v2:

```bash
POST /entities/search
{ "data": { "type": "feature", "name": "Store Web App MVP" } }
# Result: 200 OK, 1 feature returned
```

| Test Query | Results | Behavior |
|------------|---------|----------|
| `"Store Web App MVP"` | 1 | Exact match works |
| `"Store Web App"` | 3 | Partial match works |
| `"store web"` | 3 | Case-insensitive works |
| `"MVP"` | 4 | Single word works |

## Unsupported Parameters (400 Error)

The following parameters are NOT supported in the search API body:
- `query`
- `search`
- `text`
- `q`
- `names`
- `filter` wrapper

Only `name` works for text-based searching.

## No Further Research Required

All technical unknowns resolved through live testing. Implementation can proceed.
