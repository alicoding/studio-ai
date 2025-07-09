#!/bin/bash

echo "🧪 Testing Auto-Resume with Async Invoke"
echo ""

# Start async workflow
echo "1️⃣ Starting async workflow..."
RESPONSE=$(curl -s -X POST http://localhost:3457/api/invoke/async \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": [
      {
        "id": "step1",
        "role": "developer",
        "task": "Count from 1 to 10 slowly (1 second between numbers). Show each number. Output \"Step 1 complete\""
      },
      {
        "id": "step2",
        "role": "developer",
        "task": "Take {step1.output} and add \"Step 2 complete\"",
        "deps": ["step1"]
      },
      {
        "id": "step3",
        "role": "developer",
        "task": "Final step: Output \"All steps complete!\"",
        "deps": ["step2"]
      }
    ]
  }')

# Extract threadId
THREAD_ID=$(echo $RESPONSE | grep -o '"threadId":"[^"]*' | cut -d'"' -f4)

echo "📝 ThreadId: $THREAD_ID"
echo ""

# Wait a bit for workflow to start
echo "⏳ Waiting 5 seconds for workflow to start..."
sleep 5

# Check initial status
echo "2️⃣ Checking initial status..."
curl -s http://localhost:3457/api/invoke-status/status/$THREAD_ID | jq .
echo ""

# Restart server
echo "3️⃣ Restarting server to simulate crash..."
npm run env:restart:dev

# Wait for server to come back up
echo "⏳ Waiting 10 seconds for server to restart..."
sleep 10

# Check status after restart
echo "4️⃣ Checking status after restart..."
curl -s http://localhost:3457/api/invoke-status/status/$THREAD_ID | jq .
echo ""

# Monitor for auto-resume (2 minutes)
echo "5️⃣ Monitoring for auto-resume (checking every 10 seconds for 2.5 minutes)..."
echo ""

for i in {1..15}; do
  STATUS=$(curl -s http://localhost:3457/api/invoke-status/status/$THREAD_ID)
  WORKFLOW_STATUS=$(echo $STATUS | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  CURRENT_STEP=$(echo $STATUS | grep -o '"currentStep":"[^"]*' | cut -d'"' -f4)
  
  echo "[$i/15] Status: $WORKFLOW_STATUS, Current Step: $CURRENT_STEP"
  
  if [ "$WORKFLOW_STATUS" = "completed" ]; then
    echo ""
    echo "✅ Workflow auto-resumed and completed!"
    echo ""
    echo "Final status:"
    curl -s http://localhost:3457/api/invoke-status/status/$THREAD_ID | jq .
    exit 0
  fi
  
  if [ "$WORKFLOW_STATUS" = "running" ] && [ "$CURRENT_STEP" != "step1" ] && [ "$i" -gt 5 ]; then
    echo "🔄 Workflow appears to be resuming (moved past step1)"
  fi
  
  sleep 10
done

echo ""
echo "❌ Workflow did not auto-resume within timeout"
echo ""
echo "Final status:"
curl -s http://localhost:3457/api/invoke-status/status/$THREAD_ID | jq .

echo ""
echo "💡 You can manually resume with:"
echo "curl -X POST http://localhost:3457/api/invoke \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"threadId\": \"$THREAD_ID\", \"workflow\": [...same workflow...]}'"