# Heartbeat Implementation Gap Analysis

## Current Implementation (Event-Based)

- Only updates timestamp on `step_start` events
- No continuous heartbeat during step execution
- Will falsely detect "dead" workflows if steps take > 2 minutes

## True Heartbeat Requirements

1. **Continuous Pulse During Execution**

   ```typescript
   // In ClaudeService or WorkflowOrchestrator
   const heartbeatInterval = setInterval(() => {
     if (this.isProcessing) {
       monitor.updateHeartbeat(threadId, currentStep)
     }
   }, 30000) // Every 30 seconds
   ```

2. **Integration Points**
   - Start heartbeat when Claude SDK query begins
   - Continue during entire agent execution
   - Stop when response received

3. **Challenges**
   - Claude SDK is a black box - we can't inject heartbeats inside it
   - Would need to wrap SDK calls with heartbeat management
   - Adds complexity vs KISS principle

## Alternative: Adjust Thresholds

Instead of adding true heartbeats, we could:

1. Increase STALE_THRESHOLD to 10 minutes
2. Only monitor for truly dead processes
3. Accept that long-running steps won't be detected quickly

## Recommendation

For KISS approach: Keep event-based monitoring but:

1. Be honest about limitations
2. Document that steps > 2 minutes may trigger false recovery
3. Consider this a "safety net" not a "real-time monitor"
