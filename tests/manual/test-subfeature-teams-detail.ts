/**
 * Detailed test for Issue #4: Subfeature Team Assignment
 *
 * Run with: npx tsx tests/manual/test-subfeature-teams-detail.ts
 */

import { createClient } from '../../src/client/api.js';

async function main() {
  if (!process.env.PRODUCTBOARD_API_TOKEN) {
    console.error('Error: PRODUCTBOARD_API_TOKEN environment variable is required');
    process.exit(1);
  }

  const client = createClient();

  console.log('=== Issue #4: Subfeature Team Assignment - Detailed Investigation ===\n');

  // 1. Get subfeature configuration
  console.log('1. Fetching subfeature configuration...');
  const subConfig = await client.getEntityConfiguration('subfeature');
  const subConfigData = Array.isArray(subConfig.data) ? subConfig.data[0] : subConfig.data;

  // Raw fields dump
  console.log('\n   Raw fields structure:');
  const fields = subConfigData.fields;

  // If fields is an object keyed by ID
  if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
    console.log('   Fields is an object (keyed by field ID)');
    for (const [key, value] of Object.entries(fields)) {
      const field = value as any;
      console.log(`\n   ${field.name || key}:`);
      console.log(`     - id: ${field.id || key}`);
      console.log(`     - type/schema: ${field.type || field.schema || 'unknown'}`);
      console.log(`     - readOnly: ${field.readOnly}`);
      console.log(`     - required: ${field.required}`);
    }
  } else if (Array.isArray(fields)) {
    console.log('   Fields is an array');
    for (const field of fields) {
      console.log(`\n   ${field.name}:`);
      console.log(`     - id: ${field.id}`);
      console.log(`     - type/schema: ${field.type || field.schema || 'unknown'}`);
      console.log(`     - readOnly: ${field.readOnly}`);
      console.log(`     - required: ${field.required}`);
    }
  }

  // 2. Try to update a subfeature with teams
  console.log('\n\n2. Testing subfeature teams update...');

  // First, find a subfeature
  const features = await client.listFeatures();
  if (features.data.length === 0) {
    console.log('   No features found');
    return;
  }

  const parentId = features.data[0].id;
  const subfeatures = await client.listSubfeatures(parentId);

  if (subfeatures.data.length === 0) {
    console.log('   No subfeatures found for first feature');
    return;
  }

  const subfeature = subfeatures.data[0];
  console.log(`   Found subfeature: ${subfeature.fields.name} (${subfeature.id})`);
  console.log(`   Current teams: ${JSON.stringify(subfeature.fields.teams || 'none')}`);

  // Try to update with teams - need a valid team ID
  // Get feature config to find team options
  const featureConfig = await client.getEntityConfiguration('feature');
  const featureConfigData = Array.isArray(featureConfig.data) ? featureConfig.data[0] : featureConfig.data;
  const featureFields = featureConfigData.fields as any;

  let teamOptions: any[] = [];
  for (const [key, value] of Object.entries(featureFields)) {
    const field = value as any;
    if (field.name === 'Teams' || field.name === 'teams') {
      teamOptions = field.options || [];
      break;
    }
  }

  if (teamOptions.length === 0) {
    console.log('   No team options found in feature config');
    return;
  }

  console.log(`   Available teams: ${teamOptions.map((t: any) => t.name).join(', ')}`);

  // Try to update the subfeature with teams
  const testTeam = teamOptions[0];
  console.log(`\n   Attempting to set team to: ${testTeam.name} (${testTeam.id})`);

  try {
    await client.updateEntity(subfeature.id, {
      teams: [{ id: testTeam.id }],
    });
    console.log('   ✅ SUCCESS - Teams update accepted by API');

    // Verify the update
    const updated = await client.getEntity(subfeature.id);
    console.log(`   Updated teams: ${JSON.stringify(updated.data.fields.teams)}`);
  } catch (error: any) {
    console.log(`   ❌ FAILED - API rejected teams update`);
    console.log(`   Error: ${error.message}`);
    if (error.details) {
      console.log(`   Details: ${JSON.stringify(error.details)}`);
    }
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
