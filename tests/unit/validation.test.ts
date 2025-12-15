/**
 * Unit Tests for Field Validation Utilities
 *
 * Tests validation logic without API calls.
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import { validateFieldsAgainstConfig } from '../../src/utils/validation.js';

// Mock field configurations for testing
const mockStatusConfig = {
  id: 'status-field',
  name: 'status',
  displayName: 'Status',
  type: 'status',
  required: false,
  readOnly: false,
  options: [
    { id: 'status-1', name: 'Backlog' },
    { id: 'status-2', name: 'In Progress' },
    { id: 'status-3', name: 'Done' },
  ],
};

const mockNameConfig = {
  id: 'name-field',
  name: 'name',
  displayName: 'Name',
  type: 'text',
  required: true,
  readOnly: false,
};

const mockDescriptionConfig = {
  id: 'desc-field',
  name: 'description',
  displayName: 'Description',
  type: 'richtext',
  required: false,
  readOnly: false,
};

const mockOwnerConfig = {
  id: 'owner-field',
  name: 'owner',
  displayName: 'Owner',
  type: 'member',
  required: false,
  readOnly: false,
};

const mockTeamConfig = {
  id: 'team-field',
  name: 'team',
  displayName: 'Team',
  type: 'team',
  required: false,
  readOnly: false,
};

const mockNumberConfig = {
  id: 'effort-field',
  name: 'effort',
  displayName: 'Effort',
  type: 'number',
  required: false,
  readOnly: false,
};

const mockReadOnlyConfig = {
  id: 'readonly-field',
  name: 'createdAt',
  displayName: 'Created At',
  type: 'datetime',
  required: true,
  readOnly: true,
};

const fullConfig = [
  mockNameConfig,
  mockStatusConfig,
  mockDescriptionConfig,
  mockOwnerConfig,
  mockTeamConfig,
  mockNumberConfig,
  mockReadOnlyConfig,
];

describe('validateFieldsAgainstConfig', () => {
  describe('missing required fields', () => {
    it('should warn when required field is missing on create', () => {
      const fields = {
        description: { value: '<p>Test</p>' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatchObject({
        field: 'name',
        issue: 'missing_required',
        message: expect.stringContaining('Name'),
      });
    });

    it('should not warn for missing required field on update', () => {
      const fields = {
        description: { value: '<p>Updated</p>' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'update');

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should not warn for missing read-only required field', () => {
      // Read-only fields should not be flagged as missing
      const fields = {
        name: 'Test Feature',
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      // Should pass - createdAt is required but read-only, so not expected
      expect(result.valid).toBe(true);
    });

    it('should warn when required field is empty string', () => {
      const fields = {
        name: '',
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(false);
      expect(result.warnings[0].issue).toBe('missing_required');
    });
  });

  describe('invalid status/select values', () => {
    it('should warn when status name is invalid', () => {
      const fields = {
        name: 'Test Feature',
        status: { name: 'InvalidStatus' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatchObject({
        field: 'status',
        issue: 'invalid_value',
        message: expect.stringContaining('InvalidStatus'),
        suggestion: expect.stringContaining('Backlog'),
      });
    });

    it('should accept valid status name (case insensitive)', () => {
      const fields = {
        name: 'Test Feature',
        status: { name: 'backlog' }, // lowercase
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should accept valid status by id', () => {
      const fields = {
        name: 'Test Feature',
        status: { id: 'status-2' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(true);
    });

    it('should list available options in suggestion', () => {
      const fields = {
        name: 'Test Feature',
        status: { name: 'Wrong' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.warnings[0].suggestion).toContain('Backlog');
      expect(result.warnings[0].suggestion).toContain('In Progress');
      expect(result.warnings[0].suggestion).toContain('Done');
    });
  });

  describe('constraint violations', () => {
    it('should warn when number field receives non-numeric value', () => {
      const fields = {
        name: 'Test Feature',
        effort: 'not a number',
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(false);
      expect(result.warnings[0]).toMatchObject({
        field: 'effort',
        issue: 'type_mismatch',
        message: expect.stringContaining('number'),
      });
    });

    it('should accept valid number value', () => {
      const fields = {
        name: 'Test Feature',
        effort: 5,
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(true);
    });

    it('should accept string that can be parsed as number', () => {
      const fields = {
        name: 'Test Feature',
        effort: '10',
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(true);
    });
  });

  describe('unknown fields (silent skip)', () => {
    it('should silently skip unknown fields', () => {
      const fields = {
        name: 'Test Feature',
        unknownField: 'some value',
        anotherUnknown: { nested: 'object' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      // Should pass - unknown fields are silently ignored
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should not add warnings for unknown fields', () => {
      const fields = {
        customField: 'value',
      };

      const result = validateFieldsAgainstConfig(fields, [mockNameConfig], 'update');

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('member validation', () => {
    it('should accept member with id', () => {
      const fields = {
        name: 'Test Feature',
        owner: { id: 'user-123' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(true);
    });

    it('should accept member with email', () => {
      const fields = {
        name: 'Test Feature',
        owner: { email: 'user@example.com' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(true);
    });

    it('should warn when member has neither id nor email', () => {
      const fields = {
        name: 'Test Feature',
        owner: { name: 'John' }, // Wrong structure
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(false);
      expect(result.warnings[0]).toMatchObject({
        field: 'owner',
        issue: 'invalid_value',
        suggestion: expect.stringContaining('email'),
      });
    });
  });

  describe('team validation', () => {
    it('should accept team with id', () => {
      const fields = {
        name: 'Test Feature',
        team: { id: 'team-123' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(true);
    });

    it('should accept team with name', () => {
      const fields = {
        name: 'Test Feature',
        team: { name: 'Engineering' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(true);
    });

    it('should warn when team has neither id nor name', () => {
      const fields = {
        name: 'Test Feature',
        team: { email: 'team@example.com' }, // Wrong structure
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(false);
      expect(result.warnings[0].field).toBe('team');
    });
  });

  describe('null config handling', () => {
    it('should return valid with empty warnings when config is null', () => {
      const fields = {
        name: 'Test Feature',
        status: { name: 'Invalid' },
      };

      const result = validateFieldsAgainstConfig(fields, null, 'create');

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return valid when config is empty array', () => {
      const fields = {
        name: 'Test Feature',
      };

      const result = validateFieldsAgainstConfig(fields, [], 'create');

      expect(result.valid).toBe(true);
    });
  });

  describe('multiple warnings', () => {
    it('should collect multiple validation warnings', () => {
      const fields = {
        // Missing required name
        status: { name: 'InvalidStatus' },
        effort: 'not a number',
        owner: { wrong: 'structure' },
      };

      const result = validateFieldsAgainstConfig(fields, fullConfig, 'create');

      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThanOrEqual(3);

      const issues = result.warnings.map((w) => w.issue);
      expect(issues).toContain('missing_required');
      expect(issues).toContain('invalid_value');
      expect(issues).toContain('type_mismatch');
    });
  });
});
