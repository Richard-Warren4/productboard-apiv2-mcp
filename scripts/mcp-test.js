/**
 * MCP Integration Test Script
 *
 * Tests the ProductBoard MCP tools by directly invoking API client methods.
 * This simulates what happens when an AI assistant invokes MCP tools.
 */

import { ProductBoardClient } from '../dist/client/api.js';

async function runTests() {
  const client = new ProductBoardClient({ apiToken: process.env.PRODUCTBOARD_API_TOKEN });
  const results = [];

  console.log('=== MCP INTEGRATION TESTS ===\n');

  // Test 1: pb_get_config(entityType: 'feature') - Single entity config
  console.log('Test 1: pb_get_config(entityType: "feature")');
  try {
    const config = await client.getEntityConfiguration('feature');
    const isObject = typeof config.data === 'object' && !Array.isArray(config.data);
    const hasType = config.data?.type === 'feature';
    const hasFields = typeof config.data?.fields === 'object';
    if (isObject && hasType && hasFields) {
      console.log('  ✅ PASS - Returns single object with type and fields');
      results.push({ test: 1, status: 'PASS' });
    } else {
      console.log('  ❌ FAIL - Unexpected structure');
      results.push({ test: 1, status: 'FAIL', error: 'Unexpected structure' });
    }
  } catch (e) {
    console.log('  ❌ FAIL -', e.message);
    results.push({ test: 1, status: 'FAIL', error: e.message });
  }

  // Test 2: pb_search_features with exact status name
  console.log('\nTest 2: pb_search_features(statusNames: ["In progress"])');
  try {
    const search = await client.searchFeatures({ statuses: [{ name: 'In progress' }] });
    console.log('  ✅ PASS - Found', search.data.length, 'features with status "In progress"');
    results.push({ test: 2, status: 'PASS', count: search.data.length });
  } catch (e) {
    console.log('  ❌ FAIL -', e.message);
    results.push({ test: 2, status: 'FAIL', error: e.message });
  }

  // Test 3: pb_entity_types (all configs)
  console.log('\nTest 3: pb_entity_types()');
  try {
    const allConfigs = await client.getEntityConfiguration();
    const configArray = Array.isArray(allConfigs.data) ? allConfigs.data : [allConfigs.data];
    const types = configArray.map(c => c.type);
    console.log('  ✅ PASS - Found', types.length, 'entity types:', types.join(', '));
    results.push({ test: 3, status: 'PASS', types });
  } catch (e) {
    console.log('  ❌ FAIL -', e.message);
    results.push({ test: 3, status: 'FAIL', error: e.message });
  }

  // Test 4: pb_get_relationships
  console.log('\nTest 4: pb_get_relationships(featureId)');
  try {
    const features = await client.listFeatures();
    if (features.data.length > 0) {
      const featureId = features.data[0].id;
      const rels = await client.getRelationships(featureId);
      const relArray = Array.isArray(rels.data) ? rels.data : [];
      const types = [...new Set(relArray.map(r => r.type))];
      console.log('  ✅ PASS - Feature', featureId.slice(0, 8) + '... has', relArray.length, 'relationships');
      if (types.length > 0) console.log('           Types:', types.join(', '));
      results.push({ test: 4, status: 'PASS', relationshipCount: relArray.length });
    } else {
      console.log('  ⚠️  SKIP - No features found');
      results.push({ test: 4, status: 'SKIP' });
    }
  } catch (e) {
    console.log('  ❌ FAIL -', e.message);
    results.push({ test: 4, status: 'FAIL', error: e.message });
  }

  // Test 5: pb_list_features
  console.log('\nTest 5: pb_list_features()');
  try {
    const features = await client.listFeatures();
    const hasNext = features.links.next ? 'yes' : 'no';
    console.log('  ✅ PASS - Listed', features.data.length, 'features, hasNext:', hasNext);
    results.push({ test: 5, status: 'PASS', count: features.data.length });
  } catch (e) {
    console.log('  ❌ FAIL -', e.message);
    results.push({ test: 5, status: 'FAIL', error: e.message });
  }

  // Test 6: Error handling - invalid status name
  console.log('\nTest 6: Error handling - invalid status name');
  try {
    await client.searchFeatures({ statuses: [{ name: 'NonExistentStatus123XYZ' }] });
    console.log('  ❌ FAIL - Should have thrown error');
    results.push({ test: 6, status: 'FAIL', error: 'Should have thrown' });
  } catch (e) {
    if (e.message.includes('not found') || e.code === 'VALIDATION_ERROR') {
      console.log('  ✅ PASS - Correctly returns error for invalid status');
      results.push({ test: 6, status: 'PASS' });
    } else {
      console.log('  ⚠️  WARN - Unexpected error:', e.message);
      results.push({ test: 6, status: 'WARN', error: e.message });
    }
  }

  // Test 7: Case sensitivity check
  console.log('\nTest 7: Case sensitivity - "In Progress" vs "In progress"');
  try {
    await client.searchFeatures({ statuses: [{ name: 'In Progress' }] });
    console.log('  ℹ️  INFO - "In Progress" worked (workspace may have this status)');
    results.push({ test: 7, status: 'INFO' });
  } catch (e) {
    if (e.message.includes('not found')) {
      console.log('  ✅ PASS - Correctly fails for wrong case ("In Progress")');
      results.push({ test: 7, status: 'PASS' });
    } else {
      console.log('  ℹ️  INFO -', e.message);
      results.push({ test: 7, status: 'INFO', error: e.message });
    }
  }

  // Test 8: pb_list_products
  console.log('\nTest 8: pb_list_products()');
  try {
    const products = await client.listProducts();
    console.log('  ✅ PASS - Listed', products.data.length, 'products');
    results.push({ test: 8, status: 'PASS', count: products.data.length });
  } catch (e) {
    console.log('  ❌ FAIL -', e.message);
    results.push({ test: 8, status: 'FAIL', error: e.message });
  }

  // Test 9: pb_entity_search for objectives
  console.log('\nTest 9: pb_entity_search(type: "objective")');
  try {
    const objectives = await client.searchEntities('objective');
    console.log('  ✅ PASS - Found', objectives.data.length, 'objectives');
    results.push({ test: 9, status: 'PASS', count: objectives.data.length });
  } catch (e) {
    console.log('  ❌ FAIL -', e.message);
    results.push({ test: 9, status: 'FAIL', error: e.message });
  }

  // Test 10: pb_get_entity (auto-detect type)
  console.log('\nTest 10: pb_get_entity(id) - auto-detect type');
  try {
    const features = await client.listFeatures();
    if (features.data.length > 0) {
      const entity = await client.getEntity(features.data[0].id);
      console.log('  ✅ PASS - Got entity of type:', entity.data.type);
      results.push({ test: 10, status: 'PASS' });
    } else {
      console.log('  ⚠️  SKIP - No features found');
      results.push({ test: 10, status: 'SKIP' });
    }
  } catch (e) {
    console.log('  ❌ FAIL -', e.message);
    results.push({ test: 10, status: 'FAIL', error: e.message });
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const other = results.filter(r => r.status !== 'PASS' && r.status !== 'FAIL').length;
  console.log('Passed:', passed, '| Failed:', failed, '| Other:', other);
  console.log('Overall:', failed === 0 ? '✅ ALL CORE TESTS PASSED' : '❌ SOME TESTS FAILED');

  return failed === 0;
}

runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(e => {
    console.error('Test runner error:', e);
    process.exit(1);
  });
