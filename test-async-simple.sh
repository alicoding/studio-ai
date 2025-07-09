#!/bin/bash

echo "1. Starting async workflow..."
RESPONSE=$(curl -s -X POST http://localhost:3456/api/invoke/async \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "role": "dev",
      "task": "Test async - say hello"
    },
    "projectId": "40cefd44-8ef0-472d-83b9-fbce7642e010"
  }')

echo "Response: $RESPONSE"
THREAD_ID=$(echo $RESPONSE | jq -r '.threadId')
echo "Thread ID: $THREAD_ID"

echo -e "\n2. Testing SSE stream (5 seconds)..."
timeout 5 curl -N http://localhost:3456/api/invoke/stream/$THREAD_ID

echo -e "\n\n3. Checking status..."
curl -s http://localhost:3456/api/invoke/status/$THREAD_ID | jq

echo -e "\n4. Running blocking invoke for comparison..."
curl -s -X POST http://localhost:3456/api/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "role": "dev", 
      "task": "Test blocking - say hello"
    },
    "projectId": "40cefd44-8ef0-472d-83b9-fbce7642e010"
  }' | jq '.results' | head -20