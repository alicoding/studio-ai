#!/bin/bash

# Workflow Builder API Test Script
# Tests the validation and execution endpoints

API_BASE="http://localhost:3456/api"

echo "=== Workflow Builder API Tests ==="
echo ""

# Test 1: Valid workflow validation
echo "Test 1: Validate a valid workflow"
curl -X POST "$API_BASE/workflows/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-workflow-1",
    "name": "Code Review Workflow",
    "description": "Review and improve code quality",
    "steps": [
      {
        "id": "analyze",
        "type": "task",
        "role": "developer",
        "task": "Analyze the codebase and identify areas for improvement",
        "deps": []
      },
      {
        "id": "review",
        "type": "task",
        "role": "reviewer",
        "task": "Review the analysis from {analyze.output} and provide feedback",
        "deps": ["analyze"]
      },
      {
        "id": "implement",
        "type": "task",
        "role": "developer",
        "task": "Implement improvements based on {review.output}",
        "deps": ["review"]
      }
    ],
    "metadata": {
      "createdBy": "test-user",
      "createdAt": "2025-01-12T12:00:00Z",
      "version": 1,
      "tags": ["code-review", "quality"],
      "projectId": "mcp-context"
    }
  }' | jq

echo ""
echo "---"
echo ""

# Test 2: Invalid workflow - circular dependency
echo "Test 2: Validate workflow with circular dependency"
curl -X POST "$API_BASE/workflows/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-workflow-2",
    "name": "Circular Workflow",
    "steps": [
      {
        "id": "step1",
        "type": "task",
        "role": "developer",
        "task": "Do something with {step2.output}",
        "deps": ["step2"]
      },
      {
        "id": "step2",
        "type": "task",
        "role": "reviewer",
        "task": "Review {step1.output}",
        "deps": ["step1"]
      }
    ],
    "metadata": {
      "createdBy": "test-user",
      "createdAt": "2025-01-12T12:00:00Z",
      "version": 1,
      "tags": [],
      "projectId": "mcp-context"
    }
  }' | jq

echo ""
echo "---"
echo ""

# Test 3: Invalid workflow - missing required fields
echo "Test 3: Validate workflow with missing fields"
curl -X POST "$API_BASE/workflows/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-workflow-3",
    "steps": [
      {
        "id": "step1",
        "task": "",
        "deps": []
      }
    ]
  }' | jq

echo ""
echo "---"
echo ""

# Test 4: Execute a simple workflow
echo "Test 4: Execute a simple workflow"
curl -X POST "$API_BASE/workflows/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "id": "test-execution-1",
      "name": "Test TODO API",
      "description": "Build a simple TODO API",
      "steps": [
        {
          "id": "design",
          "type": "task",
          "role": "architect",
          "task": "Design a REST API for a TODO application",
          "deps": []
        },
        {
          "id": "implement",
          "type": "task",
          "role": "developer",
          "task": "Implement the API design from {design.output}",
          "deps": ["design"]
        }
      ],
      "metadata": {
        "createdBy": "test-user",
        "createdAt": "2025-01-12T12:00:00Z",
        "version": 1,
        "tags": ["api", "todo"],
        "projectId": "mcp-context"
      }
    }
  }' | jq

echo ""
echo "---"
echo ""

# Test 5: Execute with specific thread ID
echo "Test 5: Execute workflow with custom thread ID"
curl -X POST "$API_BASE/workflows/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "id": "test-execution-2",
      "name": "Custom Thread Test",
      "steps": [
        {
          "id": "test",
          "type": "task",
          "role": "developer",
          "task": "Create a hello world function",
          "deps": []
        }
      ],
      "metadata": {
        "createdBy": "test-user",
        "createdAt": "2025-01-12T12:00:00Z",
        "version": 1,
        "tags": [],
        "projectId": "mcp-context"
      }
    },
    "threadId": "custom-thread-123"
  }' | jq

echo ""
echo "=== Tests Complete ==="