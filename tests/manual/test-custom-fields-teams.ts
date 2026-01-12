/**
 * Manual test for Issue #2 (Custom Fields) and Issue #4 (Subfeature Teams)
 *
 * Run with: npx tsx tests/manual/test-custom-fields-teams.ts
 */

import { createClient } from '../../src/client/api.js';
import { buildCustomFieldMapping, transformCustomFields } from '../../src/utils/custom-fields.js';

async function main() {
  if (!process.env.PRODUCTBOARD_API_TOKEN) {
    console.error('Error: PRODUCTBOARD_API_TOKEN environment variable is required');
    process.exit(1);
  }

  const client = createClient();

  console.log('=== Issue #2: Custom Field Exposure ===\n');

  // 1. Get configuration to find custom fields
  console.log('1. Fetching feature configuration...');
  const config = await client.getEntityConfiguration('feature');
  const configData = Array.isArray(config.data) ? config.data[0] : config.data;

  // Build custom field mapping
  const mapping = buildCustomFieldMapping(configData.fields as any);
  console.log(`   Found ${mapping.byId.size} custom fields in config:`);
  for (const [id, field] of mapping.byId) {
    console.log(`   - ${field.name} (${field.type}): ${id}`);
  }

  // 2. Get a feature and check for custom fields in response
  console.log('\n2. Fetching a feature to check custom field values...');
  const features = await client.listFeatures();
  if (features.data.length === 0) {
    console.log('   No features found');
    return;
  }

  const feature = features.data[0];
  console.log(`   Feature: ${feature.fields.name}`);
  console.log(`   Fields keys: ${Object.keys(feature.fields).join(', ')}`);

  // Check for UUID keys (custom fields)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const customFieldKeys = Object.keys(feature.fields).filter((k) => uuidRegex.test(k));

  if (customFieldKeys.length > 0) {
    console.log(`\n   ✅ Found ${customFieldKeys.length} custom field values in API response:`);
    for (const key of customFieldKeys) {
      const fieldConfig = mapping.byId.get(key);
      const value = (feature.fields as any)[key];
      console.log(`   - ${fieldConfig?.name || key}: ${JSON.stringify(value)}`);
    }

    // Transform custom fields
    const transformed = transformCustomFields(feature.fields, mapping);
    console.log('\n   Transformed custom fields:', JSON.stringify(transformed, null, 2));
  } else {
    console.log('\n   ⚠️  No custom field UUIDs found in API response');
    console.log('   This may indicate:');
    console.log('   - No custom field values are set on this feature');
    console.log('   - API doesn\'t return custom field values in list/get responses');
    console.log('   - Custom fields need to be accessed differently');
  }

  // === Issue #4: Subfeature Teams ===
  console.log('\n\n=== Issue #4: Subfeature Team Assignment ===\n');

  // 1. Get subfeature configuration
  console.log('1. Fetching subfeature configuration...');
  const subConfig = await client.getEntityConfiguration('subfeature');
  const subConfigData = Array.isArray(subConfig.data) ? subConfig.data[0] : subConfig.data;

  // Check if teams field is available
  const fieldsArray = Array.isArray(subConfigData.fields)
    ? subConfigData.fields
    : Object.values(subConfigData.fields);

  const teamsField = fieldsArray.find((f: any) => f.name === 'teams' || f.displayName === 'Teams');

  if (teamsField) {
    console.log(`   ✅ Teams field found in subfeature config:`);
    console.log(`      - ID: ${teamsField.id}`);
    console.log(`      - Name: ${teamsField.name}`);
    console.log(`      - Read-only: ${teamsField.readOnly}`);

    if (teamsField.readOnly) {
      console.log('\n   ⚠️  Teams field is READ-ONLY for subfeatures');
      console.log('   This confirms Issue #4: Cannot assign teams to subfeatures via API');
    }
  } else {
    console.log('   ⚠️  Teams field NOT found in subfeature configuration');
    console.log('   Available fields:');
    fieldsArray.slice(0, 10).forEach((f: any) => {
      console.log(`   - ${f.name} (${f.type || 'unknown'}) ${f.readOnly ? '[read-only]' : ''}`);
    });
  }

  console.log('\n=== Tests Complete ===');
}

main().catch(console.error);
