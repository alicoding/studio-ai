#!/bin/bash

echo "=== Testing SSE Bridge ==="

# Start async workflow
echo -e "\n1. Starting async workflow..."
RESPONSE=$(curl -s -X POST http://localhost:3456/api/invoke/async \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "role": "developer",
      "task": "Say hello world"
    },
    "projectId": "93b33a8b-dbc0-4b09-99ed-cb737239b409"
  }')

echo "Response: $RESPONSE"
THREAD_ID=$(echo $RESPONSE | jq -r '.threadId')
echo "Thread ID: $THREAD_ID"

# Connect to SSE stream in background with proper event parsing
echo -e "\n2. Connecting to SSE stream..."
(
  curl -N -H "Accept: text/event-stream" \
    http://localhost:3456/api/invoke/stream/$THREAD_ID 2>/dev/null | \
  while IFS= read -r line; do
    if [[ $line == data:* ]]; then
      # Extract the JSON data after "data: "
      json_data="${line#data: }"
      if [[ -n "$json_data" && "$json_data" != " " ]]; then
        echo "SSE Event: $json_data" | jq . 2>/dev/null || echo "SSE Event (raw): $json_data"
      fi
    fi
  done
) &

SSE_PID=$!

# Give workflow time to complete
echo -e "\n3. Waiting for workflow to complete..."
sleep 3

# Check final status
echo -e "\n4. Final status:"
curl -s http://localhost:3456/api/invoke-status/status/$THREAD_ID | jq .

# Kill SSE connection
kill $SSE_PID 2>/dev/null

echo -e "\n=== Test Complete ==="