/**
 * Unit tests for client-side team filtering
 */

import { describe, it, expect } from 'vitest';

import type { GenericEntity } from '../../src/client/types.js';
import {
  getEntityTeams,
  matchesTeamFilter,
  applyTeamFilter,
  hasTeamFilter,
} from '../../src/utils/teams.js';

function entity(fields: Record<string, unknown>): GenericEntity {
  return {
    id: 'id-1',
    type: 'feature',
    fields: { name: 'Test feature', ...fields },
  } as unknown as GenericEntity;
}

const mobile = { id: 't1', name: 'H4C Mobile' };
const desktop = { id: 't2', name: 'H4C Desktop' };

describe('getEntityTeams', () => {
  it('reads the plural teams array', () => {
    expect(getEntityTeams(entity({ teams: [mobile, desktop] }))).toEqual([mobile, desktop]);
  });

  it('falls back to the singular team field', () => {
    expect(getEntityTeams(entity({ team: mobile }))).toEqual([mobile]);
  });

  it('returns an empty array when no team is assigned', () => {
    expect(getEntityTeams(entity({}))).toEqual([]);
    expect(getEntityTeams(entity({ teams: [] }))).toEqual([]);
  });

  it('drops null entries from the array', () => {
    expect(getEntityTeams(entity({ teams: [mobile, null] }))).toEqual([mobile]);
  });
});

describe('matchesTeamFilter', () => {
  it('matches on exact team name', () => {
    expect(matchesTeamFilter(entity({ teams: [mobile] }), { teams: ['H4C Mobile'] })).toBe(true);
  });

  it('matches case-insensitively and ignores surrounding whitespace', () => {
    expect(matchesTeamFilter(entity({ teams: [mobile] }), { teams: ['  h4c mobile '] })).toBe(true);
  });

  it('uses ANY semantics across multiple team names', () => {
    const e = entity({ teams: [desktop] });
    expect(matchesTeamFilter(e, { teams: ['H4C Mobile', 'H4C Desktop'] })).toBe(true);
    expect(matchesTeamFilter(e, { teams: ['H4C Mobile', 'H4C Frontend'] })).toBe(false);
  });

  it('matches an entity belonging to several teams', () => {
    expect(matchesTeamFilter(entity({ teams: [mobile, desktop] }), { teams: ['H4C Desktop'] })).toBe(true);
  });

  it('filters on team presence via hasTeam', () => {
    expect(matchesTeamFilter(entity({ teams: [mobile] }), { hasTeam: true })).toBe(true);
    expect(matchesTeamFilter(entity({ teams: [mobile] }), { hasTeam: false })).toBe(false);
    expect(matchesTeamFilter(entity({}), { hasTeam: false })).toBe(true);
    expect(matchesTeamFilter(entity({}), { hasTeam: true })).toBe(false);
  });

  it('ANDs teams and hasTeam when both are supplied', () => {
    const e = entity({ teams: [mobile] });
    expect(matchesTeamFilter(e, { teams: ['H4C Mobile'], hasTeam: true })).toBe(true);
    expect(matchesTeamFilter(e, { teams: ['H4C Mobile'], hasTeam: false })).toBe(false);
  });

  it('passes everything through when no condition is set', () => {
    expect(matchesTeamFilter(entity({}), {})).toBe(true);
    expect(matchesTeamFilter(entity({}), { teams: [] })).toBe(true);
  });
});

describe('applyTeamFilter', () => {
  it('keeps only matching entities', () => {
    const entities = [
      entity({ teams: [mobile] }),
      entity({ teams: [desktop] }),
      entity({}),
    ];
    expect(applyTeamFilter(entities, { teams: ['H4C Mobile'] })).toHaveLength(1);
    expect(applyTeamFilter(entities, { hasTeam: false })).toHaveLength(1);
    expect(applyTeamFilter(entities, {})).toHaveLength(3);
  });
});

describe('hasTeamFilter', () => {
  it('detects whether a filter would narrow results', () => {
    expect(hasTeamFilter({})).toBe(false);
    expect(hasTeamFilter({ teams: [] })).toBe(false);
    expect(hasTeamFilter({ teams: ['H4C Mobile'] })).toBe(true);
    expect(hasTeamFilter({ hasTeam: false })).toBe(true);
  });
});
