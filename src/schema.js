/**
 * Zod schemas for message classification
 * Provides runtime validation of LLM responses
 */

const { z } = require('zod');

/**
 * Valid focus/category types for messages
 */
const FocusSummaryTypes = [
  'Booking',
  'Collab',
  'Brand reaching',
  'Feature',
  'Invoice',
  'Refund',
  'Affiliate',
  'General'
];

/**
 * Schema for the classification response from LLM
 */
const ClassificationSchema = z.object({
  needs_reply: z.boolean({
    required_error: 'needs_reply is required',
    invalid_type_error: 'needs_reply must be a boolean'
  }),
  
  time_sensitive_score: z.number({
    required_error: 'time_sensitive_score is required',
    invalid_type_error: 'time_sensitive_score must be a number'
  })
    .min(0, 'time_sensitive_score must be >= 0')
    .max(1, 'time_sensitive_score must be <= 1'),
  
  business_value_score: z.number({
    required_error: 'business_value_score is required',
    invalid_type_error: 'business_value_score must be a number'
  })
    .min(0, 'business_value_score must be >= 0')
    .max(1, 'business_value_score must be <= 1'),
  
  focus_summary_type: z.enum(FocusSummaryTypes, {
    required_error: 'focus_summary_type is required',
    invalid_type_error: `focus_summary_type must be one of: ${FocusSummaryTypes.join(', ')}`
  }),
  
  reason: z.string({
    required_error: 'reason is required',
    invalid_type_error: 'reason must be a string'
  })
    .min(1, 'reason cannot be empty')
});

/**
 * Validates and parses a classification object
 * @param {unknown} data - Raw data to validate
 * @returns {object} Validated classification object
 * @throws {ZodError} if validation fails
 */
function validateClassification(data) {
  return ClassificationSchema.parse(data);
}

/**
 * Safely validates classification, returning result object
 * @param {unknown} data - Raw data to validate
 * @returns {object} Success or error result
 */
function safeValidateClassification(data) {
  return ClassificationSchema.safeParse(data);
}

module.exports = {
  ClassificationSchema,
  FocusSummaryTypes,
  validateClassification,
  safeValidateClassification
};

