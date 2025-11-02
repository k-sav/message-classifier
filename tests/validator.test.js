/**
 * Tests for input validation and sanitization
 * Run with: node tests/validator.test.js
 */

const { validateMessage, sanitizeMessage, containsSuspiciousContent, MAX_MESSAGE_LENGTH } = require('../src/heuristics/validator');

// Simple test framework
let passedTests = 0;
let failedTests = 0;

function assertEqual(actual, expected, testName) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    console.log(`  Expected:`, expected);
    console.log(`  Got:`, actual);
    failedTests++;
  }
}

function assertTrue(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    failedTests++;
  }
}

console.log('\n🧪 Running Validator Tests\n');

// Test: Valid message
const validResult = validateMessage('This is a valid message');
assertTrue(validResult.valid, 'Valid message passes validation');
assertEqual(validResult.sanitized, 'This is a valid message', 'Valid message sanitized correctly');

// Test: Null message
const nullResult = validateMessage(null);
assertEqual(nullResult.valid, false, 'Null message fails validation');
assertTrue(nullResult.error.includes('required'), 'Null message returns appropriate error');

// Test: Undefined message
const undefinedResult = validateMessage(undefined);
assertEqual(undefinedResult.valid, false, 'Undefined message fails validation');

// Test: Non-string message
const numberResult = validateMessage(123);
assertEqual(numberResult.valid, false, 'Number fails validation');
assertTrue(numberResult.error.includes('string'), 'Non-string returns type error');

// Test: Empty string
const emptyResult = validateMessage('');
assertEqual(emptyResult.valid, false, 'Empty string fails validation');

// Test: Whitespace only
const whitespaceResult = validateMessage('   \n\t   ');
assertEqual(whitespaceResult.valid, false, 'Whitespace-only message fails validation');

// Test: Message too long
const longMessage = 'a'.repeat(MAX_MESSAGE_LENGTH + 1);
const longResult = validateMessage(longMessage);
assertEqual(longResult.valid, false, 'Message exceeding max length fails validation');
assertTrue(longResult.error.includes('maximum length'), 'Too long message returns length error');

// Test: Message at max length
const maxMessage = 'a'.repeat(MAX_MESSAGE_LENGTH);
const maxResult = validateMessage(maxMessage);
assertTrue(maxResult.valid, 'Message at max length passes validation');

// Test: Sanitization - null bytes
const nullByteResult = sanitizeMessage('Hello\x00World');
assertEqual(nullByteResult, 'HelloWorld', 'Null bytes removed');

// Test: Sanitization - control characters
const controlCharsResult = sanitizeMessage('Hello\x01\x02\x03World');
assertEqual(controlCharsResult, 'HelloWorld', 'Control characters removed');

// Test: Sanitization - preserve newlines and tabs (converted to spaces)
const newlineResult = sanitizeMessage('Hello\n\nWorld\t\tTest');
assertEqual(newlineResult, 'Hello World Test', 'Multiple whitespace collapsed to single space');

// Test: Sanitization - trim whitespace
const trimResult = sanitizeMessage('  Hello World  ');
assertEqual(trimResult, 'Hello World', 'Leading and trailing whitespace trimmed');

// Test: Sanitization - emojis preserved
const emojiResult = sanitizeMessage('Great work! 🔥🎉');
assertEqual(emojiResult, 'Great work! 🔥🎉', 'Emojis preserved');

// Test: Suspicious content - script tags
const scriptTest = containsSuspiciousContent('<script>alert("xss")</script>');
assertTrue(scriptTest, 'Script tags detected as suspicious');

// Test: Suspicious content - excessive special chars
const specialCharsTest = containsSuspiciousContent('{{{{[[[[]]]]}}}}');
assertTrue(specialCharsTest, 'Excessive special characters detected as suspicious');

// Test: Normal content
const normalTest = containsSuspiciousContent('Hello! Can you help me?');
assertTrue(!normalTest, 'Normal message not flagged as suspicious');

// Test: Message with HTML (but not script)
const htmlTest = containsSuspiciousContent('Check out <b>this</b> product!');
assertTrue(!htmlTest, 'Simple HTML not flagged as suspicious');

// Test: XSS attempt in validation
const xssMessage = '<script>alert("xss")</script>Hello';
const xssResult = validateMessage(xssMessage);
assertTrue(xssResult.valid, 'XSS message still passes validation (sanitization handles it)');
assertEqual(xssResult.sanitized, '<script>alert("xss")</script>Hello', 'XSS content sanitized (control chars removed)');

// Test: Multiple spaces collapsed
const multiSpaceResult = sanitizeMessage('Hello     World     Test');
assertEqual(multiSpaceResult, 'Hello World Test', 'Multiple spaces collapsed');

// Test: Real-world message
const realMessage = '  Need to book you for Friday! ASAP please 🙏  \n\n  Budget: $2000  ';
const realResult = validateMessage(realMessage);
assertTrue(realResult.valid, 'Real-world message passes validation');
assertEqual(realResult.sanitized, 'Need to book you for Friday! ASAP please 🙏 Budget: $2000', 'Real-world message sanitized correctly');

console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);

if (failedTests > 0) {
  process.exit(1);
}

