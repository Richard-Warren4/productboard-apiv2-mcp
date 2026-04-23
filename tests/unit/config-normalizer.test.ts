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
