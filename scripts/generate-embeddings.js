/**
 * Generate embeddings for example messages
 * 
 * This script reads src/examples.json and generates embeddings for each message
 * using OpenAI's embeddings API. The results are saved to src/examples_with_embeddings.json
 * 
 * This only needs to run once (or when examples change)
 * 
 * Usage: node scripts/generate-embeddings.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use text-embedding-3-small for cost efficiency
// Cost: $0.02 per 1M tokens (~$0.00002 per message)
const EMBEDDING_MODEL = 'text-embedding-3-small';

async function generateEmbeddings() {
  console.log('🚀 Starting embedding generation...\n');

  // Read examples file
  const examplesPath = path.join(__dirname, '../src/examples.json');
  const examples = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));

  console.log(`📊 Found ${examples.examples.length} examples`);
  console.log(`🤖 Using model: ${EMBEDDING_MODEL}\n`);

  const examplesWithEmbeddings = [];
  let totalTokens = 0;

  // Generate embeddings for each example
  for (let i = 0; i < examples.examples.length; i++) {
    const example = examples.examples[i];
    const message = example.message;

    process.stdout.write(`Processing example ${i + 1}/${examples.examples.length}: "${message.substring(0, 50)}..."`);

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: message,
      });

      const embedding = response.data[0].embedding;
      totalTokens += response.usage.total_tokens;

      examplesWithEmbeddings.push({
        message: example.message,
        classification: example.classification,
        embedding: embedding
      });

      console.log(' ✓');
    } catch (error) {
      console.log(' ✗');
      console.error(`Error processing example ${i + 1}:`, error.message);
      process.exit(1);
    }
  }

  // Save results
  const outputPath = path.join(__dirname, '../src/examples_with_embeddings.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ examples: examplesWithEmbeddings }, null, 2),
    'utf8'
  );

  // Calculate cost (text-embedding-3-small: $0.02 per 1M tokens)
  const cost = (totalTokens / 1_000_000) * 0.02;

  console.log('\n✅ Embeddings generated successfully!');
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`📊 Total tokens used: ${totalTokens.toLocaleString()}`);
  console.log(`💰 Estimated cost: $${cost.toFixed(6)}`);
  console.log(`📏 Embedding dimension: ${examplesWithEmbeddings[0].embedding.length}`);
}

// Run the script
if (require.main === module) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable not set');
    console.error('Make sure you have a .env file with your OpenAI API key');
    process.exit(1);
  }

  generateEmbeddings().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { generateEmbeddings };

