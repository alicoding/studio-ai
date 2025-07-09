#!/bin/bash

echo "=== Testing Async Workflow with SSE ==="

# Start async workflow
echo -e "\n1. Starting async workflow..."
RESPONSE=$(curl -s -X POST http://localhost:3456/api/invoke/async \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "role": "developer",
      "task": "Count from 1 to 3, saying each number"
    },
    "projectId": "93b33a8b-dbc0-4b09-99ed-cb737239b409"
  }')

echo "Response: $RESPONSE"
THREAD_ID=$(echo $RESPONSE | jq -r '.threadId')
echo "Thread ID: $THREAD_ID"

# Connect to SSE stream
echo -e "\n2. Connecting to SSE stream..."
(
  timeout 10 curl -N -H "Accept: text/event-stream" \
    http://localhost:3456/api/invoke/stream/$THREAD_ID 2>/dev/null | \
  while IFS= read -r line; do
    if [[ $line == data:* ]]; then
      echo "SSE Event: $line"
    fi
  done
) &

SSE_PID=$!

# Check status periodically
echo -e "\n3. Checking status every 2 seconds..."
for i in {1..3}; do
  sleep 2
  echo -e "\nStatus check $i:"
  curl -s http://localhost:3456/api/invoke-status/status/$THREAD_ID | jq '.status' 2>/dev/null || echo "Status: Not found"
done

# Final check
echo -e "\n4. Final status check..."
sleep 2
curl -s http://localhost:3456/api/invoke-status/status/$THREAD_ID | jq 2>/dev/null || echo "Status endpoint: Not found"

# Kill SSE connection
kill $SSE_PID 2>/dev/null

echo -e "\n=== Test Complete ==="