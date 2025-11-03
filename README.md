# OpenAI Message Classifier

A Node.js Express API playground for classifying incoming chat messages using a **hybrid heuristic + LLM approach**. Perfect for testing message prioritization and categorization for creators and small businesses.

## Features

- ⚡ **Hybrid Classification** - Fast heuristic pattern matching with AI fallback
- 💰 **Cost Optimized** - Skips OpenAI API for obvious cases (saves money!)
- 🎯 **Smart Hints** - Passes partial matches to LLM for better context
- 🧠 **Few-Shot Learning** - Uses semantic embeddings to find similar examples for better accuracy
- 🤖 **AI-Powered Fallback** - Uses GPT-4o-mini for edge cases
- 📊 **Structured Output** - Returns consistent JSON with urgency scores, business value, and categories
- 🔍 **Multiple Categories** - Supports Booking, Collab, Brand reaching, Feature, Invoice, Refund, Affiliate, and General
- ✅ **Schema Validation** - Zod runtime validation ensures LLM responses match expected format

## How It Works

The classifier uses a **3-stage hybrid approach**:

### Stage 1: Heuristic Pattern Matching

Fast, deterministic rule-based matching using regex patterns:

- **Business keywords**: book, invoice, refund, collab, feature, affiliate, etc.
- **Urgency indicators**: ASAP, today, by Friday, specific dates/times
- **Reply signals**: question marks, "can you", "please", "confirm"

### Stage 2: Confidence Check

- ✅ **All values matched?** → Return heuristic result (skip LLM, save $$$)
- ⚠️ **Partial match?** → Pass hints to LLM (can override)
- ❌ **No match?** → Use LLM with standard prompt

### Stage 3: LLM Fallback (with Few-Shot Learning)

When heuristics are inconclusive, the system:

1. **Finds Similar Examples** - Uses OpenAI embeddings to find 3 semantically similar messages
2. **Builds Few-Shot Prompt** - Includes similar examples to guide the LLM
3. **Adds Hints** - Includes partial heuristic matches as suggestions
4. **Calls LLM** - GPT-4o-mini provides nuanced classification with full context

**Benefits:**
- 📈 Higher accuracy from relevant examples
- 🎯 More consistent outputs
- 💡 Handles edge cases better
- 💰 Minimal cost ($0.00002/message for embeddings)

### Examples

**Heuristic-only** (no LLM call):

```
"Need to book you for Friday ASAP! Can you confirm?"
→ Contains: "book" + "Friday" + "ASAP" + "confirm"
→ All values matched → Instant classification
```

**Hybrid** (LLM with hints):

```
"Love your work! Can we discuss a potential partnership?"
→ Heuristic: collab detected, but time sensitivity unclear
→ LLM called with hints to fill gaps
```

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=3000
```

### 3. Generate Embeddings (Optional but Recommended)

Generate embeddings for the example messages to enable few-shot learning:

```bash
yarn node scripts/generate-embeddings.js
```

This will:
- Read 30 curated examples from `src/examples.json`
- Generate embeddings using `text-embedding-3-small`
- Save to `src/examples_with_embeddings.json`
- Cost: ~$0.000008 (less than a penny!)

**Note:** This only needs to run once (or when examples change).

### 4. Start the Server

```bash
yarn start
```

Or use watch mode for development:

```bash
yarn dev
```

The server will start at `http://localhost:3000`

## API Usage

### Classify a Message

**Endpoint:** `POST /classify`

**Request:**

```bash
curl -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi! I need to book you for an event this Friday. Can you confirm ASAP?"}'
```

**Response:**

```json
{
  "success": true,
  "classification": {
    "needs_reply": true,
    "time_sensitive_score": 1.0,
    "business_value_score": 1.0,
    "focus_summary_type": "Booking",
    "reason": "Urgent booking request with specific date and ASAP confirmation needed"
  },
  "metadata": {
    "method": "llm",
    "hints_provided": true,
    "similar_examples_used": true,
    "similar_examples_count": 3,
    "model": "gpt-4o-mini",
    "tokens_used": 245,
    "execution_time_ms": 523,
    "timestamp": "2025-11-02T10:30:00.000Z"
  }
}
```

