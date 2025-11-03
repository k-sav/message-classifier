require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { heuristicClassify, isHeuristicConclusive } = require('./src/heuristics/classifier');
const { validateMessage } = require('./src/heuristics/validator');
const { validateClassification } = require('./src/schema');
const { CLASSIFICATION_PROMPT, buildHintsFromHeuristic, buildPromptWithExamples } = require('./src/prompts');
const { getEmbedding, findSimilarExamples, areEmbeddingsAvailable } = require('./src/utils/embeddings');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

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
    const isConclusive = isHeuristicConclusive(heuristic);

    console.log('🔍 Heuristic results:', JSON.stringify(heuristic, null, 2));

    // Step 2: Check if heuristic is conclusive
    if (isConclusive) {
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

    // Step 3: Partial or no match - use LLM with embeddings and hints
    console.log('🤖 Using LLM (heuristic inconclusive)');

    // Get similar examples using embeddings
    let similarExamples = [];
    let usedEmbeddings = false;
    
    if (areEmbeddingsAvailable()) {
      try {
        console.log('🔍 Finding similar examples...');
        const messageEmbedding = await getEmbedding(sanitizedMessage, openai);
        similarExamples = findSimilarExamples(sanitizedMessage, messageEmbedding, 3);
        usedEmbeddings = true;
        console.log(`✓ Found ${similarExamples.length} similar examples (similarity: ${similarExamples.map(e => e.similarity.toFixed(3)).join(', ')})`);
      } catch (error) {
        console.warn('⚠️  Failed to get embeddings:', error.message);
      }
    }

    // Build user prompt with examples and hints
    const hints = buildHintsFromHeuristic(heuristic);
    const userPrompt = usedEmbeddings 
      ? buildPromptWithExamples(sanitizedMessage, similarExamples, hints)
      : `Message: <<<${sanitizedMessage}>>>${hints.length > 0 ? `\n\nHints (you may override if context suggests otherwise):\n${hints.join('\n')}` : ''}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: CLASSIFICATION_PROMPT
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
        similar_examples_used: usedEmbeddings,
        similar_examples_count: similarExamples.length,
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

