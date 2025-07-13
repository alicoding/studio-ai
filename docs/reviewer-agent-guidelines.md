# Reviewer Agent Guidelines for Claude Studio

## Primary Review Objectives

### 1. Verify Mandatory Principles

- **SOLID**: Check each principle is applied correctly
- **DRY**: Flag any code duplication immediately
- **KISS**: Reject unnecessarily complex solutions
- **Library-First**: Ensure no custom code where libraries exist

### 2. TypeScript Compliance

- **Zero tolerance for 'any' types**
- Verify all data has proper interfaces
- Check for proper type inference usage
- Confirm strict mode compliance

## Code Review Checklist

### Architecture & Structure

- [ ] Components under 200 lines
- [ ] Business logic in service layer, not components
- [ ] Proper separation of concerns
- [ ] No standalone pages for workspace features

### Code Quality

- [ ] No duplicate code across files
- [ ] Proper error handling in try/catch blocks
- [ ] JSDoc comments for complex functions
- [ ] Meaningful variable/function names

### TypeScript Verification

```typescript
// ❌ REJECT
const data: any = await fetchData()
function process(input: any): any {}

// ✅ ACCEPT
interface DataType {
  id: string
  value: number
}
const data: DataType = await fetchData()
function process(input: DataType): ProcessedData {}
```

### API Patterns

- [ ] Uses `ky` for HTTP calls, not fetch
- [ ] Proper request/response typing
- [ ] Error responses follow standard format
- [ ] Input validation with Zod schemas

### State Management

- [ ] Zustand for global state only
- [ ] No unnecessary global state
- [ ] React hooks for local state
- [ ] Proper store organization

## Integration Verification Steps

### 1. Build Verification

```bash
npm run lint        # Must pass with 0 errors
npm run typecheck   # Must pass with 0 errors
npm run build       # Must complete successfully
```

### 2. Runtime Verification

- Start dev server and test affected features
- Check browser console for errors/warnings
- Verify no regression in existing features
- Test error scenarios

### 3. API Integration

- Test all new/modified endpoints
- Verify proper error handling
- Check response formats
- Test with invalid inputs

## Performance Considerations

### Frontend Performance

- [ ] No unnecessary re-renders
- [ ] Proper React memo usage where needed
- [ ] Lazy loading for heavy components
- [ ] Optimized bundle size

### Backend Performance

- [ ] Efficient database queries
- [ ] Proper async/await usage
- [ ] No blocking operations
- [ ] Response time under 200ms for simple operations

### Memory Management

- [ ] Cleanup in useEffect returns
- [ ] No memory leaks in subscriptions
- [ ] Proper disposal of resources

## Security Checks

### Input Validation

- [ ] All user inputs validated
- [ ] SQL injection prevention
- [ ] XSS protection in place
- [ ] Proper sanitization

### Authentication & Authorization

- [ ] Protected routes have auth checks
- [ ] Proper permission validation
- [ ] Secure token handling
- [ ] No sensitive data in logs

### Data Handling

- [ ] No hardcoded credentials
- [ ] Proper environment variable usage
- [ ] Secure data transmission
- [ ] Appropriate data encryption

## Task Completion Verification

### Atomic Task Requirements

1. **Single Responsibility**: Task does one thing well
2. **Complete Implementation**: All aspects addressed
3. **No Broken Features**: Existing functionality intact
4. **Proper Testing**: Edge cases covered

### Definition of Done

- [ ] Feature works as specified
- [ ] No TypeScript/lint errors
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if needed)
- [ ] No console errors/warnings
- [ ] Performance acceptable
- [ ] Security considerations addressed

## Common Rejection Reasons

### Immediate Rejection

1. **Any use of 'any' type**
2. **Duplicate code without extraction**
3. **Fetch used instead of ky**
4. **Console errors in runtime**
5. **Lint/TypeScript errors**

### Major Issues

1. **SOLID principles violated**
2. **Overly complex solution (KISS violation)**
3. **Custom implementation where library exists**
4. **Poor error handling**
5. **Security vulnerabilities**

### Minor Issues (Fix Required)

1. **Missing JSDoc for complex logic**
2. **Component over 200 lines**
3. **Inconsistent naming**
4. **Missing edge case handling**

## Review Process

### Step 1: Static Analysis

- Run lint and typecheck
- Review code structure
- Check for principle violations

### Step 2: Code Inspection

- Verify no code duplication
- Check TypeScript usage
- Review error handling
- Assess complexity

### Step 3: Runtime Testing

- Test happy path
- Test error scenarios
- Check performance
- Verify integrations

### Step 4: Security Audit

- Input validation check
- Authorization verification
- Data handling review

## Feedback Format

### For Rejections

```
❌ REJECTED: [Reason]

Issues Found:
1. [Specific issue with code example]
2. [Another issue with location]

Required Changes:
- [Specific action needed]
- [Another required change]

Example Fix:
[Code showing correct implementation]
```

### For Approvals

```
✅ APPROVED

Verified:
- All principles followed
- No TypeScript errors
- Proper error handling
- Tests pass
- Security checks pass

Good practices observed:
- [Positive feedback]
```

## Final Notes

- **Be constructive** in feedback
- **Provide examples** of correct implementation
- **Focus on principles** not preferences
- **Verify everything** before approval
- **Reject early** if fundamental issues exist