**Note:** If the heuristic fully classifies the message, `method` will be `"heuristic"` and no tokens will be used!

### Health Check

**Endpoint:** `GET /health`

```bash
curl http://localhost:3000/health
```

## Classification Schema

### Output Structure

```typescript
{
  needs_reply: boolean,           // Does this require a response?
  time_sensitive_score: number,   // 0.0 - 1.0 urgency rating
  business_value_score: number,   // 0.0 - 1.0 business importance
  focus_summary_type: string,     // Category of message
  reason: string                  // Brief explanation
}
```

### Score Guidelines

**Time Sensitivity:**

- `1.0` - Explicit urgency (ASAP, tonight, by Friday, specific deadline)
- `0.7` - Implied soon (next week, confirm, shipped yet)
- `0.4` - Planning/logistics (future coordination)
- `0.0` - No urgency (compliments, casual inquiries)

**Business Value:**

- `1.0` - Direct revenue impact (bookings, invoices, refunds)
- `0.7` - Growth opportunities (collabs, features, affiliates)
- `0.4` - General inquiries
- `0.0` - Social interactions (praise, casual chat)

### Message Categories

- **Booking** - Event/service booking requests
- **Collab** - Collaboration proposals
- **Brand reaching** - Brand partnership inquiries
- **Feature** - Feature requests or product feedback
- **Invoice** - Billing and payment matters
- **Refund** - Refund requests
- **Affiliate** - Affiliate program inquiries
- **General** - Everything else

## Testing with Sample Messages

The `test-messages.json` file contains 10 pre-written test cases covering all categories. Test them using curl:

```bash
# Urgent booking
curl -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi! I'"'"'d like to book you for a corporate event this Friday evening. We need a DJ from 7-11pm. Can you confirm availability ASAP? Budget is $2000."}'

# Casual compliment
curl -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"message": "Just wanted to say your latest post was amazing! Keep up the great work! 🔥"}'
```

## Model Selection

Currently using **GPT-4o-mini** for optimal balance of:

- ⚡ Speed - Fast response times
- 💰 Cost - ~15x cheaper than GPT-4o
- 🎯 Quality - Excellent for structured classification tasks

### Hybrid Approach Benefits

**Cost Savings:**

- Simple messages (e.g., "Need invoice ASAP") → $0.00 (heuristic-only)
- Complex messages → ~$0.001 per classification (LLM)
- Average savings: 40-60% fewer API calls

**Performance:**

- Heuristic: < 1ms response time
- LLM: 200-500ms response time
- Best of both worlds!

To switch models, edit `server.js` and change the model parameter:

```javascript
const completion = await openai.chat.completions.create({
  model: "gpt-4o", // or 'gpt-4o-mini', 'gpt-3.5-turbo'
  // ...
});
```

## Development

### Project Structure

```
.
├── server.js              # Main Express application
├── test-messages.json     # Sample test messages
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Environment template
└── README.md             # This file
```

### Customization

**Prompts:** Edit `src/prompts.js` to modify classification instructions:
- Add new categories to `focus_summary_type`
- Adjust scoring criteria
- Update rules and examples

**Model Settings:** Edit `server.js` to adjust:
- Model choice (gpt-4o-mini, gpt-4o, etc.)
- Temperature (0.0-1.0) for more/less consistent results
- Other OpenAI parameters

## Troubleshooting

**Invalid API Key Error**

- Ensure your `.env` file exists and contains a valid OpenAI API key
- Check that the key starts with `sk-`

**Port Already in Use**

- Change the `PORT` in your `.env` file
- Or kill the process using port 3000: `lsof -ti:3000 | xargs kill`

**Module Not Found**

- Run `yarn install` to install dependencies

## Testing

The project includes comprehensive unit tests for validation and heuristic classification logic.

### Run All Tests

```bash
# Run API integration tests
yarn test

# Run unit tests only
yarn test:units
```

### Test Files

- `tests/validator.test.js` - Input validation and sanitization tests
- `tests/heuristics.test.js` - Classification logic tests
- `tests/schema.test.js` - Zod schema validation tests
- `test-messages.json` - Sample messages including edge cases

