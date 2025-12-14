/**
 * Zod Schemas for ProductBoard API v2 Responses
 *
 * These schemas validate API responses at runtime to ensure type safety
 * and graceful handling of unexpected response structures (beta API).
 *
 * @module schemas/responses
 */

import { z } from 'zod';

// =============================================================================
// Field Value Schemas (Read)
// =============================================================================

export const RichTextFieldValueSchema = z.object({
  value: z.string(),
});

export const StatusFieldValueSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const MemberFieldValueSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
});

export const TeamFieldValueSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const EntityTypeSchema = z.enum([
  'product',
  'component',
  'feature',
  'subfeature',
  'initiative',
  'objective',
  'keyResult',
  'release',
  'releaseGroup',
]);

export const EntityReferenceSchema = z.object({
  id: z.string(),
  type: EntityTypeSchema,
  links: z
    .object({
      self: z.string(),
    })
    .optional(),
});

// =============================================================================
// Core Entity Schemas
// =============================================================================

export const FeatureSchema = z.object({
  id: z.string(),
  type: z.literal('feature'),
  name: z.string(),
  description: RichTextFieldValueSchema.optional(),
  status: StatusFieldValueSchema.optional(),
  owner: MemberFieldValueSchema.optional(),
  team: TeamFieldValueSchema.optional(),
  parent: EntityReferenceSchema.optional(),
  product: EntityReferenceSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  links: z.object({
    self: z.string(),
    html: z.string(),
  }),
});

export const SubfeatureSchema = z.object({
  id: z.string(),
  type: z.literal('subfeature'),
  name: z.string(),
  description: RichTextFieldValueSchema.optional(),
  status: StatusFieldValueSchema.optional(),
  owner: MemberFieldValueSchema.optional(),
  team: TeamFieldValueSchema.optional(),
  parent: EntityReferenceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  links: z.object({
    self: z.string(),
    html: z.string(),
  }),
});

export const ComponentSchema = z.object({
  id: z.string(),
  type: z.literal('component'),
  name: z.string(),
  description: RichTextFieldValueSchema.optional(),
  product: EntityReferenceSchema.optional(),
  links: z.object({
    self: z.string(),
    html: z.string(),
  }),
});

export const ProductSchema = z.object({
  id: z.string(),
  type: z.literal('product'),
  name: z.string(),
  description: RichTextFieldValueSchema.optional(),
  links: z.object({
    self: z.string(),
    html: z.string(),
  }),
});

export const MemberSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// =============================================================================
// API Response Schemas
// =============================================================================

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    links: z.object({
      next: z.string().optional(),
    }),
  });

export const EntityResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: itemSchema,
  });

export const SearchResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    totalCount: z.number().optional(),
    links: z.object({
      next: z.string().optional(),
    }),
  });

// Concrete response schemas
export const FeatureListResponseSchema = PaginatedResponseSchema(FeatureSchema);
export const FeatureResponseSchema = EntityResponseSchema(FeatureSchema);
export const SubfeatureListResponseSchema = PaginatedResponseSchema(SubfeatureSchema);
export const SubfeatureResponseSchema = EntityResponseSchema(SubfeatureSchema);
export const ComponentListResponseSchema = PaginatedResponseSchema(ComponentSchema);
export const ProductListResponseSchema = PaginatedResponseSchema(ProductSchema);

// =============================================================================
// Error Response Schema
// =============================================================================

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

// =============================================================================
// Configuration Schemas
// =============================================================================

export const FieldTypeSchema = z.enum([
  'text',
  'richtext',
  'number',
  'boolean',
  'date',
  'datetime',
  'status',
  'member',
  'team',
  'singleSelect',
  'multiSelect',
  'entityReference',
]);

export const FieldOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});

export const FieldConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  type: FieldTypeSchema,
  required: z.boolean(),
  readOnly: z.boolean(),
  options: z.array(FieldOptionSchema).optional(),
});

export const EntityConfigurationSchema = z.object({
  type: EntityTypeSchema,
  fields: z.array(FieldConfigurationSchema),
});

// =============================================================================
// Relationship Schemas
// =============================================================================

export const RelationshipTypeSchema = z.enum([
  'parent',
  'component',
  'product',
  'initiative',
  'objective',
  'release',
]);

export const RelationshipSchema = z.object({
  id: z.string(),
  sourceEntity: EntityReferenceSchema,
  targetEntity: EntityReferenceSchema,
  relationshipType: RelationshipTypeSchema,
});

// =============================================================================
// Type Exports
// =============================================================================

export type FeatureResponse = z.infer<typeof FeatureSchema>;
export type SubfeatureResponse = z.infer<typeof SubfeatureSchema>;
export type ComponentResponse = z.infer<typeof ComponentSchema>;
export type ProductResponse = z.infer<typeof ProductSchema>;
export type MemberResponse = z.infer<typeof MemberSchema>;
export type TeamResponse = z.infer<typeof TeamSchema>;
