/**
 * Tests for Zod schema validation
 * Run with: node tests/schema.test.js
 */

const { validateClassification, safeValidateClassification, FocusSummaryTypes } = require('../src/schema');

// Simple test framework
let passedTests = 0;
let failedTests = 0;

function assertTrue(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    failedTests++;
  }
}

function assertThrows(fn, testName) {
  try {
    fn();
    console.log(`❌ FAIL: ${testName} (should have thrown)`);
    failedTests++;
  } catch (error) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  }
}

console.log('\n🧪 Running Schema Validation Tests\n');

// Test: Valid classification
console.log('--- Valid Classifications ---');
const validClassification = {
  needs_reply: true,
  time_sensitive_score: 1.0,
  business_value_score: 1.0,
  focus_summary_type: 'Booking',
  reason: 'Urgent booking request'
};

try {
  const result = validateClassification(validClassification);
  assertTrue(result.needs_reply === true, 'Valid classification passes');
} catch (e) {
  assertTrue(false, 'Valid classification passes');
}

// Test: All focus types
console.log('\n--- All Focus Types Valid ---');
for (const type of FocusSummaryTypes) {
  const classification = { ...validClassification, focus_summary_type: type };
  try {
    validateClassification(classification);
    assertTrue(true, `Focus type "${type}" is valid`);
  } catch (e) {
    assertTrue(false, `Focus type "${type}" is valid`);
  }
}

// Test: Missing fields
console.log('\n--- Missing Fields ---');
assertThrows(
  () => validateClassification({}),
  'Empty object throws error'
);

assertThrows(
  () => validateClassification({ needs_reply: true }),
  'Missing time_sensitive_score throws error'
);

assertThrows(
  () => validateClassification({
    needs_reply: true,
    time_sensitive_score: 1.0
  }),
  'Missing business_value_score throws error'
);

// Test: Invalid types
console.log('\n--- Invalid Types ---');
assertThrows(
  () => validateClassification({
    ...validClassification,
    needs_reply: 'true' // string instead of boolean
  }),
  'needs_reply as string throws error'
);

assertThrows(
  () => validateClassification({
    ...validClassification,
    time_sensitive_score: '1.0' // string instead of number
  }),
  'time_sensitive_score as string throws error'
);

assertThrows(
  () => validateClassification({
    ...validClassification,
    focus_summary_type: 'InvalidType'
  }),
  'Invalid focus_summary_type throws error'
);

// Test: Out of range scores
console.log('\n--- Out of Range Scores ---');
assertThrows(
  () => validateClassification({
    ...validClassification,
    time_sensitive_score: 1.5
  }),
  'time_sensitive_score > 1.0 throws error'
);

assertThrows(
  () => validateClassification({
    ...validClassification,
    time_sensitive_score: -0.1
  }),
  'time_sensitive_score < 0.0 throws error'
);

assertThrows(
  () => validateClassification({
    ...validClassification,
    business_value_score: 2.0
  }),
  'business_value_score > 1.0 throws error'
);

assertThrows(
  () => validateClassification({
    ...validClassification,
    business_value_score: -1.0
  }),
  'business_value_score < 0.0 throws error'
);

// Test: Empty reason
console.log('\n--- Empty Reason ---');
assertThrows(
  () => validateClassification({
    ...validClassification,
    reason: ''
  }),
  'Empty reason throws error'
);

// Test: Safe parse
console.log('\n--- Safe Parse ---');
const safeResult = safeValidateClassification(validClassification);
assertTrue(safeResult.success === true, 'Safe parse succeeds for valid data');

const safeError = safeValidateClassification({ invalid: 'data' });
assertTrue(safeError.success === false, 'Safe parse fails for invalid data');
assertTrue(safeError.error !== undefined, 'Safe parse returns error object');

// Test: Boundary values
console.log('\n--- Boundary Values ---');
try {
  validateClassification({
    ...validClassification,
    time_sensitive_score: 0.0,
    business_value_score: 0.0
  });
  assertTrue(true, 'Minimum scores (0.0) are valid');
} catch (e) {
  assertTrue(false, 'Minimum scores (0.0) are valid');
}

try {
  validateClassification({
    ...validClassification,
    time_sensitive_score: 1.0,
    business_value_score: 1.0
  });
  assertTrue(true, 'Maximum scores (1.0) are valid');
} catch (e) {
  assertTrue(false, 'Maximum scores (1.0) are valid');
}

try {
  validateClassification({
    ...validClassification,
    time_sensitive_score: 0.5,
    business_value_score: 0.7
  });
  assertTrue(true, 'Mid-range scores are valid');
} catch (e) {
  assertTrue(false, 'Mid-range scores are valid');
}

// Test: Extra fields (should be allowed by default)
console.log('\n--- Extra Fields ---');
try {
  validateClassification({
    ...validClassification,
    extra_field: 'this should be ignored'
  });
  assertTrue(true, 'Extra fields are allowed (stripped)');
} catch (e) {
  assertTrue(false, 'Extra fields are allowed (stripped)');
}

console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);

if (failedTests > 0) {
  process.exit(1);
}

