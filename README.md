# OpenAI Message Classifier

A Node.js Express API playground for classifying incoming chat messages using a **hybrid heuristic + LLM approach**. Perfect for testing message prioritization and categorization for creators and small businesses.

## Features

- ⚡ **Hybrid Classification** - Fast heuristic pattern matching with AI fallback
- 💰 **Cost Optimized** - Skips OpenAI API for obvious cases (saves money!)
- 🎯 **Smart Hints** - Passes partial matches to LLM for better context
- 🤖 **AI-Powered Fallback** - Uses GPT-4o-mini for edge cases
- 📊 **Structured Output** - Returns consistent JSON with urgency scores, business value, and categories
- 🔍 **Multiple Categories** - Supports Booking, Collab, Brand reaching, Feature, Invoice, Refund, Affiliate, and General

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

### Stage 3: LLM Fallback

When heuristics are incomplete, GPT-4o-mini provides nuanced classification with context awareness.

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

### 3. Start the Server

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
    "model": "gpt-4o-mini",
    "tokens_used": 245,
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

To modify classification rules, edit the `SYSTEM_PROMPT` in `server.js`. You can:

- Add new categories to `focus_summary_type`
- Adjust scoring criteria
- Change the temperature (0.0-1.0) for more/less consistent results
- Modify the JSON output structure

## Troubleshooting

**Invalid API Key Error**

- Ensure your `.env` file exists and contains a valid OpenAI API key
- Check that the key starts with `sk-`

**Port Already in Use**

- Change the `PORT` in your `.env` file
- Or kill the process using port 3000: `lsof -ti:3000 | xargs kill`

**Module Not Found**

- Run `yarn install` to install dependencies

## License

MIT
