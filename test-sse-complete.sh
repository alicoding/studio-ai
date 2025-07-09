#!/bin/bash

echo "=== Testing Complete SSE Integration ==="

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

# Connect to SSE stream and collect events
echo -e "\n2. Connecting to SSE stream..."
echo "Collecting events for 10 seconds..."

# Collect SSE events for 10 seconds
(
  timeout 10 curl -N -H "Accept: text/event-stream" \
    http://localhost:3456/api/invoke/stream/$THREAD_ID 2>/dev/null | \
  while IFS= read -r line; do
    if [[ $line == data:* ]]; then
      json_data="${line#data: }"
      if [[ -n "$json_data" && "$json_data" != " " ]]; then
        timestamp=$(date +"%H:%M:%S")
        echo "[$timestamp] Event: $json_data"
      fi
    fi
  done
) &

SSE_PID=$!

# Wait for events
sleep 10

# Check final status
echo -e "\n3. Final status:"
curl -s http://localhost:3456/api/invoke-status/status/$THREAD_ID | jq .

# Clean up
kill $SSE_PID 2>/dev/null

echo -e "\n=== Test Complete ==="