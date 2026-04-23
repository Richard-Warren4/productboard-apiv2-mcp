<!--
SYNC IMPACT REPORT
==================
Version change: 1.3.0 → 1.4.0
Bump rationale: MINOR - Rewrote Principle IV from "API Beta Awareness" to "API GA Stability"
to reflect ProductBoard API v2 becoming generally available (March 2026). v1 is deprecated
and sunsets 2026-07-08.

Modified principles:
- IV. API Beta Awareness → IV. API GA Stability (rewrite)

Added sections: None

Removed sections: None

Templates requiring updates:
- .specify/templates/plan-template.md: ✅ reviewed - no updates required
- .specify/templates/spec-template.md: ✅ reviewed - no updates required
- .specify/templates/tasks-template.md: ✅ reviewed - no updates required
- .specify/templates/checklist-template.md: ✅ reviewed - no updates required
- .specify/templates/agent-file-template.md: ✅ reviewed - no updates required

Follow-up TODOs: None
-->

# ProductBoard API v2 MCP Server Constitution

## Core Principles

### I. MCP-First Design

Every feature MUST be designed as an MCP tool or resource before implementation begins.

- Tools MUST expose ProductBoard API v2 operations via the Model Context Protocol
- Each tool MUST have a single, clear purpose (one tool = one API operation or logical grouping)
- Tool inputs and outputs MUST use JSON schema validation
- Tools MUST return structured responses that AI models can interpret unambiguously
- Resource endpoints MUST follow MCP URI conventions for discoverability

**Rationale**: MCP servers exist to bridge AI capabilities with external systems. Designing MCP-first
ensures every feature serves its primary purpose of enabling AI-driven ProductBoard interactions.

### II. Type Safety & Validation

All code MUST be fully typed with strict TypeScript configuration and runtime validation at system
boundaries.

- TypeScript strict mode MUST be enabled (`strict: true` in tsconfig.json)
- All ProductBoard API request/response types MUST be defined as TypeScript interfaces
- Runtime validation MUST occur at MCP tool input boundaries using Zod or equivalent
- No `any` types except when interfacing with untyped external libraries (must be wrapped)
- API responses MUST be validated against expected schemas before processing
- Field value types MUST distinguish between `FieldValue` (read) and `FieldAssign` (write) variants

**Rationale**: Type safety prevents runtime errors and makes refactoring safe. Runtime validation at
boundaries catches malformed data before it corrupts application state.

### III. API Contract Fidelity

The MCP server MUST faithfully represent ProductBoard API v2 capabilities without abstraction leakage.

- Tool names and descriptions MUST clearly indicate the underlying ProductBoard operation
- Error responses from ProductBoard MUST be surfaced to the AI model with context
- Rate limits and pagination MUST be handled transparently or documented as tool behavior
- Breaking changes to ProductBoard API v2 MUST trigger corresponding MCP tool updates
- Authentication/authorization failures MUST produce actionable error messages
- Configuration endpoints MUST be used to discover available fields dynamically
- Tools MUST adapt to workspace-specific field configurations rather than assuming fixed schemas

**Rationale**: AI models using this MCP server depend on accurate representations of what ProductBoard
can do. Hiding or transforming API behavior creates unpredictable AI interactions.

### IV. API GA Stability

The MCP server MUST track the supported lifecycle of ProductBoard's public APIs.

- ProductBoard API v2 is **generally available** as of 2026; ProductBoard API v1 is **deprecated**
  and sunsets on **2026-07-08**. New work MUST target v2.
- Implementation MUST defensively handle response shape drift (the GA API may still evolve via
  additive changes, e.g. the FieldValueItem rename and `inline → data` array shift in March 2026).
- Error handling MUST gracefully handle unexpected response structures.
- Version tracking MUST note which ProductBoard API v2 schema revision was tested.
- The official ProductBoard developer changelog SHOULD be reviewed when planning changes that
  touch endpoint shapes, request bodies, or response parsing.

**Rationale**: The API is now GA and integrations may rely on it for production use. Pinning
expectations to a fixed point in time is brittle; the principle still requires defensive parsing
because additive changes to the GA contract continue to land.

### V. Documentation-Verified Implementation

All API implementations MUST be verified against the official ProductBoard developer documentation.

- Request body structures MUST match the official API documentation exactly
- The official documentation URLs in `.specify/memory/productboard-v2api-ref-urls.md` are the source of truth
- When implementing or modifying API calls, developers MUST fetch and verify against the official docs
- Tests SHOULD validate request body structures match documented formats
- Any discrepancy between implementation and official docs MUST be treated as a bug
- Changes to API implementations MUST reference the official documentation URL that was consulted

