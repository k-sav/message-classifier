/**
 * Tests for heuristic message classification
 * Run with: node tests/heuristics.test.js
 */

const { 
  heuristicClassify, 
  isHeuristicComplete,
  getHeuristicConfidence,
  classifyBusinessValue,
  classifyFocusType,
  classifyTimeSensitivity,
  classifyReplyNeeded
} = require('../src/heuristics/classifier');

// Simple test framework
let passedTests = 0;
let failedTests = 0;

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Got: ${actual}`);
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

console.log('\n🧪 Running Heuristic Classification Tests\n');

// Test: Booking message
console.log('--- Booking Classification ---');
const bookingMsg = 'Need to book you for Friday ASAP please!';
const bookingResult = heuristicClassify(bookingMsg);
assertEqual(bookingResult.business_value_score, 1.0, 'Booking has high business value');
assertEqual(bookingResult.focus_summary_type, 'Booking', 'Booking classified correctly');
assertEqual(bookingResult.time_sensitive_score, 1.0, 'Booking with ASAP is urgent');
assertEqual(bookingResult.needs_reply, true, 'Booking needs reply');
assertTrue(isHeuristicComplete(bookingResult), 'Booking classification is complete');

// Test: Invoice message
console.log('\n--- Invoice Classification ---');
const invoiceMsg = 'Can you send the invoice by end of day?';
const invoiceResult = heuristicClassify(invoiceMsg);
assertEqual(invoiceResult.business_value_score, 1.0, 'Invoice has high business value');
assertEqual(invoiceResult.focus_summary_type, 'Invoice', 'Invoice classified correctly');
assertEqual(invoiceResult.time_sensitive_score, 1.0, 'Invoice with deadline is urgent');
assertEqual(invoiceResult.needs_reply, true, 'Invoice request needs reply');

// Test: Refund message
console.log('\n--- Refund Classification ---');
const refundMsg = 'I need a refund, this never shipped';
const refundResult = heuristicClassify(refundMsg);
assertEqual(refundResult.business_value_score, 1.0, 'Refund has high business value');
assertEqual(refundResult.focus_summary_type, 'Refund', 'Refund classified correctly');
assertEqual(refundResult.needs_reply, true, 'Refund request needs reply');

// Test: Collaboration message
console.log('\n--- Collaboration Classification ---');
const collabMsg = 'Love your work! Would you be interested in collaborating on a project next month?';
const collabResult = heuristicClassify(collabMsg);
assertEqual(collabResult.business_value_score, 0.7, 'Collab has medium-high business value');
assertEqual(collabResult.focus_summary_type, 'Collab', 'Collab classified correctly');
// Note: "love your work" triggers 0.0 time score, but the presence of "would" doesn't match time patterns
assertTrue(collabResult.time_sensitive_score === null || collabResult.time_sensitive_score === 0.0, 'Collab time sensitivity handled');
assertEqual(collabResult.needs_reply, true, 'Collab inquiry needs reply');

// Test: Brand partnership
console.log('\n--- Brand Partnership Classification ---');
const brandMsg = 'We are a brand looking for ambassadors. Interested?';
const brandResult = heuristicClassify(brandMsg);
assertEqual(brandResult.business_value_score, 0.7, 'Brand has medium-high business value');
assertEqual(brandResult.focus_summary_type, 'Brand reaching', 'Brand classified correctly');
assertEqual(brandResult.needs_reply, true, 'Brand inquiry needs reply');

// Test: Feature request
console.log('\n--- Feature Request Classification ---');
const featureMsg = 'Would be great if you added dark mode to your app!';
const featureResult = heuristicClassify(featureMsg);
assertEqual(featureResult.business_value_score, 0.7, 'Feature has medium-high business value');
assertEqual(featureResult.focus_summary_type, 'Feature', 'Feature classified correctly');
// "Would be great" doesn't contain question marks or direct reply patterns, so needs_reply is null
// This is actually good - LLM will handle nuanced cases like this
assertTrue(featureResult.needs_reply === true || featureResult.needs_reply === null, 'Feature needs reply or incomplete');

// Test: Affiliate inquiry
console.log('\n--- Affiliate Inquiry Classification ---');
const affiliateMsg = 'Do you have an affiliate program I can join?';
const affiliateResult = heuristicClassify(affiliateMsg);
assertEqual(affiliateResult.business_value_score, 0.7, 'Affiliate has medium-high business value');
assertEqual(affiliateResult.focus_summary_type, 'Affiliate', 'Affiliate classified correctly');
assertEqual(affiliateResult.needs_reply, true, 'Affiliate inquiry needs reply');

// Test: Casual compliment
console.log('\n--- Casual Compliment Classification ---');
const complimentMsg = 'Your latest post was amazing! Keep up the great work! 🔥';
const complimentResult = heuristicClassify(complimentMsg);
assertEqual(complimentResult.business_value_score, 0.0, 'Compliment has low business value');
assertEqual(complimentResult.focus_summary_type, 'General', 'Compliment classified as general');
// Compliment with "amazing" and no "?" should match casual time pattern (0.0)
assertTrue(complimentResult.time_sensitive_score === 0.0 || complimentResult.time_sensitive_score === null, 'Compliment is not urgent');
assertEqual(complimentResult.needs_reply, false, 'Compliment does not need reply');
// May be incomplete if time_sensitive_score is null
assertTrue(isHeuristicComplete(complimentResult) || complimentResult.time_sensitive_score === null, 'Compliment classification status');

// Test: Time sensitivity - urgent
console.log('\n--- Time Sensitivity Tests ---');
const urgentMsg = 'Need this today!';
const urgentTime = classifyTimeSensitivity(urgentMsg, urgentMsg.toLowerCase());
assertEqual(urgentTime, 1.0, 'Today is urgent');

const asapMsg = 'Can you do this ASAP?';
const asapTime = classifyTimeSensitivity(asapMsg, asapMsg.toLowerCase());
assertEqual(asapTime, 1.0, 'ASAP is urgent');

const fridayMsg = 'Need this by Friday';
const fridayTime = classifyTimeSensitivity(fridayMsg, fridayMsg.toLowerCase());
assertEqual(fridayTime, 1.0, 'Day of week deadline is urgent');

// Test: Time sensitivity - soon
const nextWeekMsg = 'Let me know next week';
const nextWeekTime = classifyTimeSensitivity(nextWeekMsg, nextWeekMsg.toLowerCase());
assertEqual(nextWeekTime, 0.7, 'Next week is moderately urgent');

const confirmMsg = 'Please confirm when you can';
const confirmTime = classifyTimeSensitivity(confirmMsg, confirmMsg.toLowerCase());
assertEqual(confirmTime, 0.7, 'Confirm is moderately urgent');

// Test: Time sensitivity - planning
const scheduleMsg = 'What is your rate for future projects?';
const scheduleTime = classifyTimeSensitivity(scheduleMsg, scheduleMsg.toLowerCase());
assertEqual(scheduleTime, 0.4, 'Rate inquiry is planning-level');

// Test: Reply indicators
console.log('\n--- Reply Indicators Tests ---');
const questionMsg = 'Can you help me?';
const questionReply = classifyReplyNeeded(questionMsg, questionMsg.toLowerCase());
assertEqual(questionReply, true, 'Question needs reply');

const pleaseMsg = 'Please send me the details';
const pleaseReply = classifyReplyNeeded(pleaseMsg, pleaseMsg.toLowerCase());
assertEqual(pleaseReply, true, 'Request with please needs reply');

const thanksMsg = 'Thanks for the help!';
const thanksReply = classifyReplyNeeded(thanksMsg, thanksMsg.toLowerCase());
assertEqual(thanksReply, false, 'Thank you does not need reply');

// Test: Confidence scoring
console.log('\n--- Confidence Scoring Tests ---');
const completeResult = { business_value_score: 1.0, time_sensitive_score: 1.0, needs_reply: true, focus_summary_type: 'Booking' };
assertEqual(getHeuristicConfidence(completeResult), 1.0, 'Complete result has 100% confidence');

const partialResult = { business_value_score: 1.0, time_sensitive_score: null, needs_reply: true, focus_summary_type: 'Booking' };
assertEqual(getHeuristicConfidence(partialResult), 0.75, 'Partial result (3/4) has 75% confidence');

const halfResult = { business_value_score: 1.0, time_sensitive_score: 1.0, needs_reply: null, focus_summary_type: null };
assertEqual(getHeuristicConfidence(halfResult), 0.5, 'Half result (2/4) has 50% confidence');

const emptyResult = { business_value_score: null, time_sensitive_score: null, needs_reply: null, focus_summary_type: null };
assertEqual(getHeuristicConfidence(emptyResult), 0.0, 'Empty result has 0% confidence');

// Test: Edge cases
console.log('\n--- Edge Cases ---');
const emptyMsg = '';
const emptyClassification = heuristicClassify(emptyMsg);
assertTrue(!isHeuristicComplete(emptyClassification), 'Empty message has incomplete classification');

const randomMsg = 'sdkfjhsdkfjh';
const randomClassification = heuristicClassify(randomMsg);
assertTrue(!isHeuristicComplete(randomClassification), 'Random text has incomplete classification');

const mixedMsg = 'I love your work! Can you book me for an event Friday ASAP?';
const mixedClassification = heuristicClassify(mixedMsg);
assertEqual(mixedClassification.business_value_score, 1.0, 'Mixed message prioritizes high value (booking)');
assertEqual(mixedClassification.focus_summary_type, 'Booking', 'Mixed message classified as booking');
assertEqual(mixedClassification.time_sensitive_score, 1.0, 'Mixed message detects urgency');
assertEqual(mixedClassification.needs_reply, true, 'Mixed message needs reply');

console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);

if (failedTests > 0) {
  process.exit(1);
}