### Test Coverage

Unit tests cover:

- All classification categories (Booking, Invoice, Refund, Collab, etc.)
- Time sensitivity scoring (urgent, soon, planning, casual)
- Business value scoring (high, medium, low)
- Reply detection
- Input validation (null, undefined, too long, empty)
- Sanitization (control characters, whitespace, emojis)
- Edge cases (XSS attempts, Unicode, excessive whitespace)
- **Schema validation** (type checking, range validation, required fields)

## Production Deployment

### SQS Integration

This classifier is designed to run as part of an existing application, processing messages from an SQS queue rather than exposing a REST endpoint.

**Typical Integration Flow:**

```javascript
// SQS Message Handler
async function handleSQSMessage(sqsEvent) {
  for (const record of sqsEvent.Records) {
    const message = JSON.parse(record.body);

    // Message structure from Stream Chat
    const {
      id: messageId, // Stream Chat message ID
      text: messageContent, // The actual message text
      type: eventType, // "message.new" or "message.updated"
      user,
      channel,
    } = message;

    // Classify the message
    const classification = await classifyMessage(messageContent);

    // Process based on classification
    if (
      classification.business_value_score >= 0.7 &&
      classification.time_sensitive_score >= 0.7
    ) {
      await notifyCreator(messageId, classification);
    }
  }
}
```

### Caching Strategy

**Important:** Implement caching to prevent duplicate classifications when SQS replays events.

**Cache Key Format:**

```
{stream_chat_message_id}_{eventType}
```

**Examples:**

- `msg_abc123_message.new` - New message event
- `msg_abc123_message.updated` - Message edited event

**Why This Matters:**

- SQS can deliver the same message multiple times
- Message edits (`message.updated`) should be reclassified
- New messages (`message.new`) only need one classification
- Prevents unnecessary OpenAI API calls (saves cost)

**Recommended Implementation:**

```javascript
// Pseudo-code for production caching
const cacheKey = `${messageId}_${eventType}`;
const cached = await redis.get(cacheKey);

if (cached) {
  console.log("Using cached classification");
  return JSON.parse(cached);
}

const classification = await classifyMessage(messageContent);

// Cache for 24 hours
await redis.setex(cacheKey, 86400, JSON.stringify(classification));

return classification;
```

**Cache Backend Options:**

- **Redis** - Fast, distributed, TTL support
- **DynamoDB** - Serverless, auto-scales, TTL support
- **ElastiCache** - Managed Redis/Memcached on AWS

**TTL Recommendations:**

- Development: 1 hour
- Production: 24 hours (prevents same-day duplicates)
- Extended: 7 days (if needed for historical data)

## Monitoring & Metrics

### Key Metrics to Track

**Classification Performance:**

- Heuristic hit rate (% using heuristic vs LLM)
- Average response time (heuristic vs LLM)
- Classification distribution by type
- Confidence scores over time

**Cost Optimization:**

- Total OpenAI API calls per day
- Total tokens consumed
- Cost per classification
- Savings from heuristic approach

**System Health:**

- Error rate
- Validation failures
- Messages per minute
- Queue depth (if using SQS)

### Sample Metrics Dashboard

```javascript
// Example metrics logging
const metrics = {
  timestamp: new Date().toISOString(),
  method: "heuristic", // or 'llm'
  execution_time_ms: 2,
  focus_type: "Booking",
  business_value: 1.0,
  time_sensitive: 1.0,
  tokens_used: 0, // 0 for heuristic, actual count for LLM
  message_length: 50,
};

// Send to monitoring service (CloudWatch, DataDog, etc.)
await metrics.log("message.classified", metrics);
```

### Alerting Thresholds

- **Error Rate** > 5% - Investigate immediately
- **LLM Usage** > 60% - Consider improving heuristics
- **Response Time** > 1000ms (p95) - Check API performance
- **Daily Token Limit** > 80% - Increase heuristic coverage

## Optimization

### Tuning Heuristics

The heuristic patterns are centralized in `src/heuristics/patterns.js` for easy updates:

