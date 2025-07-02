# Claude Session File Relationship Pattern

## Key Discovery: The Simple Pattern

Claude's JSONL session files follow a simple continuation pattern where:

1. **Filename = Session ID**: Each JSONL file is named with a UUID that represents a session ID
2. **Continuation Files Include Parent Messages**: When a conversation continues, the new file includes:
   - Summary messages at the beginning
   - Messages from the parent session (with the parent's sessionId)
   - New messages with the current file's sessionId

## The Pattern Explained

### Original Session

- **File**: `74e45e61-eb38-4428-bf02-2816a25fe180.jsonl`
- **Messages**: All have `sessionId: "74e45e61-eb38-4428-bf02-2816a25fe180"`

### First Continuation

- **File**: `f3504576-7ec1-4e63-b210-5fad98696456.jsonl`
- **Contains**:
  - Summary messages (type: "summary")
  - Parent session messages: `sessionId: "74e45e61-eb38-4428-bf02-2816a25fe180"`
  - New messages: `sessionId: "f3504576-7ec1-4e63-b210-5fad98696456"`

### Second Continuation

- **File**: `d5db96d7-5fce-4102-a9cb-ae48a57f5667.jsonl`
- **Contains**:
  - Messages from immediate parent: `sessionId: "f3504576-7ec1-4e63-b210-5fad98696456"`
  - New messages: `sessionId: "d5db96d7-5fce-4102-a9cb-ae48a57f5667"`

## Why This Pattern Exists

1. **Context Preservation**: Continuation files include parent messages to maintain conversation context
2. **Session Chaining**: Each continuation knows its immediate parent through the included sessionIds
3. **Duplicate Content**: The same message appears in multiple files because:
   - Original file has the original message
   - Continuation files include parent messages for context

## How to Identify Related Sessions

To group sessions together:

1. Look for files that contain messages with sessionIds different from their filename
2. If file `X.jsonl` contains messages with `sessionId: "Y"`, then `Y` is the parent session
3. Build chains by following these parent relationships

### Example Groups:

- **Group 3**: `7386247c` → `e5f9351d` (e5f9351d contains messages from 7386247c)
- **Group 4**: `74e45e61` → `f3504576` → `d5db96d7` (each contains messages from its parent)

## Implementation Note

When consolidating agents, the system should:

1. Parse each JSONL file to extract all unique sessionIds
2. Group files where one file's name appears as a sessionId in another file
3. The "root" session is the one whose sessionId only appears in its own file
4. Order the chain from root to most recent continuation
