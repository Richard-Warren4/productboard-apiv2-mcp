# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **`pb_entity_search` was completely broken** after Productboard changed `POST /entities/search` to require the structured `filter` request body. Every call failed with `Property is not allowed` validation errors because the client still sent filters as flat properties under `data` (the pre-GA workaround). `searchEntities`, `searchFeatures`, and `listSubfeatures` now send `{ data: { filter: { type, id, fields, relationships } } }` per the current v2 OpenAPI spec (verified live 2026-07-30). Renames handled: `statuses` → `fields.status`, `owners` → `fields.owner`, `parent` → `relationships.parent[]`, `archived`/`name` → under `fields`.

### Changed
- **Team filtering is now server-side**: `pb_entity_search`'s `teams` parameter maps to `filter.fields.teams` (OR semantics) instead of fetching all pages and filtering client-side. `hasTeam` remains client-side (the API has no presence filter for teams).
- **Custom field filters run server-side where the API supports it**: `=` on single-select (`{name}`), multi-select (`{any: [{name}]}`), number (`{eq}`), and date (`{eq}`) fields is translated to `filter.fields.<fieldId>` in the search body, with option names canonicalized case-insensitively against the workspace config. Other operators (`!=`, inequalities) and text/boolean equality remain client-side, and only a client-side residue triggers the multi-page fetch.

## [1.1.0] - 2026-04-23

### Added
- **ProductBoard API v2 GA alignment (March 2026 changelog)**: `listEntities` accepts a single `EntityType` or `EntityType[]`; configuration and search widened to `initiative` and `keyResult`; CLAUDE.md / README / constitution refreshed for GA and the v1 sunset (2026-07-08).
- `pb_entity_list` accepts an `entityTypes` array for multi-type listing.
- Field normalizer tolerates both the legacy `options: [...]` shape and the GA `values: { data, links: { next } }` envelope (FieldInlineValues → FieldValueItem rename).

### Fixed
- `GET /entities` requests now serialize `type` as repeated `type[]=...` entries even for a single entity type. GA rejects the scalar `?type=feature` form with HTTP 400 ("Unable to parse JSON — Unrecognized token 'feature'"), which broke `pb_list_products`, `pb_list_components`, `pb_list_features`, and single-type `pb_entity_list`.
- Field configuration normalizer handles GA's JSON-Schema `schema` object (e.g. `{"type": "string"}`) instead of the legacy string name (e.g. `"TextFieldValue"`). The old string path crashed with `field.schema.replace is not a function`, breaking `pb_get_config` and `pb_entity_types`. Classifier now infers `text` / `richtext` / `number` / `boolean` / `date` / `datetime` / `status` / `single_select` / `multi_select` / `member` / `team` / `timeframe` / `health` / `progress` from JSON-Schema shape plus `lifecycle.addItems/removeItems`.
- Custom-field mapping (`buildCustomFieldMapping`) recognises GA-shaped schemas, so custom fields (e.g. Reach, Impact, Priority) are once again discovered and filterable.

## [1.0.0] - 2026-02-03

### Added
- **Entity Management**: Full CRUD operations for features, subfeatures, objectives, products, components, releases, release groups, and companies
- **Relationship Management**: View, create, set, and remove relationships between entities (links, dependencies, parent/child)
- **Search & Filter**: Search entities with status, owner, parent, and custom field filters
- **Custom Fields Support**: Read and update custom fields with human-readable field and option names
- **Configuration Discovery**: Explore available entity types, fields, products, and components
- **Initiative Support**: Support for initiative entity type
- **Flexible Teams**: Multi-team assignment support for features
- **Rate Limiting**: Automatic exponential backoff for API rate limits
- **Type Safety**: Full TypeScript with strict mode and Zod validation

### Tools Available (14 tools)
- `pb_entity_create` - Create any entity type
- `pb_entity_get` - Get entity by ID (auto-detects type)
- `pb_entity_update` - Update any entity
- `pb_entity_list` - List entities with pagination
- `pb_entity_search` - Search with filters and custom field filtering
- `pb_entity_types` - List available entity types
- `pb_refresh_config` - Force refresh cached configuration
- `pb_get_relationships` - Get entity relationships
- `pb_create_relationship` - Create relationships
- `pb_set_relationship` - Set/replace single-target relationships
- `pb_remove_relationship` - Remove relationships
- `pb_get_config` - Get entity field configuration
- `pb_list_products` - List available products
- `pb_list_components` - List available components

## [0.2.0] - 2025-12-15

### Added
- Custom field support in entity responses
- Custom field filtering in `pb_entity_search`
- Case-insensitive field name matching
- Human-readable option names for select fields

### Fixed
- Correct ProductBoard workspace URL generation
- Improved error serialization for API error objects

## [0.1.0] - 2025-12-01

### Added
- Initial release
- Consolidated MCP tools (reduced from 23 to 14)
- Generic entity CRUD operations
- Relationship management
- Basic search functionality
