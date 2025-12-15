/**
 * Entity Discovery Script
 *
 * Discovers all entity types available in the ProductBoard workspace
 * and their field configurations.
 *
 * Run with: npx tsx tests/manual/discover-entities.ts
 */

import { createClient } from '../../src/client/api.js';

async function main() {
  if (!process.env.PRODUCTBOARD_API_TOKEN) {
    console.error('Error: PRODUCTBOARD_API_TOKEN environment variable is required');
    process.exit(1);
  }

  const client = createClient();

  console.log('='.repeat(70));
  console.log('ProductBoard Entity Discovery');
  console.log('='.repeat(70));

  try {
    // Fetch all entity configurations
    console.log('\n📋 Fetching all entity configurations...\n');
    const config = await client.getEntityConfiguration();

    console.log(`Found ${config.data.length} entity types:\n`);

    for (const entityConfig of config.data) {
      const fields = Array.isArray(entityConfig.fields)
        ? entityConfig.fields
        : Object.values(entityConfig.fields);

      const settableFields = fields.filter((f: { readOnly?: boolean }) => !f.readOnly);
      const requiredFields = fields.filter((f: { required?: boolean }) => f.required);

      console.log('─'.repeat(70));
      console.log(`\n🔹 ${entityConfig.type.toUpperCase()}`);
      console.log(`   Total fields: ${fields.length}`);
      console.log(`   Settable fields: ${settableFields.length}`);
      console.log(`   Required fields: ${requiredFields.length}`);

      // Show field summary
      console.log('\n   Fields:');
      for (const field of fields.slice(0, 15)) {
        const f = field as {
          id?: string;
          name: string;
          type?: string;
          required?: boolean;
          readOnly?: boolean;
          options?: Array<{ name: string }>;
        };
        const flags = [];
        if (f.required) flags.push('required');
        if (f.readOnly) flags.push('read-only');
        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        const optionsStr = f.options?.length ? ` (${f.options.length} options)` : '';
        console.log(`     - ${f.id ?? 'no-id'}: "${f.name}" (${f.type ?? 'unknown'})${flagStr}${optionsStr}`);
      }
      if (fields.length > 15) {
        console.log(`     ... and ${fields.length - 15} more fields`);
      }

      // Show status options if available
      const statusField = fields.find((f: { id?: string; name: string }) =>
        f.id === 'status' || f.name.toLowerCase() === 'status'
      ) as { options?: Array<{ id: string; name: string }> } | undefined;

      if (statusField?.options?.length) {
        console.log('\n   Status options:');
        for (const opt of statusField.options) {
          console.log(`     - "${opt.name}" (${opt.id})`);
        }
      }
    }

    // Summary table
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log('\n| Entity Type      | Fields | Settable | Required |');
    console.log('|------------------|--------|----------|----------|');

    for (const entityConfig of config.data) {
      const fields = Array.isArray(entityConfig.fields)
        ? entityConfig.fields
        : Object.values(entityConfig.fields);

      const settable = fields.filter((f: { readOnly?: boolean }) => !f.readOnly).length;
      const required = fields.filter((f: { required?: boolean }) => f.required).length;

      const type = entityConfig.type.padEnd(16);
      const fieldsStr = String(fields.length).padStart(6);
      const settableStr = String(settable).padStart(8);
      const requiredStr = String(required).padStart(8);

      console.log(`| ${type} | ${fieldsStr} | ${settableStr} | ${requiredStr} |`);
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('  Message:', error.message);
    }
    process.exit(1);
  }
}

main();
