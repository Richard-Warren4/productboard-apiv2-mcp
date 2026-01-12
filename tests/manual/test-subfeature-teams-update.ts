/**
 * Direct test for Issue #4: Subfeature Team Update
 *
 * Run with: npx tsx tests/manual/test-subfeature-teams-update.ts
 */

import { createClient } from '../../src/client/api.js';

async function main() {
  if (!process.env.PRODUCTBOARD_API_TOKEN) {
    console.error('Error: PRODUCTBOARD_API_TOKEN environment variable is required');
    process.exit(1);
  }

  const client = createClient();

  console.log('=== Issue #4: Direct Subfeature Team Update Test ===\n');

  // 1. Find a feature with teams assigned to get a valid team ID
  console.log('1. Finding a feature with teams...');
  const features = await client.listFeatures();
  const featureWithTeams = features.data.find(
    (f) => f.fields.teams && f.fields.teams.length > 0
  );

  if (!featureWithTeams) {
    console.log('   No features with teams found. Cannot proceed.');
    return;
  }

  const teamId = featureWithTeams.fields.teams![0].id;
  const teamName = featureWithTeams.fields.teams![0].name;
  console.log(`   Found team: ${teamName} (${teamId})`);

  // 2. Find or create a subfeature to test with
  console.log('\n2. Finding a subfeature to test...');
  const subfeatures = await client.listSubfeatures(featureWithTeams.id);

  let testSubfeature;
  if (subfeatures.data.length > 0) {
    testSubfeature = subfeatures.data[0];
    console.log(`   Found existing subfeature: ${testSubfeature.fields.name}`);
  } else {
    console.log('   No subfeatures found, creating one...');
    const created = await client.createSubfeature({
      name: `Team Test Subfeature ${Date.now()}`,
      parent: { id: featureWithTeams.id },
    });
    testSubfeature = created.data;
    console.log(`   Created subfeature: ${testSubfeature.fields?.name || testSubfeature.id}`);
  }

  // If we just created it, fetch full details
  if (!testSubfeature.fields) {
    const fetched = await client.getEntity(testSubfeature.id);
    testSubfeature = fetched.data;
  }
  console.log(`   Current teams: ${JSON.stringify(testSubfeature.fields?.teams || 'none')}`);

  // 3. Try to update with teams
  console.log('\n3. Attempting to update subfeature with teams...');
  console.log(`   Setting teams to: [{id: "${teamId}"}]`);

  try {
    const updated = await client.updateEntity(testSubfeature.id, {
      teams: [{ id: teamId }],
    });

    console.log('   ✅ API accepted the update!');
    console.log(`   Response: ${JSON.stringify(updated.data, null, 2).substring(0, 500)}`);

    // Verify with a fresh fetch
    const verified = await client.getEntity(testSubfeature.id);
    console.log(`   Verified teams: ${JSON.stringify(verified.data.fields?.teams || 'none')}`);

    if (verified.data.fields?.teams && verified.data.fields.teams.length > 0) {
      console.log('\n   ✅ SUCCESS: Subfeature teams CAN be updated via API');
    } else {
      console.log('\n   ⚠️  Update accepted but teams not persisted');
    }
  } catch (error: any) {
    console.log('   ❌ API rejected the update');
    console.log(`   Error message: ${error.message}`);
    console.log(`   Full error: ${JSON.stringify(error, null, 2)}`);

    // Check if it's a validation error
    if (error.code === 'VALIDATION_ERROR' || error.httpStatus === 400) {
      console.log('\n   ❌ CONFIRMED: Subfeature teams CANNOT be updated via API');
      console.log('   This is an API limitation, not an MCP bug.');
    }
  }

  // 4. Alternative: Try with team name instead of ID
  console.log('\n4. Trying alternative format with team name...');
  try {
    await client.updateEntity(testSubfeature.id, {
      teams: [{ name: teamName }],
    });
    console.log('   ✅ Name-based update accepted');
  } catch (error: any) {
    console.log(`   ❌ Name-based update also failed: ${error.message}`);
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
