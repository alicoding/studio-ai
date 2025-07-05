#!/bin/bash
# Test script for mention API wait mode
# Tests both wait=true and wait=false modes

echo "🧪 Testing Mention API Wait Mode"
echo "================================"

# Base URL
BASE_URL="http://localhost:3004/api"

# Test data
PROJECT_ID="test-project-1"
FROM_AGENT="orchestrator"
TARGET_AGENT="dev-agent"

echo -e "\n1. Testing Non-Wait Mode (wait=false)"
echo "-------------------------------------"
echo "Sending mention without waiting for response..."

curl -X POST ${BASE_URL}/messages/mention \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"@${TARGET_AGENT} What is 2+2?\",
    \"fromAgentId\": \"${FROM_AGENT}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"wait\": false
  }" | jq '.'

echo -e "\n2. Testing Wait Mode (wait=true) with default timeout"
echo "------------------------------------------------------"
echo "Sending mention and waiting for response..."

START_TIME=$(date +%s)
curl -X POST ${BASE_URL}/messages/mention \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"@${TARGET_AGENT} What is 3+3?\",
    \"fromAgentId\": \"${FROM_AGENT}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"wait\": true
  }" | jq '.'
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Response received in ${DURATION} seconds"

echo -e "\n3. Testing Wait Mode with custom timeout (5 seconds)"
echo "----------------------------------------------------"
echo "Sending mention with 5 second timeout..."

START_TIME=$(date +%s)
curl -X POST ${BASE_URL}/messages/mention \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"@${TARGET_AGENT} Tell me a long story\",
    \"fromAgentId\": \"${FROM_AGENT}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"wait\": true,
    \"timeout\": 5000
  }" | jq '.'
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Response received in ${DURATION} seconds"

echo -e "\n4. Testing Multiple Mentions with Wait Mode"
echo "-------------------------------------------"
echo "Sending mention to multiple agents..."

curl -X POST ${BASE_URL}/messages/mention \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"@dev-agent Calculate 4+4 @test-agent Calculate 5+5\",
    \"fromAgentId\": \"${FROM_AGENT}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"wait\": true,
    \"timeout\": 10000
  }" | jq '.'

echo -e "\n5. Testing Timeout Scenario"
echo "---------------------------"
echo "Sending mention with very short timeout (1 second)..."

curl -X POST ${BASE_URL}/messages/mention \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"@${TARGET_AGENT} Perform a complex calculation that takes time\",
    \"fromAgentId\": \"${FROM_AGENT}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"wait\": true,
    \"timeout\": 1000
  }" | jq '.'

echo -e "\n✅ All tests completed!"