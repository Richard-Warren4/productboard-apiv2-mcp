/**
 * Unit tests for the field-config normalizer.
 *
 * Verifies that `normalizeFields` and `extractFieldOptions` accept both the
 * legacy `options: [...]` shape and the GA `values: { data: [...], links: {...} }`
 * envelope (introduced by the FieldInlineValues → FieldValueItem rename in the
 * March 2026 ProductBoard changelog).
 */

import { describe, it, expect } from 'vitest';
import { normalizeFields, extractFieldOptions } from '../../src/tools/config.js';

describe('extractFieldOptions', () => {
  it('reads legacy inline options when present', () => {
    const opts = extractFieldOptions({
      id: 'status',
      name: 'status',
      schema: 'StatusFieldValue',
      options: [
        { id: 'a', name: 'Backlog' },
        { id: 'b', name: 'In Progress' },
      ],
    });
    expect(opts).toEqual([
      { id: 'a', name: 'Backlog' },
      { id: 'b', name: 'In Progress' },
    ]);
  });

  it('reads GA `values.data` array when inline options are absent', () => {
    const opts = extractFieldOptions({
      id: 'priority',
      name: 'priority',
      schema: 'SingleSelectFieldValue',
      values: {
        data: [
          { id: 'p1', name: 'High', assignedEntityTypes: ['feature'] },
          { id: 'p2', name: 'Low', assignedEntityTypes: ['feature'] },
        ],
        links: { next: null },
      },
    });
    expect(opts?.map((o) => o.name)).toEqual(['High', 'Low']);
  });

  it('falls back to `values.inline` for transitional responses', () => {
    const opts = extractFieldOptions({
      id: 'health',
      name: 'health',
      values: {
        inline: [{ id: 'g', name: 'green' }],
      },
    });
    expect(opts).toEqual([{ id: 'g', name: 'green' }]);
  });

  it('returns undefined when no options are available', () => {
    expect(extractFieldOptions({ id: 'name', name: 'name', schema: 'TextFieldValue' })).toBeUndefined();
  });
});

