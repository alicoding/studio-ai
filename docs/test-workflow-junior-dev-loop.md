# Junior Dev → Senior Reviewer Loop Test Workflow

## Goal
Create a realistic workflow that demonstrates junior developer → senior reviewer iteration cycles with proper loop visualization.

## Workflow Design

### Step 1: Junior Dev Initial Implementation
```typescript
{
  id: "junior_dev_v1",
  role: "junior_developer", 
  task: "Write a basic user authentication system with login/logout. Include basic error handling."
}
```

**Expected Mock Response**: Basic auth code with security issues

### Step 2: Senior Reviewer - Review 1
```typescript
{
  id: "senior_review_v1",
  role: "senior_developer",
  task: "Review {junior_dev_v1.output} for production readiness. Check for: security vulnerabilities, input validation, error handling, tests. If issues found, specify NEEDS_REVISION with detailed feedback. If ready, specify APPROVED.",
  deps: ["junior_dev_v1"]
}
```

**Expected Mock Response**: "NEEDS_REVISION: Missing input validation, password hashing is weak, need proper error handling"

### Step 3: LangGraph Conditional Edge
**Operator Decision**: If review contains "NEEDS_REVISION" → route to junior_dev_v2, else → END

### Step 4: Junior Dev Iteration 2
```typescript
{
  id: "junior_dev_v2", 
  role: "junior_developer",
  task: "Fix the authentication code based on senior review feedback: {senior_review_v1.output}. Address all mentioned issues.",
  deps: ["senior_review_v1"]  // Only executes if routed here
}
```

**Expected Mock Response**: Improved code with input validation and better password handling

### Step 5: Senior Reviewer - Review 2  
```typescript
{
  id: "senior_review_v2",
  role: "senior_developer", 
  task: "Review {junior_dev_v2.output} for production readiness. Previous issues were: {senior_review_v1.output}. Check if all issues are resolved.",
  deps: ["junior_dev_v2"]
}
```

**Expected Mock Response**: "NEEDS_REVISION: Better, but still missing comprehensive tests and session management"

### Step 6: Junior Dev Iteration 3
```typescript
{
  id: "junior_dev_v3",
  role: "junior_developer",
  task: "Final iteration based on: {senior_review_v2.output}. Add comprehensive tests and session management.",
  deps: ["senior_review_v2"]
}
```

### Step 7: Senior Reviewer - Final Review
```typescript
{
  id: "senior_review_v3", 
  role: "senior_developer",
  task: "Final review of {junior_dev_v3.output}. Check all previous feedback has been addressed.",
  deps: ["junior_dev_v3"]
}
```

**Expected Mock Response**: "APPROVED: All security issues resolved, comprehensive tests added, ready for production"

## Expected Loop Visualization

### Steps View:
```
🔄 Loop 1: Junior Dev → Senior Review (NEEDS_REVISION)
  1. junior_dev_v1: Basic auth system
  2. senior_review_v1: "Missing input validation, weak password hashing"

🔄 Loop 2: Junior Dev → Senior Review (NEEDS_REVISION)  
  3. junior_dev_v2: Added validation and password hashing
  4. senior_review_v2: "Better, but missing tests and session management"

🔄 Loop 3: Junior Dev → Senior Review (APPROVED)
  5. junior_dev_v3: Added tests and session management  
  6. senior_review_v3: "All issues resolved, ready for production"
```

### Graph View:
```
[junior_dev_v1] → [senior_review_v1] 
       ↑                    ↓
       |                    | (NEEDS_REVISION)
       |                    ↓
[junior_dev_v2] → [senior_review_v2]
       ↑                    ↓  
       |                    | (NEEDS_REVISION)
       |                    ↓
[junior_dev_v3] → [senior_review_v3] → END (APPROVED)
```

## Implementation Requirements

1. **Mock AI Responses**: Create realistic responses for each iteration
2. **Conditional Routing**: LangGraph conditional edges based on "NEEDS_REVISION" vs "APPROVED"
3. **Loop Detection**: WorkflowGraphGenerator should detect the junior_dev ↔ senior_review pattern
4. **Visual Indicators**: Loop badges, iteration counts, curved edges
5. **Progress Tracking**: Show convergence toward approval

## Success Criteria

- [ ] Workflow executes 3 complete iterations  
- [ ] Each iteration shows realistic feedback and improvements
- [ ] Loop detection identifies the pattern correctly
- [ ] Steps view groups iterations logically
- [ ] Graph view shows curved loop edges with iteration counts
- [ ] Final approval terminates the loop

This test workflow will validate our entire loop visualization system!