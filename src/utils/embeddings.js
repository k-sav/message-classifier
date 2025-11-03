/**
 * Embeddings utilities for semantic similarity search
 * Provides functions to compute similarity and find relevant examples
 */

const fs = require('fs');
const path = require('path');

// Load examples with embeddings on module initialization
let examplesWithEmbeddings = [];
try {
  const embeddingsPath = path.join(__dirname, '../examples_with_embeddings.json');
  const data = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
  examplesWithEmbeddings = data.examples;
  console.log(`✓ Loaded ${examplesWithEmbeddings.length} examples with embeddings`);
} catch (error) {
  console.warn('⚠️  Warning: Could not load examples_with_embeddings.json');
  console.warn('   Run: yarn node scripts/generate-embeddings.js');
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical direction
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} - Cosine similarity score
 */
function cosine(a, b) {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  const dot = a.reduce((sum, x, i) => sum + x * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const normB = Math.sqrt(b.reduce((s, x) => s + x * x, 0));

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (normA * normB);
}

/**
 * Get embedding vector for a text using OpenAI API
 * @param {string} text - Text to embed
 * @param {Object} openai - OpenAI client instance
 * @returns {Promise<number[]>} - Embedding vector
 */
async function getEmbedding(text, openai) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Find k most similar examples to the given message
 * @param {string} message - The message to find similar examples for
 * @param {number[]} messageEmbedding - Pre-computed embedding of the message
 * @param {number} k - Number of similar examples to return (default: 3)
 * @returns {Array} - Array of k most similar examples with similarity scores
 */
function findSimilarExamples(message, messageEmbedding, k = 3) {
  if (examplesWithEmbeddings.length === 0) {
    console.warn('⚠️  No examples loaded, returning empty array');
    return [];
  }

  // Calculate similarity scores for all examples
  const similarities = examplesWithEmbeddings.map(example => ({
    message: example.message,
    classification: example.classification,
    similarity: cosine(example.embedding, messageEmbedding)
  }));

  // Sort by similarity (highest first) and return top k
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

/**
 * Get the number of loaded examples
 * @returns {number} - Number of examples with embeddings
 */
function getExamplesCount() {
  return examplesWithEmbeddings.length;
}

/**
 * Check if embeddings are available
 * @returns {boolean} - True if examples are loaded
 */
function areEmbeddingsAvailable() {
  return examplesWithEmbeddings.length > 0;
}

module.exports = {
  cosine,
  getEmbedding,
  findSimilarExamples,
  getExamplesCount,
  areEmbeddingsAvailable
};