**Official Documentation Base URL**: `https://developer.productboard.com/v2.0.0/reference/`

**Rationale**: The official ProductBoard API documentation is the authoritative source for request/response
formats. Implementations derived from assumptions or third-party sources have historically introduced bugs.
Verification against official docs prevents these issues and ensures API calls work correctly.

### VI. MCP Integration Testing

All changes MUST be tested by actually using the MCP server from an AI assistant's perspective.

- After building, the MCP MUST be tested by invoking tools as a user/AI would
- Test scenarios MUST include both happy path and error conditions
- Status names, field values, and entity types MUST be tested with actual workspace data
- The test checklist in `specs/mcp-test-checklist.md` MUST be executed before merging
- Edge cases discovered in production MUST be added to the test checklist
- Unit tests alone are NOT sufficient - real MCP invocation is REQUIRED

**Required Test Categories**:
1. **Entity Operations**: Create, read, update, list, search for each entity type
2. **Relationship Operations**: Create links, get relationships, remove relationships
3. **Configuration Operations**: Get config for all types and specific types
4. **Error Handling**: Invalid status names, missing required fields, non-existent IDs
5. **Pagination**: Multi-page results with cursor handling

**Rationale**: Unit tests verify code logic but not real-world behavior. The bugs discovered in production
(case-sensitive status names, single entity config response structure) would have been caught by actually
using the MCP. Testing from the AI assistant's perspective ensures the MCP works as intended.

## API Integration Standards

This section defines constraints specific to ProductBoard API v2 integration.

### Base Configuration

- **Base URL**: `https://api.productboard.com/v2`
- **API Status**: Generally Available (GA). ProductBoard API v1 is deprecated and sunsets on 2026-07-08.

### Authentication

Three authentication methods are supported:

| Method | Use Case | Implementation |
|--------|----------|----------------|
| API Token | Scripts, CLIs, server-side apps | Bearer token in Authorization header |
| OAuth 2.0 Authorization Code | Public/third-party integrations | Multi-user consent flow |
| OAuth 2.0 JWT Bearer | Backend automation | Service-to-service without UI |

- All requests MUST include `Authorization: Bearer <token>` header
- Authentication failures (401) MUST produce actionable error messages

### Rate Limiting

- **Limit**: 50 requests per second per access token
- **Response Headers**:
  - `X-RateLimit-Limit`: Total requests permitted in current window
  - `X-RateLimit-Remaining`: Requests available before throttling
  - `Retry-After`: Seconds to wait (only on 429 responses)
- **Implementation Requirements**:
  - MUST implement exponential backoff on 429 responses
  - SHOULD expose rate limit status via MCP resource
  - MUST distribute load evenly rather than bursting
  - SHOULD cache responses to minimize unnecessary calls

### Pagination

- **Method**: Cursor-based pagination using `pageCursor` query parameter
- **Response Structure**:
  - `data`: Array containing results
  - `links.next`: URL with next page cursor (absent when no more results)
- **Implementation Requirements**:
  - Tools returning lists MUST support cursor-based pagination
  - Cursors MUST be treated as opaque strings (never parsed or modified)
  - MUST continue paging until `links.next` is absent

### API Domains

The API covers three main domains:

| Domain | Entities | Operations |
|--------|----------|------------|
| Notes | simple, conversation, opportunity | CRUD, relationships, customer links |
| Entities | product, component, feature, subfeature, initiative, objective, keyResult, release, releaseGroup | CRUD, search, relationships |
| Analytics | feature views, user activity, note processing | Read-only metrics |

### Field Value Types

- **Read types** (`FieldValue`): TextFieldValue, RichTextFieldValue, NumberFieldValue, BooleanFieldValue,
  DateFieldValue, DateTimeFieldValue, StatusFieldValue, MemberFieldValue, TeamFieldValue,
  SingleSelectFieldValue, MultiSelectFieldValue, HealthFieldValue, ProgressFieldValue, TimeframeFieldValue
- **Write types** (`FieldAssign`): Corresponding assignment variants for setting values
- **Best Practice**: Use IDs over names for automated systems

### Richtext Handling

- **Supported tags**: `<h1>`, `<h2>`, `<p>`, `<hr/>`, `<pre>`, `<blockquote>`, `<b>`, `<i>`, `<u>`,
  `<s>`, `<code>`, `<ul>`, `<ol>`, `<li>`, `<a>`
