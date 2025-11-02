/**
 * Input validation and sanitization for message classification
 * Protects against malicious input and ensures data quality
 */

const MAX_MESSAGE_LENGTH = 5000;

/**
 * Validates a message for classification
 * @param {*} message - The message to validate
 * @returns {Object} - { valid: boolean, error?: string, sanitized?: string }
 */
function validateMessage(message) {
  // Check if message exists
  if (message === null || message === undefined) {
    return {
      valid: false,
      error: 'Message is required'
    };
  }

  // Check type
  if (typeof message !== 'string') {
    return {
      valid: false,
      error: 'Message must be a string'
    };
  }

  // Check length before sanitization
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`
    };
  }

  // Sanitize the message
  const sanitized = sanitizeMessage(message);

  // Check if sanitized message is empty
  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'Message cannot be empty after sanitization'
    };
  }

  return {
    valid: true,
    sanitized
  };
}

/**
 * Sanitizes a message by removing dangerous characters
 * @param {string} message - The message to sanitize
 * @returns {string} - The sanitized message
 */
function sanitizeMessage(message) {
  if (typeof message !== 'string') {
    return '';
  }

  let sanitized = message;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove other control characters except newlines and tabs
  // Keep: \n (10), \r (13), \t (9)
  // Remove: 0-8, 11-12, 14-31, 127
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Collapse multiple spaces/newlines into single ones
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Checks if a message appears to contain malicious content
 * This is a simple check - in production you might want more sophisticated validation
 * @param {string} message - The message to check
 * @returns {boolean} - True if suspicious content detected
 */
function containsSuspiciousContent(message) {
  // Check for script tags
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(message)) {
    return true;
  }

  // Check for excessive special characters (potential injection)
  const specialCharCount = (message.match(/[<>{}[\]]/g) || []).length;
  const specialCharRatio = specialCharCount / message.length;
  if (specialCharRatio > 0.3) {
    return true;
  }

  return false;
}

module.exports = {
  validateMessage,
  sanitizeMessage,
  containsSuspiciousContent,
  MAX_MESSAGE_LENGTH
};

