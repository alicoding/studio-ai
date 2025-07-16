# Data Processing Example

**Loop-based data transformation with variable substitution**

This example demonstrates how to use Claude Studio's loop nodes to process multiple data items with variable substitution, showing real iterative execution rather than mock responses.

## 🎯 What You'll Learn

- Loop node configuration and execution
- Variable substitution (`{loopVar}` → actual values)
- Iterative data processing patterns
- Error handling within loops

## 📋 Workflow Overview

```mermaid
graph TD
    A[Start] --> B[Loop: Process Files]
    B --> C[Validate File]
    B --> D[Transform Data]
    C --> E[Generate Report]
    D --> E
    E --> F[Complete]

    B -.->|file={filename}| C
    B -.->|file={filename}| D
```

**Data**: `["users.csv", "orders.json", "products.xml"]`
**Loop Variable**: `file`
**Steps per iteration**: Validate → Transform → Report

**Expected Duration:** 3-5 minutes

## 🚀 Quick Start

### Option 1: Import via UI

1. Open Claude Studio workflow builder
2. Import `workflow.json` from this directory
3. Observe the loop node configuration
4. Execute and watch 3 iterations

### Option 2: Run via MCP API

```bash
mcp__studio-ai__invoke({
  workflow: [
    {
      id: "process-files",
      type: "loop",
      task: "Process data files",
      items: ["users.csv", "orders.json", "products.xml"],
      loopVar: "file",
      loopSteps: ["validate", "transform"]
    },
    {
      id: "validate",
      role: "developer",
      task: "Validate the data format and structure of {file}"
    },
    {
      id: "transform",
      role: "developer",
      task: "Transform {file} into standardized JSON format"
    }
  ]
})
```

## 📊 Expected Output

### Iteration 1: users.csv

```
Validate: "users.csv validation successful - CSV format with headers: id,name,email,created_at"
Transform: "users.csv transformed to JSON: [{\"id\":1,\"name\":\"John\",\"email\":\"john@example.com\"}...]"
```

### Iteration 2: orders.json

```
Validate: "orders.json validation successful - Valid JSON array with order objects"
Transform: "orders.json already in JSON format, standardized field names and structure"
```

### Iteration 3: products.xml

```
Validate: "products.xml validation successful - Well-formed XML with product catalog"
Transform: "products.xml converted from XML to JSON format: [{\"id\":1,\"name\":\"Laptop\"}...]"
```

## 🔧 Advanced Configuration

### Custom Loop Variables

```json
{
  "items": ["apple", "banana", "orange"],
  "loopVar": "fruit",
  "task": "Analyze nutritional content of {fruit}"
}
```

### Conditional Processing

```json
{
  "id": "conditional-transform",
  "type": "conditional",
  "condition": {
    "version": "2.0",
    "rootGroup": {
      "rules": [
        {
          "leftValue": { "stepId": "validate", "field": "output" },
          "operation": "contains",
          "rightValue": { "type": "string", "value": "error" }
        }
      ]
    }
  },
  "trueBranch": "error-handler",
  "falseBranch": "transform"
}
```

### Error Handling

```json
{
  "id": "error-handler",
  "role": "developer",
  "task": "Handle validation error for {file} and suggest corrections"
}
```

## 🎓 Learning Extensions

### 1. Parallel Processing

Process multiple files simultaneously:

```json
{
  "id": "parallel-process",
  "type": "parallel",
  "parallelSteps": ["process-batch-1", "process-batch-2", "process-batch-3"]
}
```

### 2. Dynamic Items

Load file list from external source:

```json
{
  "id": "load-files",
  "role": "developer",
  "task": "Scan directory and return list of data files to process"
}
```

### 3. Aggregation

Combine results after loop:

```json
{
  "id": "aggregate",
  "role": "developer",
  "task": "Combine all processed files into final report",
  "deps": ["process-files"]
}
```

## 🔍 Key Features Demonstrated

### 1. Real Loop Execution

Unlike mock implementations, this actually executes steps for each item:

- `validate_file_users.csv`
- `transform_file_users.csv`
- `validate_file_orders.json`
- `transform_file_orders.json`
- etc.

### 2. Variable Substitution

The `{file}` variable is replaced with actual values:

- **Template**: `"Validate {file} format"`
- **Iteration 1**: `"Validate users.csv format"`
- **Iteration 2**: `"Validate orders.json format"`

### 3. Unique Step IDs

Each iteration gets unique step identifiers:

- `validate_file_users.csv`
- `validate_file_orders.json`
- `validate_file_products.xml`

## 🚦 Troubleshooting

### Common Issues

**"Loop node not executing"**

- Ensure `loopSteps` array references valid step IDs
- Check that referenced steps exist in workflow
- Verify `items` array is not empty

**"Variable substitution not working"**

- Confirm `loopVar` matches the variable in `{brackets}`
- Check spelling and case sensitivity
- Ensure variable syntax uses curly braces `{var}`

**"Steps executing out of order"**

- Loop steps execute sequentially per iteration
- Dependencies within loop steps work normally
- Each iteration waits for previous to complete

### Debug Loop Execution

Add debug logging:

```json
{
  "id": "debug-loop",
  "role": "developer",
  "task": "Debug: Processing item {file} in iteration {index}"
}
```

## 🔗 Next Steps

After mastering data processing loops:

1. **[Testing Automation](../testing-automation/)** - Quality gates with conditionals
2. **[Approval Workflows](../approval-workflows/)** - Human oversight for critical data
3. **Build ETL Pipelines** - Extract, Transform, Load workflows
4. **Create Batch Processors** - Handle large datasets efficiently

## 📝 Files

- [`workflow.json`](./workflow.json) - Complete loop workflow definition
- [`variations/`](./variations/) - Different loop patterns and configurations
