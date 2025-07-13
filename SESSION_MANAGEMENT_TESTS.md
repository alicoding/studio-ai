# Session Management Test Scenarios

## Test Cases for Session Management

### 1. Clear Session (Trash Button)

**Expected Behavior**: Clear context but keep agent card

**Test Scenario**:

```
GIVEN: Agent "dev1" with existing session in project "test-project"
  AND: ~/.claude/projects/test-project/dev1.jsonl exists with 10 messages
  AND: Agent card shows in sidebar with session history
WHEN: User clicks trash button on agent card
THEN: ~/.claude/projects/test-project/dev1.jsonl should be deleted
  AND: Agent card should remain in sidebar
  AND: Agent status should reset to 'ready'
  AND: MessageHistoryViewer should show empty state
  AND: Next message should start fresh session (parentUuid: null)
  AND: NO new legacy agent should be created
```

### 2. Delete Agent

**Expected Behavior**: Remove both session and agent card

**Test Scenario**:

```
GIVEN: Agent "dev1" with existing session in project "test-project"
  AND: ~/.claude/projects/test-project/dev1.jsonl exists
  AND: Agent card shows in sidebar
WHEN: User clicks delete button on agent card
THEN: ~/.claude/projects/test-project/dev1.jsonl should be deleted
  AND: Agent card should be removed from sidebar
  AND: Agent should be removed from project agent list
  AND: No trace of agent should remain
```

### 3. Existing Chat Continuation

**Expected Behavior**: Continue existing session, never spawn new legacy agents

**Test Scenario**:

```
GIVEN: Agent "dev1" with sessionId "abc-123" in project "test-project"
  AND: ~/.claude/projects/test-project/dev1.jsonl exists with messages
  AND: User sends message "Hello again"
WHEN: Claude SDK processes the message
THEN: Message should have parentUuid (not null)
  AND: New sessionId "abc-456" should be extracted as checkpoint
  AND: this.sessionId should be updated to "abc-456"
  AND: Agent card should remain the same (no new agent spawned)
  AND: MessageHistoryViewer should show continuous conversation
```

### 4. New Session Start

**Expected Behavior**: Start fresh when no session exists

**Test Scenario**:

```
GIVEN: Agent "dev1" in project "test-project"
  AND: NO ~/.claude/projects/test-project/dev1.jsonl file exists
WHEN: User sends first message "Hello"
THEN: Message should have parentUuid: null (new session)
  AND: New sessionId should be extracted and stored
  AND: Agent status should change from 'ready' to 'online'
  AND: New .jsonl file should be created
```

### 5. Session Recovery on App Restart

**Expected Behavior**: Load existing sessions from .jsonl files

**Test Scenario**:

```
GIVEN: ~/.claude/projects/test-project/dev1.jsonl exists with sessionId "abc-123"
WHEN: App restarts and loads project
THEN: Agent "dev1" should be loaded with sessionId "abc-123"
  AND: MessageHistoryViewer should show previous messages
  AND: Next message should continue session (parentUuid not null)
```

## Implementation Plan

### Phase 1: Fix Clear Functionality

1. Update clear handler to delete .jsonl file only
2. Keep agent card but reset sessionId to null
3. Reset agent status to 'ready'
4. Clear MessageHistoryViewer state

### Phase 2: Fix Session Continuation Logic

1. Always use existing agent if it exists in project
2. Extract sessionId from EVERY message (user/assistant/result)
3. Update agent's sessionId with latest checkpoint
4. Never create legacy agents for existing project agents

### Phase 3: Write Integration Tests

1. Create test helper functions
2. Mock file system operations
3. Test each scenario end-to-end
4. Verify no unintended side effects

### Phase 4: Validate Edge Cases

1. Multiple messages in quick succession
2. Network interruptions during session
3. Invalid .jsonl files
4. Missing session files
