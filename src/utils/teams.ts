/**
 * Team Filtering Utilities
 *
 * ProductBoard API v2 supports server-side team filtering on the search
 * endpoint via `filter.fields.teams` (handled in `client/api.ts`). These
 * helpers cover what the API cannot express: the `hasTeam` presence filter,
 * applied client-side after fetching, plus reading teams off entities for
 * display.
 *
 * @module utils/teams
 */

import type { GenericEntity, TeamFieldValue } from '../client/types.js';

/** Client-side team filter options for pb_entity_search */
export interface TeamFilterInput {
  /** Team names to match (case-insensitive). An entity matches if it belongs to ANY of them. */
  teams?: string[];
  /** When set, keep only entities that have at least one team (true) or none (false). */
  hasTeam?: boolean;
}

/**
 * Narrow an unknown value to a TeamFieldValue.
 *
 * `fields.team` is not declared on GenericEntityFields, so it arrives as
 * `unknown` via the index signature and has to be validated at runtime.
 */
function isTeamFieldValue(value: unknown): value is TeamFieldValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

/**
 * Read an entity's teams, tolerating both shapes the API uses.
 *
 * Responses carry `fields.teams` (array), but some entity types expose a
 * singular `fields.team`. Both are normalized to a single array here so callers
 * never have to care which one came back.
 *
 * @param entity - Entity to read teams from
 * @returns Team values, or an empty array when the entity has no team assigned
 */
export function getEntityTeams(entity: GenericEntity): TeamFieldValue[] {
  const { teams, team } = entity.fields;

  if (Array.isArray(teams)) {
    return teams.filter(isTeamFieldValue);
  }
  if (isTeamFieldValue(team)) {
    return [team];
  }
  return [];
}

/**
 * Test whether an entity satisfies a team filter.
 *
 * `teams` and `hasTeam` are ANDed when both are supplied. Name matching is
 * case-insensitive and trims surrounding whitespace, so "h4c mobile" matches
 * the workspace's "H4C Mobile".
 *
 * @param entity - Entity to test
 * @param filter - Team filter to apply
 * @returns True when the entity passes every supplied condition
 */
export function matchesTeamFilter(entity: GenericEntity, filter: TeamFilterInput): boolean {
  const entityTeams = getEntityTeams(entity);

  if (filter.hasTeam !== undefined && filter.hasTeam !== (entityTeams.length > 0)) {
    return false;
  }

  if (filter.teams !== undefined && filter.teams.length > 0) {
    const wanted = new Set(filter.teams.map((t) => t.trim().toLowerCase()));
    const hasMatch = entityTeams.some((t) => wanted.has(t.name.trim().toLowerCase()));
    if (!hasMatch) return false;
  }

  return true;
}

/**
 * Filter a list of entities by team.
 *
 * @param entities - Entities to filter
 * @param filter - Team filter to apply
 * @returns Entities passing the filter
 */
export function applyTeamFilter(
  entities: GenericEntity[],
  filter: TeamFilterInput
): GenericEntity[] {
  return entities.filter((e) => matchesTeamFilter(e, filter));
}

/**
 * Whether a team filter would actually narrow results.
 *
 * Used to decide if the multi-page fetch is needed — an empty filter should not
 * trigger fetching the whole backlog.
 *
 * @param filter - Team filter to inspect
 * @returns True when at least one condition is set
 */
export function hasTeamFilter(filter: TeamFilterInput): boolean {
  return filter.hasTeam !== undefined || (filter.teams !== undefined && filter.teams.length > 0);
}
