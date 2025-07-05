#!/bin/bash
# Test script to verify MCP server starts correctly

echo "Testing Studio AI MCP Server..."

# Check if server can be started
timeout 5s node dist/index.js << EOF
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "test-client",
      "version": "1.0.0"
    }
  },
  "id": 1
}
EOF

if [ $? -eq 124 ]; then
  echo "✓ Server started successfully (timed out as expected)"
  exit 0
else
  echo "✗ Server failed to start"
  exit 1
fi