- **All tags MUST be properly closed**
- **Behavior difference**:
  - Notes API: Strips unsupported tags silently
  - Entity APIs: Returns 400 error for unsupported tags
- Tools handling richtext MUST validate tags before submission to Entity APIs

### Error Handling

- All ProductBoard API errors MUST map to structured MCP error responses
- Errors MUST include: HTTP status, error message, and context for resolution
- Rate limit errors (429) MUST include retry timing information

### API Request Body Structures (Verified 2025-12-14)

These structures have been verified against official ProductBoard documentation and MUST be used:

#### Create Entity (POST /entities)
```json
{
  "data": {
    "type": "feature|subfeature|...",
    "fields": { "name": "...", "status": { "name": "..." }, ... },
    "relationships": [{ "type": "parent", "target": { "id": "..." } }]
  }
}
```
**Reference**: https://developer.productboard.com/v2.0.0/reference/createentity

#### Update Entity (PATCH /entities/{id})
```json
{
  "data": {
    "fields": { "name": "...", "status": { "name": "..." }, ... }
  }
}
```
Alternative patch format:
```json
{
  "data": {
    "patch": [{ "op": "set", "path": "description", "value": "..." }]
  }
}
```
**Reference**: https://developer.productboard.com/v2.0.0/reference/updateentitybyid

#### Search Entities (POST /entities/search)
```json
{
  "data": {
    "type": "feature",
    "name": "Search text",
    "statuses": [{ "name": "Released" }],
    "owners": [{ "email": "john@example.com" }],
    "parent": { "id": "parent-feature-id" }
  }
}
```
**Note**: REQUIRES `data` wrapper (verified by live testing 2025-12-14).
**IMPORTANT**: The official docs show a `filter` property but that does NOT work.
Filters are passed as direct properties (`name`, `statuses`, `owners`, `parent`) in the data object.
All filter properties are optional.

**Name Search** (verified 2025-12-14): The `name` parameter enables server-side text filtering:
- Supports partial matching (case-insensitive)
- Returns all matching features across all pages
- Example: `"name": "Store Web"` matches "Store Web App MVP", "Store Web App MMP", etc.

**Reference**: https://developer.productboard.com/v2.0.0/reference/searchentities

#### Set Relationship (PUT /entities/{id}/relationships/{type})
```json
{
  "data": {
    "target": { "id": "target-entity-id" }
  }
}
```
**Reference**: https://developer.productboard.com/v2.0.0/reference/replaceentityrelationships

#### Delete Relationship (DELETE /entities/{id}/relationships/{type}/{targetId})
- Path includes targetId as third parameter
- No request body required
**Reference**: https://developer.productboard.com/v2.0.0/reference/deleteentityrelationship

### Versioning

- MCP server version MUST track compatibility with ProductBoard API v2 schema version
- Breaking changes to the GA API MUST trigger a minor (or major, when warranted) version bump
  in the MCP server, with a changelog entry citing the source changelog/reference URL

## Development Workflow

This section defines the required development practices for contributions.

- **Branch Strategy**: Feature branches from `main`; PRs required for all changes
- **Testing Requirements**:
  1. Unit tests for all tools (`npm test`)
  2. Live integration tests against ProductBoard (`npm run test:live`)
  3. **MCP Integration Tests**: Execute `specs/mcp-test-checklist.md` using real MCP invocation
- **Pre-Merge Testing Process**:
  1. Run `npm run build` - ensure clean compilation
  2. Run `npm test` - all unit and live tests must pass
  3. Configure MCP in Claude Code or terminal (`claude mcp add`)
  4. Execute MCP test checklist scenarios from `specs/mcp-test-checklist.md`
  5. Verify all test scenarios pass before committing
- **Code Review**: All PRs MUST be reviewed before merge
- **Documentation**: Each MCP tool MUST have JSDoc comments describing parameters and behavior
- **Commit Messages**: Conventional commits format (`feat:`, `fix:`, `docs:`, etc.)

## Governance

This constitution is the authoritative source for development standards in this project.

- All pull requests MUST demonstrate compliance with the Core Principles
- Amendments to this constitution require documented justification and version increment
- Constitution violations discovered in existing code MUST be filed as technical debt issues
- Questions of interpretation default to the principle's stated **Rationale**

**Amendment Procedure**:
1. Propose change via pull request to this file
2. Document rationale for the change
3. Update version number according to semantic versioning
4. Update any dependent templates or documentation

**Version**: 1.4.0 | **Ratified**: 2025-12-12 | **Last Amended**: 2026-04-23
