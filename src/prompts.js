/**
 * System prompts for OpenAI classification
 * Centralized for easy updates and testing
 */

/**
 * Main classification prompt for message categorization
 * Instructs the LLM to return structured JSON with specific fields and scoring rules
 */
const CLASSIFICATION_PROMPT = `You classify messages for a creator or small business.
Return STRICT JSON:
{
  "needs_reply": true | false,
  "time_sensitive_score": 0.0-1.0,
  "business_value_score": 0.0-1.0,
  "focus_summary_type": "Booking" | "Collab" | "Brand reaching" | "Feature" | "Invoice" | "Refund" | "Affiliate" | "General",
  "reason": "<short 1-sentence explanation>"
}

Rules:
- time_sensitive_score = 1.0 if explicit date/time or urgent term (tonight, ASAP, by Friday)
- 0.7 if implied soon (next week, confirm, shipped yet)
- 0.4 if planning/logistics
- 0.0 if no urgency (compliment, casual)
- business_value_score = 1.0 for bookings/invoices/refunds
                         0.7 for collabs/features
                         0.4 for general inquiries
                         0.0 for praise
- needs_reply = true if action/confirmation requested`;

/**
 * Builds hint suggestions from inconclusive heuristic results
 * Extracts non-null values to guide the LLM
 * @param {Object} heuristic - Heuristic classification result
 * @returns {string[]} Array of hint strings
 */
function buildHintsFromHeuristic(heuristic) {
  const hints = [];
  
  if (heuristic.business_value_score !== null) {
    hints.push(`Suggested business_value_score: ${heuristic.business_value_score}`);
  }
  if (heuristic.time_sensitive_score !== null) {
    hints.push(`Suggested time_sensitive_score: ${heuristic.time_sensitive_score}`);
  }
  if (heuristic.needs_reply !== null) {
    hints.push(`Suggested needs_reply: ${heuristic.needs_reply}`);
  }
  if (heuristic.focus_summary_type !== null) {
    hints.push(`Suggested focus_summary_type: ${heuristic.focus_summary_type}`);
  }
  
  return hints;
}

module.exports = {
  CLASSIFICATION_PROMPT,
  buildHintsFromHeuristic
};

