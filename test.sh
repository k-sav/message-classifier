#!/bin/bash

# Simple test script for the OpenAI Message Classifier API

echo "🧪 Testing OpenAI Message Classifier API"
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

# Test 1: Urgent Booking
echo "📝 Test 1: Urgent Booking Request"
curl -s -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi! I need to book you for a corporate event this Friday evening. Can you confirm availability ASAP? Budget is $2000."}' | jq .

echo ""
echo "---"
echo ""

# Test 2: Casual Compliment
echo "📝 Test 2: Casual Compliment"
curl -s -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"message": "Just wanted to say your latest post was amazing! Keep up the great work! 🔥"}' | jq .

echo ""
echo "---"
echo ""

# Test 3: Invoice Follow-up
echo "📝 Test 3: Invoice Follow-up"
curl -s -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hey, I sent payment last week but haven'"'"'t received the invoice yet. Can you send it by end of day?"}' | jq .

echo ""
echo "=========================================="
echo "✅ Tests completed!"

