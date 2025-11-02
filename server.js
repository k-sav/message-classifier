require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// Heuristic classification function
function heuristicClassify(text) {
  const lower = text.toLowerCase();
  const result = {
    business_value_score: null,
    time_sensitive_score: null,
    needs_reply: null,
    focus_summary_type: null,
    reason: null
  };

  // Business value scoring based on keywords
  if (/\b(book|booking|reserve|hire|event|gig|performance|rate|invoice|payment|refund|paid|pay|contract)\b/.test(lower)) {
    result.business_value_score = 1.0;
    if (/\b(book|booking|reserve|hire|event|gig|performance)\b/.test(lower)) {
      result.focus_summary_type = 'Booking';
    } else if (/\b(invoice|payment|paid|pay)\b/.test(lower)) {
      result.focus_summary_type = 'Invoice';
    } else if (/\b(refund)\b/.test(lower)) {
      result.focus_summary_type = 'Refund';
    }
  } else if (/\b(collab|collaborate|collaboration|partner|partnership|work together)\b/.test(lower)) {
    result.business_value_score = 0.7;
    result.focus_summary_type = 'Collab';
  } else if (/\b(brand|sponsor|campaign|ambassador|promote|marketing)\b/.test(lower)) {
    result.business_value_score = 0.7;
    result.focus_summary_type = 'Brand reaching';
  } else if (/\b(feature|request|suggest|add|improvement|bug|issue)\b/.test(lower)) {
    result.business_value_score = 0.7;
    result.focus_summary_type = 'Feature';
  } else if (/\b(affiliate|commission|promote|referral)\b/.test(lower)) {
    result.business_value_score = 0.7;
    result.focus_summary_type = 'Affiliate';
  } else if (/\b(shop|merch|discount|buy|purchase)\b/.test(lower)) {
    result.business_value_score = 0.4;
  } else if (/\b(love|amazing|great|awesome|fantastic|excellent|beautiful|wonderful)\b/.test(lower) && !/\?/.test(text)) {
    result.business_value_score = 0.0;
    result.focus_summary_type = 'General';
  }

  // Time sensitivity scoring
  if (/\b(today|tonight|asap|urgent|immediately|right now|by\s+(monday|tuesday|wednesday|thursday|friday|mon|tue|wed|thu|fri)|by\s+end\s+of\s+(day|week)|\d{1,2}\/\d{1,2}|\d{1,2}:\d{2})\b/.test(lower)) {
    result.time_sensitive_score = 1.0;
  } else if (/\b(next week|soon|confirm|shipped yet|when|deadline)\b/.test(lower)) {
    result.time_sensitive_score = 0.7;
  } else if (/\b(how long|planning|schedule|rate|timeline)\b/.test(lower)) {
    result.time_sensitive_score = 0.4;
  } else if (/\b(love|thank|thanks|appreciate|congrat)\b/.test(lower) && !/\?/.test(text)) {
    result.time_sensitive_score = 0.0;
  }

  // Reply needed
  if (/\?|can you|would you|could you|please|let me know|confirm|need|want to|interested|available/.test(lower)) {
    result.needs_reply = true;
  } else if (/\b(love|thank|thanks|appreciate|congrat|awesome|amazing|great work)\b/.test(lower) && !/\?/.test(text)) {
    result.needs_reply = false;
  }

  // Default to General if no specific type matched
  if (result.focus_summary_type === null && result.business_value_score !== null) {
    result.focus_summary_type = 'General';
  }

  return result;
}

// Check if heuristic result is complete
function isHeuristicComplete(heuristic) {
  return heuristic.business_value_score !== null &&
         heuristic.time_sensitive_score !== null &&
         heuristic.needs_reply !== null &&
         heuristic.focus_summary_type !== null;
}

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

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Message must be a non-empty string' 
      });
    }

    console.log(`\n📨 Classifying message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);

    // Start timing
    const startTime = Date.now();

    // Step 1: Run heuristic classification
    const heuristic = heuristicClassify(message);
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
    let userPrompt = `Message: <<<${message}>>>`;
    
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

    const classification = JSON.parse(completion.choices[0].message.content);

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

