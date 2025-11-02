/**
 * Pattern matching rules for heuristic message classification
 * These patterns can be easily updated and tested independently
 */

// Business value patterns and their scores
const BUSINESS_PATTERNS = {
  HIGH_VALUE: {
    score: 1.0,
    patterns: [
      {
        regex: /\b(book|booking|reserve|hire|event|gig|performance|rate)\b/i,
        type: 'Booking'
      },
      {
        regex: /\b(invoice|payment|paid|pay)\b/i,
        type: 'Invoice'
      },
      {
        regex: /\b(refund)\b/i,
        type: 'Refund'
      },
      {
        regex: /\b(contract)\b/i,
        type: 'Booking'
      }
    ]
  },
  MEDIUM_HIGH_VALUE: {
    score: 0.7,
    patterns: [
      {
        regex: /\b(collab\w*|partner\w*|work together)\b/i,
        type: 'Collab'
      },
      {
        regex: /\b(brand|sponsor\w*|campaign|ambassador|promot\w*|marketing)\b/i,
        type: 'Brand reaching'
      },
      {
        regex: /\b(feature|request|suggest\w*|add\w*|improvement|bug|issue)\b/i,
        type: 'Feature'
      },
      {
        regex: /\b(affiliate|commission|referral)\b/i,
        type: 'Affiliate'
      }
    ]
  },
  MEDIUM_VALUE: {
    score: 0.4,
    patterns: [
      {
        regex: /\b(shop|merch|discount|buy|purchase)\b/i,
        type: 'General'
      }
    ]
  },
  LOW_VALUE: {
    score: 0.0,
    patterns: [
      {
        regex: /\b(love|amazing|great|awesome|fantastic|excellent|beautiful|wonderful)\b/i,
        type: 'General',
        condition: (text) => !/\?/.test(text) // Only if no question
      }
    ]
  }
};

// Time sensitivity patterns and their scores
const TIME_PATTERNS = {
  URGENT: {
    score: 1.0,
    regex: /\b(today|tonight|asap|urgent|immediately|right now|by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)|by\s+end\s+of\s+(day|week)|\d{1,2}\/\d{1,2}|\d{1,2}:\d{2})\b/i
  },
  SOON: {
    score: 0.7,
    regex: /\b(next week|soon|confirm|shipped yet|when|deadline)\b/i
  },
  PLANNING: {
    score: 0.4,
    regex: /\b(how long|planning|schedule|rate|timeline)\b/i
  },
  CASUAL: {
    score: 0.0,
    regex: /\b(love|amazing|great|awesome|fantastic|excellent|beautiful|wonderful|thank|thanks|appreciate|congrat)\b/i,
    condition: (text) => !/\?/.test(text) // Only if no question
  }
};

// Reply indicators
const REPLY_PATTERNS = {
  NEEDS_REPLY: {
    value: true,
    regex: /\?|can you|would you|could you|please|let me know|confirm|need|want to|interested|available/i
  },
  NO_REPLY: {
    value: false,
    regex: /\b(love|thank|thanks|appreciate|congrat|awesome|amazing|great work)\b/i,
    condition: (text) => !/\?/.test(text) // Only if no question
  }
};

module.exports = {
  BUSINESS_PATTERNS,
  TIME_PATTERNS,
  REPLY_PATTERNS
};

