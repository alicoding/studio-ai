#!/bin/bash
# Direct API test for agent and project tools

echo "=== Testing Claude Studio API directly ==="
echo ""

API_BASE="http://localhost:3456/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test function
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    echo "Method: $method"
    echo "Endpoint: $endpoint"
    
    if [ -n "$data" ]; then
        echo "Data: $data"
        response=$(curl -s -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X "$method" "$API_BASE$endpoint")
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Request successful${NC}"
        echo "Response: $response" | jq . 2>/dev/null || echo "Response: $response"
    else
        echo -e "${RED}✗ Request failed${NC}"
    fi
    echo "---"
}

# 1. List agents
echo -e "\n=== 1. List Agents ==="
test_api "List all agents" "GET" "/agents" ""

# 2. Create a test agent
echo -e "\n=== 2. Create Test Agent ==="
agent_data='{
  "name": "Test Code Reviewer",
  "role": "reviewer",
  "systemPrompt": "You are a code review specialist.",
  "model": "claude-3-opus",
  "tools": ["read", "write", "grep"],
  "temperature": 0.5,
  "maxTokens": 150000
}'
test_api "Create agent" "POST" "/agents" "$agent_data"

# 3. List projects
echo -e "\n=== 3. List Projects ==="
test_api "List all projects" "GET" "/projects" ""

# 4. Create a test project
echo -e "\n=== 4. Create Test Project ==="
project_data='{
  "name": "Test Project",
  "description": "A test project for MCP tools",
  "workspacePath": "/tmp/test-project",
  "activeAgents": [],
  "settings": {
    "envVars": {"TEST_VAR": "test_value"},
    "disabledTools": [],
    "mcpServers": ["filesystem"]
  }
}'
test_api "Create project" "POST" "/projects" "$project_data"

echo -e "\n=== Test Summary ==="
echo "Check the responses above to verify:"
echo "1. Agents API is working"
echo "2. Projects API is working"
echo "3. Both can create new entities"
echo ""
echo "To test MCP tools in Claude Desktop:"
echo "1. Make sure the MCP server is running"
echo "2. Open Claude Desktop"
echo "3. Use the MCP tools like: list_agents, create_agent, list_projects, etc."