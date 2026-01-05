# Implementation Plan: ProductBoard MCP Server

**Branch**: `001-productboard-mcp` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-productboard-mcp/spec.md`

## Summary

Build an MCP (Model Context Protocol) server that enables Claude Desktop and Claude Code to interact with ProductBoard API v2 for feature management. The server will support CRUD operations on features and subfeatures, relationship management, search/filtering, and dynamic field discovery. Implementation uses TypeScript with strict typing, Zod validation, and follows MCP-first design principles per the project constitution.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 20 LTS
**Primary Dependencies**: @modelcontextprotocol/sdk, zod, node-fetch (or native fetch)
**Storage**: N/A (stateless proxy to ProductBoard API)
**Testing**: Vitest (unit), Vitest + MSW (integration mocks), live API tests
**Target Platform**: Node.js runtime (Claude Desktop/Code MCP host)
**Project Type**: Single project (MCP server library)
**Performance Goals**: <5s response for list operations (per SC-001), <10s for create (per SC-003)
**Constraints**: 50 req/sec rate limit, cursor-based pagination, beta API stability
**Scale/Scope**: Single user workspace, up to 500 features (per SC-005)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Evidence |
|-----------|-------------|--------|----------|
| I. MCP-First Design | Tools expose API v2 operations via MCP | PASS | Each FR maps to an MCP tool |
| I. MCP-First Design | Single clear purpose per tool | PASS | Tool design in contracts/ |
| I. MCP-First Design | JSON schema validation | PASS | Zod schemas for all inputs |
| II. Type Safety | TypeScript strict mode | PASS | tsconfig.json strict: true |
| II. Type Safety | All types defined as interfaces | PASS | data-model.md defines all |
| II. Type Safety | Runtime validation at boundaries | PASS | Zod at MCP tool inputs |
| II. Type Safety | FieldValue vs FieldAssign distinction | PASS | Separate types in model |
| III. API Contract Fidelity | Tool names indicate PB operation | PASS | Naming convention: pb_* |
| III. API Contract Fidelity | Error responses surfaced with context | PASS | Error mapping in design |
| III. API Contract Fidelity | Rate limits handled transparently | PASS | Exponential backoff |
| III. API Contract Fidelity | Config endpoints for field discovery | PASS | FR-014, FR-015 |
| IV. API Beta Awareness | Documentation indicates beta status | PASS | README + tool descriptions |
| IV. API Beta Awareness | Graceful handling of unexpected responses | PASS | Defensive parsing |
| IV. API Beta Awareness | Version tracking | PASS | Package version tracks API |

**Gate Result**: PASS - All constitution principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/001-productboard-mcp/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Setup guide
├── contracts/           # Phase 1: MCP tool schemas
│   └── mcp-tools.md     # Tool definitions
└── tasks.md             # Phase 2: Implementation tasks
```

### Source Code (repository root)

```text
src/
├── index.ts             # MCP server entry point
├── tools/               # MCP tool implementations
│   ├── features.ts      # Feature CRUD tools
│   ├── subfeatures.ts   # Subfeature CRUD tools
│   ├── relationships.ts # Relationship management
│   ├── search.ts        # Search and filter tools
│   └── config.ts        # Configuration discovery
├── client/              # ProductBoard API client
│   ├── api.ts           # HTTP client with auth/rate-limiting
│   ├── types.ts         # API request/response types
│   └── errors.ts        # Error mapping
├── schemas/             # Zod validation schemas
│   ├── inputs.ts        # MCP tool input schemas
│   └── responses.ts     # API response schemas
└── utils/               # Shared utilities
    ├── pagination.ts    # Cursor pagination helpers
    └── richtext.ts      # Richtext validation

tests/
├── unit/                # Unit tests for individual modules
├── integration/         # Integration tests with mocked API
└── live/                # Live API tests (requires credentials)

docs/
├── claude-desktop.md    # Claude Desktop setup guide
├── claude-code.md       # Claude Code setup guide
└── skills/              # Claude Code skill examples
    └── productboard.md  # ProductBoard workflow skills

.claude/
└── commands/            # Claude Code slash commands
    └── pb-*.md          # ProductBoard workflow commands
```

**Structure Decision**: Single project structure selected. This is an MCP server library with no frontend/backend split. The `src/tools/` directory maps directly to MCP tool implementations, `src/client/` handles ProductBoard API communication, and `src/schemas/` provides type-safe validation.

## Complexity Tracking

No constitution violations requiring justification. Design follows all principles.
