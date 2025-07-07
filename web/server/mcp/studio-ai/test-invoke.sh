#!/bin/bash

# Test script for new invoke MCP tool

echo "Testing Studio AI MCP invoke tool..."

# Test 1: List available tools
echo -e "\n1. Listing available tools:"
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node dist/index.js 2>/dev/null | jq '.result.tools[] | select(.name | contains("invoke") or contains("get_roles")) | .name'

# Test 2: Get roles for a project
echo -e "\n2. Testing get_roles:"
cat <<EOF | node dist/index.js 2>/dev/null | jq '.result.content[0].content // .error'
{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_roles", "arguments": {"projectId": "test-project"}}, "id": 2}
EOF

# Test 3: Test invoke with single agent
echo -e "\n3. Testing invoke with single agent:"
cat <<EOF | node dist/index.js 2>/dev/null | jq '.result.content[0] // .error'
{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "invoke", "arguments": {"workflow": {"role": "developer", "task": "Hello"}, "projectId": "test", "format": "text"}}, "id": 3}
EOF

echo -e "\nTest complete!"