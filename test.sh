#!/bin/bash

# Simple test script for the OpenAI Message Classifier API

echo "🧪 Testing OpenAI Message Classifier API (Hybrid Mode)"
echo "=========================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ Server is not running!"
    echo "Please start the server first with: yarn start"
    exit 1
fi

echo "✓ Server is running"
echo ""

# Test 1: Urgent Booking (should use heuristic)
echo "📝 Test 1: Urgent Booking Request (expect: heuristic)"
RESULT=$(curl -s -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi! I need to book you for a corporate event this Friday evening. Can you confirm availability ASAP? Budget is $2000."}')
echo "$RESULT" | jq .
METHOD=$(echo "$RESULT" | jq -r '.metadata.method')
TIME=$(echo "$RESULT" | jq -r '.metadata.execution_time_ms')
echo "→ Method: $METHOD | Time: ${TIME}ms"

echo ""
echo "---"
echo ""

# Test 2: Casual Compliment (should use heuristic)
echo "📝 Test 2: Casual Compliment (expect: heuristic)"
RESULT=$(curl -s -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"message": "Just wanted to say your latest post was amazing! Keep up the great work! 🔥"}')
echo "$RESULT" | jq .
METHOD=$(echo "$RESULT" | jq -r '.metadata.method')
TIME=$(echo "$RESULT" | jq -r '.metadata.execution_time_ms')
echo "→ Method: $METHOD | Time: ${TIME}ms"

echo ""
echo "---"
echo ""

# Test 3: Invoice Follow-up (should use heuristic)
echo "📝 Test 3: Invoice Follow-up (expect: heuristic)"
RESULT=$(curl -s -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hey, I sent payment last week but haven'"'"'t received the invoice yet. Can you send it by end of day?"}')
echo "$RESULT" | jq .
METHOD=$(echo "$RESULT" | jq -r '.metadata.method')
TIME=$(echo "$RESULT" | jq -r '.metadata.execution_time_ms')
echo "→ Method: $METHOD | Time: ${TIME}ms"

echo ""
echo "---"
echo ""

# Test 4: Ambiguous message (might use LLM)
echo "📝 Test 4: Ambiguous Message (expect: llm with hints)"
RESULT=$(curl -s -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"message": "Love your work! Can we discuss something?"}')
echo "$RESULT" | jq .
METHOD=$(echo "$RESULT" | jq -r '.metadata.method')
TIME=$(echo "$RESULT" | jq -r '.metadata.execution_time_ms')
echo "→ Method: $METHOD | Time: ${TIME}ms"

echo ""
echo "=========================================="
echo "✅ Tests completed!"
echo ""
echo "💡 Performance Summary:"
echo "   Heuristic: ~1-5ms (instant, no API cost)"
echo "   LLM: ~200-800ms (network + processing)"
echo "   Speed improvement: 40-800x faster! 🚀"

