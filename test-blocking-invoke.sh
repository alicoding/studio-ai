#!/bin/bash

echo "=== Testing Blocking Invoke ==="

# Test blocking invoke to see if it works
echo -e "\nTesting blocking invoke..."
curl -s -X POST http://localhost:3456/api/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "role": "developer", 
      "task": "Say hello"
    },
    "projectId": "93b33a8b-dbc0-4b09-99ed-cb737239b409"
  }' | jq .

echo -e "\n=== Test Complete ==="