describe('normalizeFields against GA JSON-Schema field objects', () => {
  // Real shapes captured from `GET /entities/configurations/feature` on
  // the GA API (March 2026). `schema` is now a JSON Schema object, not a
  // string — the classifier must infer our internal type from its shape.
  it('classifies plain string → text, date/date-time → date/datetime, enum → single_select', () => {
    const normalized = normalizeFields({
      name: { id: 'name', name: 'Name', schema: { type: 'string' }, constraints: { required: true, maxLength: 2000 } },
      startDate: { id: 'timeframe.startDate', name: 'Start Date', schema: { type: 'string', format: 'date' } },
      updatedAt: { id: 'updatedAt', name: 'Updated', schema: { type: 'string', format: 'date-time' } },
      granularity: { id: 'timeframe.granularity', name: 'Granularity', schema: { type: 'string', enum: ['year', 'quarter', 'month', 'day'] } },
    } as unknown as Parameters<typeof normalizeFields>[0]);
    const byId = Object.fromEntries(normalized.map((f) => [f.id, f.type]));
    expect(byId['name']).toBe('text');
    expect(byId['timeframe.startDate']).toBe('date');
    expect(byId['updatedAt']).toBe('datetime');
    expect(byId['timeframe.granularity']).toBe('single_select');
  });

  it('classifies long-form string → richtext and primitives', () => {
    const normalized = normalizeFields({
      description: { id: 'description', name: 'Description', schema: { type: 'string' }, constraints: { maxLength: 1048576 } },
      effort: { id: 'effort', name: 'Engineering Effort', schema: { type: 'number' } },
      archived: { id: 'archived', name: 'Archived', schema: { type: 'boolean' } },
    } as unknown as Parameters<typeof normalizeFields>[0]);
    const byId = Object.fromEntries(normalized.map((f) => [f.id, f.type]));
    expect(byId['description']).toBe('richtext');
    expect(byId['effort']).toBe('number');
    expect(byId['archived']).toBe('boolean');
  });

  it('classifies object schemas into status/member/single_select/team', () => {
    const normalized = normalizeFields({
      status: {
        id: 'status', name: 'Status',
        schema: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' } } },
      },
      owner: {
        id: 'owner', name: 'Owner',
        schema: { type: 'object', required: ['id', 'email'], properties: { id: { type: 'string' }, email: { type: 'string' } } },
      },
      teams: {
        id: 'teams', name: 'Teams',
        schema: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' } } },
        lifecycle: { patch: { addItems: true, removeItems: true } },
      },
      custom: {
        id: '254c08a7-8c76-4bd8-9836-b2a73088a1ee', name: 'Biz Impact',
        schema: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' }, color: { type: 'string' } } },
      },
    } as unknown as Parameters<typeof normalizeFields>[0]);
    const byId = Object.fromEntries(normalized.map((f) => [f.id, f.type]));
    expect(byId['status']).toBe('status');
    expect(byId['owner']).toBe('member');
    expect(byId['teams']).toBe('team');
    expect(byId['254c08a7-8c76-4bd8-9836-b2a73088a1ee']).toBe('single_select');
  });

  it('classifies structured objects (timeframe, health, progress) and array multi-select', () => {
    const normalized = normalizeFields({
      timeframe: {
        id: 'timeframe', name: 'Timeframe',
        schema: { type: 'object', properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          granularity: { type: 'string', enum: ['year', 'quarter', 'month', 'day'] },
        } },
      },
      health: {
        id: 'health', name: 'Health',
        schema: { type: 'object', properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['notSet', 'onTrack', 'atRisk', 'offTrack'] },
          mode: { type: 'string', enum: ['manual', 'calculated'] },
          lastUpdatedAt: { type: 'string', format: 'date-time' },
        } },
      },
      workProgress: {
        id: 'workProgress', name: 'Work progress',
        schema: { type: 'object', properties: {
          value: { type: 'integer' },
          mode: { type: 'string', enum: ['manual', 'statusBased', 'calculated'] },
        } },
      },
      tags: {
        id: 'tags', name: 'Tags',
        schema: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } } },
      },
    } as unknown as Parameters<typeof normalizeFields>[0]);
    const byId = Object.fromEntries(normalized.map((f) => [f.id, f.type]));
    expect(byId['timeframe']).toBe('timeframe');
    expect(byId['health']).toBe('health');
    expect(byId['workProgress']).toBe('progress');
    expect(byId['tags']).toBe('multi_select');
  });
});

describe('normalizeFields with FieldValueItem envelope', () => {
  it('flattens GA-shaped options through normalizeFields', () => {
    const normalized = normalizeFields({
      priority: {
        id: 'priority',
        name: 'priority',
        schema: 'SingleSelectFieldValue',
        values: {
          data: [
            { id: 'p1', name: 'High' },
            { id: 'p2', name: 'Low' },
          ],
        },
      },
    });
    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.options).toEqual([
      { id: 'p1', name: 'High' },
      { id: 'p2', name: 'Low' },
    ]);
    expect(normalized[0]?.type).toBe('single_select');
  });

  it('produces the same output for legacy inline and new envelope shapes', () => {
    const legacy = normalizeFields([
      {
        id: 'status',
        name: 'status',
        schema: 'StatusFieldValue',
        options: [
          { id: '1', name: 'Backlog' },
          { id: '2', name: 'Done' },
        ],
      },
    ]);
    const ga = normalizeFields([
      {
        id: 'status',
        name: 'status',
        schema: 'StatusFieldValue',
        values: {
          data: [
            { id: '1', name: 'Backlog' },
            { id: '2', name: 'Done' },
          ],
        },
      },
    ]);
    expect(ga[0]?.options).toEqual(legacy[0]?.options);
  });
});
