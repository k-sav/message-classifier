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
          content: `Message: <<<${message}>>>`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const classification = JSON.parse(completion.choices[0].message.content);

    console.log('✅ Classification result:', JSON.stringify(classification, null, 2));

    res.json({
      success: true,
      classification,
      metadata: {
        model: completion.model,
        tokens_used: completion.usage.total_tokens,
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

