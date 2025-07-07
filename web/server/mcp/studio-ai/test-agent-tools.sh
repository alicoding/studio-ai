#!/bin/bash
# Test script for MCP agent configuration tools

echo "=== Testing MCP Agent Configuration Tools ==="
echo "Make sure the MCP server is running in stable mode"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test function
test_mcp() {
    local test_name="$1"
    local tool_name="$2"
    local args="$3"
    
    echo "Testing: $test_name"
    echo "Tool: $tool_name"
    echo "Args: $args"
    
    # Run the test using the MCP CLI
    if npx @modelcontextprotocol/cli call \
        --server "studio-ai" \
        --tool "$tool_name" \
        --arguments "$args"; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
    else
        echo -e "${RED}✗ $test_name failed${NC}"
    fi
    echo "---"
}

# 1. List existing agents
echo "=== 1. List Existing Agents ==="
test_mcp "List all agents" "list_agents" '{}'

# 2. List agent configurations
echo -e "\n=== 2. List Agent Configurations ==="
test_mcp "List agent configs" "list_agent_configs" '{}'

# 3. Create a new agent
echo -e "\n=== 3. Create New Agent ==="
test_mcp "Create test agent" "create_agent" '{
  "name": "Test Code Reviewer",
  "role": "reviewer",
  "systemPrompt": "You are a code review specialist. Focus on code quality, best practices, and potential bugs.",
  "model": "claude-3-opus",
  "tools": ["read", "write", "grep"],
  "temperature": 0.5,
  "maxTokens": 150000
}'

# 4. Get the created agent (you'll need to replace the ID)
echo -e "\n=== 4. Get Agent Config ==="
echo "Note: You'll need to copy the agent ID from step 3 and update this test"
# test_mcp "Get specific agent" "get_agent_config" '{"id": "REPLACE_WITH_AGENT_ID"}'

# 5. Update the agent
echo -e "\n=== 5. Update Agent ==="
echo "Note: You'll need to copy the agent ID from step 3 and update this test"
# test_mcp "Update agent" "update_agent" '{
#   "id": "REPLACE_WITH_AGENT_ID",
#   "updates": {
#     "temperature": 0.7,
#     "systemPrompt": "Updated: You are an expert code reviewer focusing on security and performance."
#   }
# }'

# 6. List agents again to see the new one
echo -e "\n=== 6. List Agents Again ==="
test_mcp "List all agents after creation" "list_agent_configs" '{}'

echo -e "\n=== Test Summary ==="
echo "Manual steps needed:"
echo "1. Copy the agent ID from step 3"
echo "2. Uncomment and update steps 4 and 5 with the agent ID"
echo "3. Run the script again to test get/update/delete operations"
echo ""
echo "To delete the test agent:"
echo 'npx @modelcontextprotocol/cli call --server "studio-ai" --tool "delete_agent" --arguments "{\"id\": \"AGENT_ID\"}"'