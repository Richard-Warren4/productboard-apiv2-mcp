/**
 * Manual test for Issue #1: Description formatting
 *
 * Tests that plain text descriptions are auto-wrapped in <p> tags
 * Run with: npx tsx tests/manual/test-description-formats.ts
 */

import { containsHtml, textToHtml, validateRichtext } from '../../src/utils/richtext.js';

console.log('=== Testing Description Formatting ===\n');

// Test cases
const testCases = [
  {
    name: 'Plain text (no HTML)',
    input: 'S3-compatible object storage API for enterprise applications',
    expectHtml: true,
  },
  {
    name: 'Text with newlines',
    input: 'First paragraph\n\nSecond paragraph',
    expectHtml: true,
  },
  {
    name: 'Already has HTML',
    input: '<p>Already formatted</p>',
    expectHtml: false, // Should not double-wrap
  },
  {
    name: 'Mixed - partial HTML',
    input: 'Some text with <b>bold</b> in it',
    expectHtml: false, // Has HTML, don't transform
  },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  console.log(`Test: ${tc.name}`);
  console.log(`  Input: "${tc.input.substring(0, 50)}${tc.input.length > 50 ? '...' : ''}"`);

  const hasHtml = containsHtml(tc.input);
  const output = hasHtml ? tc.input : textToHtml(tc.input);
  const validation = validateRichtext(output);

  console.log(`  Has HTML: ${hasHtml}`);
  console.log(`  Output: "${output.substring(0, 80)}${output.length > 80 ? '...' : ''}"`);
  console.log(`  Valid: ${validation.valid}`);

  // Check expectations
  const transformedToHtml = output !== tc.input;
  if (transformedToHtml === tc.expectHtml && validation.valid) {
    console.log(`  ✅ PASS\n`);
    passed++;
  } else {
    console.log(`  ❌ FAIL (expected transform: ${tc.expectHtml}, actual: ${transformedToHtml})\n`);
    failed++;
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
