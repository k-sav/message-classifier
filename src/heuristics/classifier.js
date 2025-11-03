/**
 * Heuristic message classification
 * Fast, rule-based classification using pattern matching
 */

const { BUSINESS_PATTERNS, TIME_PATTERNS, REPLY_PATTERNS } = require('./patterns');

/**
 * Classifies a message using heuristic pattern matching
 * @param {string} text - The message to classify
 * @returns {Object} - Classification result with null values for unmatched fields
 */
function heuristicClassify(text) {
  const lower = text.toLowerCase();
  const result = {
    business_value_score: null,
    time_sensitive_score: null,
    needs_reply: null,
    focus_summary_type: null,
    reason: null
  };

  // Business value scoring
  result.business_value_score = classifyBusinessValue(text, lower);
  result.focus_summary_type = classifyFocusType(text, lower);

  // Time sensitivity scoring
  result.time_sensitive_score = classifyTimeSensitivity(text, lower);

  // Reply needed
  result.needs_reply = classifyReplyNeeded(text, lower);

  return result;
}

/**
 * Determines business value score from message
 * @param {string} text - Original text
 * @param {string} lower - Lowercase text
 * @returns {number|null} - Business value score or null
 */
function classifyBusinessValue(text, lower) {
  // Check high value patterns
  for (const pattern of BUSINESS_PATTERNS.HIGH_VALUE.patterns) {
    if (testPattern(pattern, text, lower)) {
      return BUSINESS_PATTERNS.HIGH_VALUE.score;
    }
  }

  // Check medium-high value patterns
  for (const pattern of BUSINESS_PATTERNS.MEDIUM_HIGH_VALUE.patterns) {
    if (testPattern(pattern, text, lower)) {
      return BUSINESS_PATTERNS.MEDIUM_HIGH_VALUE.score;
    }
  }

  // Check medium value patterns
  for (const pattern of BUSINESS_PATTERNS.MEDIUM_VALUE.patterns) {
    if (testPattern(pattern, text, lower)) {
      return BUSINESS_PATTERNS.MEDIUM_VALUE.score;
    }
  }

  // Check low value patterns
  for (const pattern of BUSINESS_PATTERNS.LOW_VALUE.patterns) {
    if (testPattern(pattern, text, lower)) {
      return BUSINESS_PATTERNS.LOW_VALUE.score;
    }
  }

  return null;
}

/**
 * Determines focus/category type from message
 * @param {string} text - Original text
 * @param {string} lower - Lowercase text
 * @returns {string|null} - Focus type or null
 */
function classifyFocusType(text, lower) {
  // Check all business patterns for type
  for (const valueLevel of Object.values(BUSINESS_PATTERNS)) {
    for (const pattern of valueLevel.patterns) {
      if (testPattern(pattern, text, lower)) {
        return pattern.type;
      }
    }
  }

  return null;
}

/**
 * Determines time sensitivity score from message
 * @param {string} text - Original text
 * @param {string} lower - Lowercase text
 * @returns {number|null} - Time sensitivity score or null
 */
function classifyTimeSensitivity(text, lower) {
  // Check urgent patterns
  if (testPattern(TIME_PATTERNS.URGENT, text, lower)) {
    return TIME_PATTERNS.URGENT.score;
  }

  // Check soon patterns
  if (testPattern(TIME_PATTERNS.SOON, text, lower)) {
    return TIME_PATTERNS.SOON.score;
  }

  // Check planning patterns
  if (testPattern(TIME_PATTERNS.PLANNING, text, lower)) {
    return TIME_PATTERNS.PLANNING.score;
  }

  // Check casual patterns
  if (testPattern(TIME_PATTERNS.CASUAL, text, lower)) {
    return TIME_PATTERNS.CASUAL.score;
  }

  return null;
}

/**
 * Determines if message needs a reply
 * @param {string} text - Original text
 * @param {string} lower - Lowercase text
 * @returns {boolean|null} - Whether reply is needed or null
 */
function classifyReplyNeeded(text, lower) {
  // Check needs reply patterns
  if (testPattern(REPLY_PATTERNS.NEEDS_REPLY, text, lower)) {
    return REPLY_PATTERNS.NEEDS_REPLY.value;
  }

  // Check no reply patterns
  if (testPattern(REPLY_PATTERNS.NO_REPLY, text, lower)) {
    return REPLY_PATTERNS.NO_REPLY.value;
  }

  return null;
}

/**
 * Tests a pattern against text, checking both regex and optional condition
 * @param {Object} pattern - Pattern with regex and optional condition function
 * @param {string} text - Original text
 * @param {string} lower - Lowercase text
 * @returns {boolean} - Whether pattern matches
 */
function testPattern(pattern, text, lower) {
  if (!pattern.regex.test(lower)) {
    return false;
  }

  if (pattern.condition && !pattern.condition(text)) {
    return false;
  }

  return true;
}

/**
 * Checks if heuristic result is conclusive (all fields have values)
 * @param {Object} heuristic - Heuristic classification result
 * @returns {boolean} - Whether all required fields are non-null
 */
function isHeuristicConclusive(heuristic) {
  return heuristic.business_value_score !== null &&
         heuristic.time_sensitive_score !== null &&
         heuristic.needs_reply !== null &&
         heuristic.focus_summary_type !== null;
}

/**
 * Gets confidence score for heuristic classification (0.0 to 1.0)
 * @param {Object} heuristic - Heuristic classification result
 * @returns {number} - Confidence score
 */
function getHeuristicConfidence(heuristic) {
  let confidence = 0;
  if (heuristic.business_value_score !== null) confidence += 0.25;
  if (heuristic.time_sensitive_score !== null) confidence += 0.25;
  if (heuristic.needs_reply !== null) confidence += 0.25;
  if (heuristic.focus_summary_type !== null) confidence += 0.25;
  return confidence;
}

module.exports = {
  heuristicClassify,
  isHeuristicConclusive,
  getHeuristicConfidence,
  // Export individual functions for testing
  classifyBusinessValue,
  classifyFocusType,
  classifyTimeSensitivity,
  classifyReplyNeeded
};

