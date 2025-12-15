/**
 * Manual Live Test: Create Feature and Subfeature with all fields
 *
 * Tests creating a feature and subfeature with:
 * - Team
 * - Owner
 * - Description
 * - Status (New)
 *
 * Run with: npx tsx tests/manual/test-create-with-fields.ts
 */

import { createClient } from '../../src/client/api.js';

async function main() {
  if (!process.env.PRODUCTBOARD_API_TOKEN) {
    console.error('Error: PRODUCTBOARD_API_TOKEN environment variable is required');
    process.exit(1);
  }

  const client = createClient();
  const timestamp = Date.now();

  console.log('='.repeat(60));
  console.log('Live MCP Test: Create Feature & Subfeature with Full Fields');
  console.log('='.repeat(60));

  try {
    // Step 1: Get available configurations to see what's available
    console.log('\n📋 Step 1: Fetching workspace configuration...');
    const config = await client.getEntityConfiguration('feature');
    console.log('  ✓ Configuration fetched');

    // Find status field options
    const featureConfig = Array.isArray(config.data)
      ? config.data.find(c => c.type === 'feature')
      : config.data;

    // Fields can be an array or an object keyed by field name
    const rawFields = featureConfig?.fields ?? [];
    const fields = Array.isArray(rawFields) ? rawFields : Object.values(rawFields);
    const statusField = fields.find((f: { name: string }) => f.name === 'status');
    const statusOptions = statusField?.options ?? [];

    console.log(`  Available statuses: ${statusOptions.map((o: { name: string }) => o.name).join(', ') || 'None found'}`);

    // Debug: Show available field names and IDs
    const fieldNames = fields.map((f: { name: string }) => f.name);
    console.log(`  Available fields: ${fieldNames.join(', ')}`);

    // Debug: Show field IDs (these are the actual API field names)
    console.log('  Field structure (id -> name):');
    for (const f of fields.slice(0, 10)) {
      const fAny = f as { id?: string; name: string; type?: string; readOnly?: boolean };
      console.log(`    ${fAny.id ?? 'no-id'} -> "${fAny.name}" (type: ${fAny.type ?? 'unknown'}, readOnly: ${fAny.readOnly ?? false})`);
    }

    // Check which fields are settable
    const settableFields = fields.filter((f: { readOnly?: boolean }) => !f.readOnly);
    console.log(`  Settable fields: ${settableFields.map((f: { name: string }) => f.name).join(', ')}`);

    // Step 2: List existing teams and find one to use
    console.log('\n👥 Step 2: Fetching available teams...');
    const features = await client.listFeatures();

    // Extract unique teams from existing features
    const teams = new Map<string, { id: string; name: string }>();
    for (const f of features.data) {
      if (f.fields.teams) {
        for (const t of f.fields.teams) {
          teams.set(t.id, t);
        }
      }
      if (f.fields.team) {
        teams.set(f.fields.team.id, f.fields.team);
      }
    }

    const teamList = Array.from(teams.values());
    console.log(`  Found ${teamList.length} teams: ${teamList.map(t => t.name).join(', ') || 'None'}`);

    // Extract unique owners from existing features
    const owners = new Map<string, { id: string; email: string; name?: string }>();
    for (const f of features.data) {
      if (f.fields.owner) {
        owners.set(f.fields.owner.id, f.fields.owner);
      }
    }

    const ownerList = Array.from(owners.values());
    console.log(`  Found ${ownerList.length} owners: ${ownerList.map(o => o.email).slice(0, 3).join(', ')}${ownerList.length > 3 ? '...' : ''}`);

    // Extract unique statuses from existing features
    const statuses = new Map<string, { id: string; name: string }>();
    for (const f of features.data) {
      if (f.fields.status) {
        statuses.set(f.fields.status.id, f.fields.status);
      }
    }
    const statusList = Array.from(statuses.values());
    console.log(`  Found ${statusList.length} statuses: ${statusList.map(s => s.name).join(', ')}`);

    // Get components to use as parent
    console.log('\n📦 Step 2b: Fetching available components...');
    const components = await client.listComponents({});
    console.log(`  Found ${components.data.length} components: ${components.data.slice(0, 5).map(c => c.name).join(', ')}${components.data.length > 5 ? '...' : ''}`);

    // Step 3: Create a feature with all fields
    console.log('\n🚀 Step 3: Creating feature with all fields...');

    const featureInput: Record<string, unknown> = {
      name: `MCP Test Feature ${timestamp}`,
      // Note: ProductBoard only allows: b, i, s, u, br, a, code, img (not strong/em)
      description: { value: '<p>This is a <b>test feature</b> created via MCP with full field support.</p>' },
    };

    // Add parent component (required in this workspace)
    if (components.data.length > 0) {
      featureInput.parent = { id: components.data[0].id };
      console.log(`  Using parent component: ${components.data[0].name}`);
    } else {
      console.log(`  Warning: No components found - feature creation may fail`);
    }

    // Check if teams field is settable (might be 'teams' or 'Teams' display name)
    const teamsFieldConfig = fields.find((f: { name: string }) =>
      f.name.toLowerCase() === 'teams' || f.name === 'Teams'
    );
    const teamFieldConfig = fields.find((f: { name: string }) =>
      f.name.toLowerCase() === 'team' || f.name === 'Team'
    );

    if (teamList.length > 0) {
      if (teamsFieldConfig && !teamsFieldConfig.readOnly) {
        // API v2 uses 'teams' array
        featureInput.teams = [{ id: teamList[0].id }];
        console.log(`  Using teams: [${teamList[0].name}]`);
      } else if (teamFieldConfig && !teamFieldConfig.readOnly) {
        featureInput.team = { id: teamList[0].id };
        console.log(`  Using team: ${teamList[0].name}`);
      } else {
        console.log(`  Note: team/teams field is read-only or not available`);
      }
    }

    // Check if owner field is settable (case-insensitive search)
    const ownerFieldConfig = fields.find((f: { name: string }) =>
      f.name.toLowerCase() === 'owner' || f.name === 'Owner'
    );
    if (ownerList.length > 0 && ownerFieldConfig && !ownerFieldConfig.readOnly) {
      featureInput.owner = { email: ownerList[0].email };
      console.log(`  Using owner: ${ownerList[0].email}`);
    } else if (ownerList.length > 0) {
      console.log(`  Note: owner field is read-only or not available`);
    }

    // Add status - try "New" or "New idea" first from discovered statuses
    const discoveredNewStatus = statusList.find(s =>
      s.name.toLowerCase() === 'new' || s.name.toLowerCase() === 'new idea'
    );
    const configNewStatus = statusOptions.find((s: { name: string }) =>
      s.name.toLowerCase() === 'new' || s.name.toLowerCase() === 'new idea'
    );

    if (discoveredNewStatus) {
      featureInput.status = { name: discoveredNewStatus.name };
      console.log(`  Using status: ${discoveredNewStatus.name} (from existing features)`);
    } else if (configNewStatus) {
      featureInput.status = { name: configNewStatus.name };
      console.log(`  Using status: ${configNewStatus.name} (from config)`);
    } else if (statusList.length > 0) {
      // Use first available status from existing features
      featureInput.status = { name: statusList[0].name };
      console.log(`  Using status: ${statusList[0].name} (first available)`);
    } else if (statusOptions.length > 0) {
      featureInput.status = { name: statusOptions[0].name };
      console.log(`  Using status: ${statusOptions[0].name} (from config)`);
    } else {
      console.log(`  Skipping status: No status values discovered`);
    }

    console.log('\n  Creating feature with input:', JSON.stringify(featureInput, null, 2));

    const createResponse = await client.createFeature(featureInput as never);

    // Fetch full feature details if response is minimal
    let feature = createResponse.data;
    if (!feature?.fields && feature?.id) {
      console.log('  Fetching full feature details...');
      const fetchResponse = await client.getFeature(feature.id);
      feature = fetchResponse.data;
    }

    console.log('\n  ✅ Feature created successfully!');
    console.log('  Feature ID:', feature.id);
    console.log('  Name:', feature.fields?.name);
    console.log('  Status:', feature.fields?.status?.name ?? 'Not set');
    console.log('  Team:', feature.fields?.teams?.[0]?.name ?? feature.fields?.team?.name ?? 'Not set');
    console.log('  Owner:', feature.fields?.owner?.email ?? 'Not set');
    console.log('  Description:', feature.fields?.description ? 'Set' : 'Not set');

    // Step 4: Create a subfeature under the new feature
    console.log('\n🔧 Step 4: Creating subfeature under the new feature...');

    const subfeatureInput: Record<string, unknown> = {
      name: `MCP Test Subfeature ${timestamp}`,
      parent: { id: feature.id },
      // Note: ProductBoard only allows: b, i, s, u, br, a, code, img (not em)
      description: { value: '<p>This is a <i>test subfeature</i> created via MCP.</p>' },
    };

    // Add status for subfeature (use same status as feature)
    if (discoveredNewStatus) {
      subfeatureInput.status = { name: discoveredNewStatus.name };
    } else if (statusList.length > 0) {
      subfeatureInput.status = { name: statusList[0].name };
    }

    console.log('\n  Creating subfeature with input:', JSON.stringify(subfeatureInput, null, 2));

    const subCreateResponse = await client.createSubfeature(subfeatureInput as never);

    // Fetch full subfeature details if response is minimal
    let subfeature = subCreateResponse.data;
    if (!subfeature?.fields && subfeature?.id) {
      console.log('  Fetching full subfeature details...');
      const fetchResponse = await client.getSubfeature(subfeature.id);
      subfeature = fetchResponse.data;
    }

    console.log('\n  ✅ Subfeature created successfully!');
    console.log('  Subfeature ID:', subfeature.id);
    console.log('  Name:', subfeature.fields?.name);
    console.log('  Status:', subfeature.fields?.status?.name ?? 'Not set');
    console.log('  Description:', subfeature.fields?.description ? 'Set' : 'Not set');
    console.log('  Parent Feature:', feature.id);

    // Step 5: Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE - All entities created successfully');
    console.log('='.repeat(60));
    console.log('\nCreated entities:');
    console.log(`  Feature: ${feature.fields?.name} (${feature.id})`);
    console.log(`  Subfeature: ${subfeature.fields?.name} (${subfeature.id})`);
    console.log('\nYou can view these in ProductBoard at:');
    console.log(`  Feature: ${feature.links?.html ?? feature.links?.self}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();
