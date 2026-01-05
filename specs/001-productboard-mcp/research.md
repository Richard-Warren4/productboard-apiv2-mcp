# Research: ProductBoard MCP Server

**Date**: 2025-12-12
**Status**: Complete

## Technology Decisions

### 1. MCP SDK Selection

**Decision**: Use `@modelcontextprotocol/sdk` with high-level `McpServer` API

**Rationale**:
- Official TypeScript SDK with active maintenance
- High-level API provides automatic schema handling and simpler tool registration
- Built-in Zod integration for runtime validation
- Supports StdioServerTransport for Claude Desktop/Code integration

**Alternatives Considered**:
- Low-level Server API: More control but unnecessary complexity for this use case
- Custom MCP implementation: No benefit, higher maintenance burden

**Key Patterns**:
```typescript
// Tool registration pattern
server.tool("pb_list_features", schema, async (args) => ({
  content: [{ type: "text", text: JSON.stringify(result) }]
}));

// Error handling pattern - return in result, not protocol error
return {
  isError: true,
  content: [{ type: "text", text: "User-friendly error message" }]
};
```

### 2. Validation Library

**Decision**: Use Zod for runtime validation

**Rationale**:
- Required peer dependency of MCP SDK
- TypeScript-first with excellent type inference
- Expressive schema DSL with `.describe()` for documentation
- Parse-don't-validate pattern prevents invalid data propagation

**Alternatives Considered**:
- io-ts: Heavier, less ergonomic API
- Joi: Not TypeScript-first
- Manual validation: Error-prone, no type inference

### 3. HTTP Client

**Decision**: Use native `fetch` (Node.js 20+)

**Rationale**:
- Node.js 20 LTS includes stable native fetch
- No additional dependencies
- Familiar API, easy to wrap with auth/retry logic

**Alternatives Considered**:
- node-fetch: Redundant with native fetch in Node 20
- axios: Heavier, unnecessary features for simple REST calls
- got: Good library but adds dependency without clear benefit

### 4. Testing Framework

**Decision**: Vitest with MSW for integration mocking

**Rationale**:
- Native ESM support, fast execution
- Compatible with TypeScript without transpilation config
- MSW provides realistic HTTP mocking at network level
- Live tests can run against real ProductBoard API

**Alternatives Considered**:
- Jest: Slower, ESM support requires more config
- Mocha: Less integrated experience
- Node test runner: Less mature ecosystem

### 5. Project Structure

**Decision**: Single-project MCP server with modular tool organization

**Rationale**:
- MCP servers are stateless proxies, no frontend/backend split needed
- Tools grouped by domain (features, subfeatures, relationships, search)
- Separate client layer for API communication concerns
- Schemas isolated for reuse and testing

**Structure**:
```
src/
├── index.ts          # Server entry, tool registration
├── tools/            # MCP tool implementations (one file per domain)
├── client/           # ProductBoard API client
├── schemas/          # Zod schemas
└── utils/            # Shared utilities
```

## ProductBoard API v2 Patterns

### Entity Hierarchy

```
Product
└── Component
    └── Feature
        └── Subfeature
```

Additional entities: Initiative, Objective, KeyResult, Release, ReleaseGroup, Member, Team

### Field Value Type System

The API distinguishes between read and write operations:

| Operation | Type Family | Example |
|-----------|-------------|---------|
| Read (GET response) | `FieldValue` | `StatusFieldValue: { id, name }` |
| Write (POST/PATCH body) | `FieldAssign` | `StatusFieldAssign: { id }` or `{ name }` |

**Best Practice**: Use IDs over names in automated systems for stability.

### Pagination Strategy

```typescript
// Cursor-based pagination
interface PaginatedResponse<T> {
  data: T[];
  links: {
    next?: string;  // URL with pageCursor, absent when no more results
  };
}

// Implementation pattern
async function* fetchAllPages<T>(endpoint: string): AsyncGenerator<T> {
  let url = endpoint;
  while (url) {
    const response = await fetch(url);
    const json = await response.json();
    yield* json.data;
    url = json.links?.next;
  }
}
```

### Rate Limiting Strategy

**Limits**: 50 requests/second per access token

**Headers**:
- `X-RateLimit-Limit`: Window size
- `X-RateLimit-Remaining`: Remaining requests
- `Retry-After`: Wait time on 429

**Implementation**:
```typescript
// Exponential backoff pattern
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}
```

### Error Mapping

| HTTP Status | ProductBoard Meaning | MCP Response |
|-------------|---------------------|--------------|
| 400 | Validation error (e.g., invalid richtext) | `isError: true` with field-level details |
| 401 | Invalid/expired token | `isError: true` with reconfiguration guidance |
| 404 | Entity not found | `isError: true` with entity type and ID |
| 429 | Rate limited | `isError: true` with retry timing |
| 5xx | Server error | `isError: true` with retry suggestion |

### Richtext Validation

Entity APIs return 400 for unsupported tags (Notes API strips silently).

**Allowed tags**: `<h1>`, `<h2>`, `<p>`, `<hr/>`, `<pre>`, `<blockquote>`, `<b>`, `<i>`, `<u>`, `<s>`, `<code>`, `<ul>`, `<ol>`, `<li>`, `<a>`

```typescript
const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'p', 'hr', 'pre', 'blockquote',
  'b', 'i', 'u', 's', 'code', 'ul', 'ol', 'li', 'a'
]);

function validateRichtext(html: string): boolean {
  // Strip and validate tags before API submission
}
```

## Configuration Discovery

ProductBoard workspaces have custom field configurations. The MCP must:

1. Call configuration endpoint on startup or lazily
2. Cache field definitions per entity type
3. Adapt tool schemas to available fields
4. Handle unknown fields gracefully (beta API may add fields)

```typescript
// Configuration endpoint pattern
GET /v2/entities/configurations
GET /v2/entities/configurations/{entityType}
```

## MCP Tool Design Principles

Based on research, each tool should:

1. **Single Purpose**: One tool = one ProductBoard operation
2. **Clear Naming**: `pb_` prefix + action + entity (e.g., `pb_list_features`)
3. **Validated Inputs**: Zod schema with descriptions
4. **Structured Output**: JSON in text content for AI parsing
5. **Informative Errors**: `isError: true` with actionable guidance

## Unresolved Items

None - all technical decisions resolved through research.
