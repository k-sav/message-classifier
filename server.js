require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { heuristicClassify, isHeuristicComplete } = require('./src/heuristics/classifier');
const { validateMessage } = require('./src/heuristics/validator');
const { validateClassification } = require('./src/schema');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// System prompt for classification
const SYSTEM_PROMPT = `You classify messages for a creator or small business.
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

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    message: 'OpenAI Message Classifier API',
    endpoints: {
      classify: 'POST /classify - Classify a message',
      health: 'GET /health - Health check'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Classification endpoint
app.post('/classify', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ 
        error: 'Missing required field: message' 
      });
    }

    // Validate and sanitize message
    const validation = validateMessage(message);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error
      });
    }

    const sanitizedMessage = validation.sanitized;

    console.log(`\n📨 Classifying message: "${sanitizedMessage.substring(0, 100)}${sanitizedMessage.length > 100 ? '...' : ''}"`);

    // Start timing
    const startTime = Date.now();

    // Step 1: Run heuristic classification
    const heuristic = heuristicClassify(sanitizedMessage);
    const isComplete = isHeuristicComplete(heuristic);

    console.log('🔍 Heuristic results:', JSON.stringify(heuristic, null, 2));

    // Step 2: Check if heuristic is complete
    if (isComplete) {
      // All values matched - use heuristic result, skip LLM
      const classification = {
        needs_reply: heuristic.needs_reply,
        time_sensitive_score: heuristic.time_sensitive_score,
        business_value_score: heuristic.business_value_score,
        focus_summary_type: heuristic.focus_summary_type,
        reason: `Pattern-matched as ${heuristic.focus_summary_type.toLowerCase()} with clear indicators`
      };

      console.log('⚡ Using heuristic (skipped LLM)');
      console.log('✅ Classification result:', JSON.stringify(classification, null, 2));

      const executionTime = Date.now() - startTime;
      console.log(`⏱️  Execution time: ${executionTime}ms`);

      return res.json({
        success: true,
        classification,
        metadata: {
          method: 'heuristic',
          execution_time_ms: executionTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Step 3: Partial or no match - use LLM with hints
    console.log('🤖 Using LLM (heuristic incomplete)');

    // Build user prompt with hints if available
    let userPrompt = `Message: <<<${sanitizedMessage}>>>`;
    
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

    if (hints.length > 0) {
      userPrompt += `\n\nHints (you may override if context suggests otherwise):\n${hints.join('\n')}`;
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    // Parse and validate the response with Zod
    let classification;
    try {
      const rawResponse = JSON.parse(completion.choices[0].message.content);
      classification = validateClassification(rawResponse);
    } catch (validationError) {
      console.error('❌ LLM response validation failed:', validationError.message);
      return res.status(500).json({
        error: 'Invalid classification response from LLM',
        details: validationError.message
      });
    }

    const executionTime = Date.now() - startTime;
    console.log('✅ Classification result:', JSON.stringify(classification, null, 2));
    console.log(`⏱️  Execution time: ${executionTime}ms`);

    res.json({
      success: true,
      classification,
      metadata: {
        method: 'llm',
        hints_provided: hints.length > 0,
        model: completion.model,
        tokens_used: completion.usage.total_tokens,
        execution_time_ms: executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Classification error:', error.message);
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ 
        error: 'Invalid OpenAI API key. Check your .env file.' 
      });
    }

    res.status(500).json({ 
      error: 'Classification failed',
      message: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 OpenAI Message Classifier running on http://localhost:${PORT}`);
  console.log(`📝 API Key configured: ${process.env.OPENAI_API_KEY ? '✓' : '✗'}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /classify - Classify a message`);
  console.log(`  GET  /health   - Health check\n`);
});

