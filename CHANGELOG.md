# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
