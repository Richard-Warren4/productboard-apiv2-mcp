<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.2.0
Bump rationale: MINOR - Added new principle (V: Documentation-Verified Implementation) requiring all API
implementations to be verified against official ProductBoard developer documentation.

Modified principles: None

Added sections:
- Principle V: Documentation-Verified Implementation (new principle requiring verification against official docs)
- Added API Request Body Structures section with verified correct formats

Removed sections: None

Templates requiring updates:
- .specify/templates/plan-template.md: ✅ reviewed - no updates required (Constitution Check is generic)
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

### IV. API Beta Awareness

The MCP server MUST acknowledge and handle the beta status of ProductBoard API v2.

- Documentation MUST clearly indicate which features depend on beta API endpoints
- Implementation MUST NOT assume API stability; response formats may change
- Error handling MUST gracefully handle unexpected response structures
- Version tracking MUST note which ProductBoard API v2 schema version was tested
- Users MUST be informed that the underlying API is in beta and subject to changes

**Rationale**: ProductBoard API v2 is currently in beta status, intended for experimentation and
early integrations rather than production systems. Acknowledging this prevents false expectations
of stability and encourages defensive coding practices.

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

## API Integration Standards

This section defines constraints specific to ProductBoard API v2 integration.

### Base Configuration

- **Base URL**: `https://api.productboard.com/v2`
- **API Status**: Beta (not recommended for production use per official documentation)

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
- Breaking changes to the beta API SHOULD trigger minor version bumps in the MCP server

## Development Workflow

This section defines the required development practices for contributions.

- **Branch Strategy**: Feature branches from `main`; PRs required for all changes
- **Testing Requirements**: Unit tests for all tools; integration tests against ProductBoard sandbox
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

**Version**: 1.2.2 | **Ratified**: 2025-12-12 | **Last Amended**: 2025-12-14