```javascript
// Example: Add new booking keyword
BUSINESS_PATTERNS.HIGH_VALUE.patterns.push({
  regex: /\b(appointment|meeting)\b/i,
  type: "Booking",
});
```

**Optimization Process:**

1. Monitor classification results
2. Identify patterns that frequently go to LLM
3. Add/refine heuristic patterns
4. Test changes with unit tests
5. Deploy and measure improvement

### Confidence Thresholds

Adjust when to use LLM vs heuristics:

```javascript
const confidence = getHeuristicConfidence(heuristic);

// Current: Use heuristic only if 100% confident
if (confidence === 1.0) {
  /* use heuristic */
}

// Alternative: Use heuristic if 75%+ confident
if (confidence >= 0.75) {
  /* use heuristic */
}
```

### A/B Testing

Consider testing different approaches:

- **Heuristic-first** (current) vs **LLM-always**
- Different confidence thresholds
- Pattern variations
- Different LLM models (gpt-4o-mini vs gpt-4o)

### Pattern Refinement Tips

1. **Add domain-specific terms** - Industry jargon, slang
2. **Test with real data** - Use actual messages from your users
3. **Balance precision vs recall** - More patterns = more coverage but potential false positives
4. **Version control patterns** - Track changes and performance impact

## Architecture Notes

### Modular Design

The codebase is organized for portability:

```
/src
  /heuristics
    - classifier.js   # Pure classification logic
    - patterns.js     # Easy-to-update pattern rules
    - validator.js    # Input sanitization
  /utils
    - embeddings.js   # Semantic similarity utilities
  - schema.js         # Zod validation schemas
  - prompts.js        # LLM system prompts
  - examples.json     # Curated training examples
  - examples_with_embeddings.json  # Pre-computed embeddings
/scripts
  - generate-embeddings.js  # One-time embedding generator
server.js             # Express wrapper (can be removed)
```

**Benefits:**

- Import directly into your production app
- Test in isolation
- Update patterns without touching core logic
- No external dependencies (except OpenAI SDK and Zod)
- Runtime type safety with Zod

### Schema Validation with Zod

All LLM responses are validated at runtime using Zod:

```javascript
const { validateClassification } = require("./src/schema");

// Validates structure, types, ranges, and required fields
const classification = validateClassification(llmResponse);
```

**What Zod Catches:**

- Missing required fields
- Invalid types (string instead of boolean)
- Out-of-range scores (< 0 or > 1)
- Invalid category types
- Empty strings where not allowed

**Error Handling:**
If the LLM returns invalid data, the API returns a 500 error with details instead of crashing or returning malformed data.

### Few-Shot Learning with Embeddings

The system uses OpenAI embeddings for semantic similarity:

1. **Pre-computed Embeddings** - 30 curated examples are embedded once (cost: $0.000008)
2. **Runtime Similarity** - New messages are embedded and compared using cosine similarity
3. **Top-K Selection** - 3 most similar examples are included in the LLM prompt
4. **Context Aware** - LLM learns from relevant examples in real-time

**Cost Analysis:**
- Embedding generation (one-time): $0.000008
- Per-message embedding: $0.00002
- Total added cost per classification: ~$0.00002 (negligible)

**Accuracy Benefits:**
- ✅ More consistent classifications
- ✅ Better handling of edge cases
- ✅ Fewer misclassifications
- ✅ Learns from your specific domain examples

**How to Update Examples:**
1. Edit `src/examples.json` with new training examples
2. Run `yarn node scripts/generate-embeddings.js`
3. Restart the server

### Integration Example

```javascript
// In your production app
const {
  heuristicClassify,
  isHeuristicComplete,
} = require("./src/heuristics/classifier");
const { validateMessage } = require("./src/heuristics/validator");

async function processMessage(messageText) {
  // Validate
  const validation = validateMessage(messageText);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Try heuristic first
  const heuristic = heuristicClassify(validation.sanitized);

  if (isHeuristicComplete(heuristic)) {
    return formatResult(heuristic);
  }

  // Fallback to LLM
  return await classifyWithLLM(validation.sanitized, heuristic);
}
```

## License

MIT
