#!/bin/bash

echo "Testing Resume Indicators Feature"
echo "================================="

# Create a workflow that will have a failed step (simulating a failure)
echo "Creating test workflow with a step that will fail..."

# First, let's create a simple workflow
RESPONSE=$(curl -s -X POST http://localhost:3457/api/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": [
      {
        "id": "step1",
        "role": "dev",
        "task": "Create a hello world function"
      },
      {
        "id": "step2", 
        "role": "dev",
        "task": "This step will fail - implement a function that throws an error",
        "deps": ["step1"]
      },
      {
        "id": "step3",
        "role": "dev", 
        "task": "This step should not execute due to step2 failure",
        "deps": ["step2"]
      }
    ]
  }')

# Extract threadId from response
THREAD_ID=$(echo $RESPONSE | jq -r '.threadId // empty')

if [ -z "$THREAD_ID" ]; then
  echo "Failed to create workflow. Response:"
  echo $RESPONSE
  exit 1
fi

echo "Created workflow with threadId: $THREAD_ID"
echo ""
echo "Waiting for workflow to process..."
sleep 5

# Check workflow status
echo "Checking workflow status..."
STATUS_RESPONSE=$(curl -s http://localhost:3457/api/workflow-graph/$THREAD_ID)

if [ $? -eq 0 ]; then
  echo "Workflow graph data retrieved successfully!"
  echo ""
  echo "Resume points in workflow:"
  echo $STATUS_RESPONSE | jq '.graph.execution.resumePoints'
  echo ""
  echo "To view the workflow visualization:"
  echo "1. Open http://localhost:5173 in your browser"
  echo "2. Navigate to Workflows section in sidebar"
  echo "3. Select workflow: $THREAD_ID"
  echo "4. Look for:"
  echo "   - Amber-highlighted nodes with 'Resume' badge"
  echo "   - 'Resume Workflow' button in the header"
  echo "   - 'Checkpoint saved' message in failed/blocked nodes"
else
  echo "Failed to retrieve workflow status"
fi

echo ""
echo "Direct link to workflow: http://localhost:5173/workflows/$THREAD_ID"