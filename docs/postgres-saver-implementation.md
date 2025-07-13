# PostgresSaver Implementation Guide

## Overview

This document describes the PostgresSaver implementation for workflow persistence in Claude Studio. The implementation allows workflows to survive server restarts and provides reliable checkpoint storage.

## Current Status

**Implementation Phase**: Feature Flag Testing  
**Default Mode**: MemorySaver (PostgresSaver available behind feature flag)

### Completed

- ✅ PostgreSQL dependencies installed
- ✅ Docker Compose configuration for PostgreSQL
- ✅ Database connection service with pooling
- ✅ Feature flag implementation (USE_POSTGRES_SAVER)
- ✅ WorkflowOrchestrator updated to support async checkpointer
- ✅ Health check endpoint for monitoring
- ✅ Basic unit tests for feature flag behavior

### In Progress

- 🚧 Comprehensive persistence testing
- 🚧 Performance benchmarking
- 🚧 Migration tooling for existing workflows

### Not Started

- ❌ Production rollout
- ❌ Monitoring and metrics
- ❌ Cleanup of MemorySaver code

## Setup Instructions

### 1. Start PostgreSQL

```bash
# Start PostgreSQL using Docker Compose
docker-compose up -d postgres

# Verify it's running
docker-compose ps
```

### 2. Configure Environment

Add to your `.env` file:

```env
# Enable PostgresSaver
USE_POSTGRES_SAVER=true
POSTGRES_CONNECTION_STRING=postgresql://claude:development_password@localhost:5432/claude_studio
POSTGRES_SCHEMA=workflow_checkpoints
POSTGRES_PASSWORD=development_password
```

### 3. Verify Setup

```bash
# Check health endpoint
curl http://localhost:3456/api/health/checkpointer

# Response when PostgresSaver is enabled:
{
  "status": "healthy",
  "checkpointer": "PostgresSaver",
  "postgres": {
    "connected": true,
    "connectionString": "postgresql://claude:***@localhost:5432/claude_studio",
    "schema": "workflow_checkpoints"
  }
}
```

## Architecture

### Components

1. **PostgreSQL Database**
   - Stores workflow checkpoints
   - Handles concurrent access
   - Provides persistence across restarts

2. **Checkpointer Service** (`/web/server/services/database/checkpointer.ts`)
   - Singleton pattern for checkpointer instance
   - Async initialization support
   - Feature flag switching

3. **WorkflowOrchestrator**
   - Uses async checkpointer initialization
   - Transparent switching between MemorySaver and PostgresSaver
   - No changes required to workflow logic

### Database Schema

```sql
-- Created automatically in workflow_checkpoints schema
-- LangGraph tables (created by PostgresSaver):
- checkpoints
- checkpoint_metadata
- checkpoint_writes

-- Our tracking table:
- workflow_metadata (for monitoring and analytics)
```

## Emergency Rollback Procedure

If issues arise with PostgresSaver, follow these steps:

### 1. Immediate Rollback (< 5 minutes)

```bash
# Set environment variable to disable PostgresSaver
export USE_POSTGRES_SAVER=false

# Restart the server
npm run env:restart

# Verify MemorySaver is active
curl http://localhost:3456/api/health/checkpointer
```

### 2. Data Recovery (if needed)

```bash
# Export active workflows from PostgreSQL
docker exec -it claude_studio_postgres psql -U claude -d claude_studio -c \
  "SELECT * FROM workflow_checkpoints.checkpoints WHERE thread_id IN (SELECT DISTINCT thread_id FROM workflow_checkpoints.workflow_metadata WHERE status = 'running');" \
  > active_workflows_backup.sql

# Review the exported data
cat active_workflows_backup.sql
```

### 3. Permanent Rollback

1. Update `.env` file:

   ```env
   USE_POSTGRES_SAVER=false
   ```

2. Stop PostgreSQL (optional):

   ```bash
   docker-compose stop postgres
   ```

3. Document any issues encountered for future reference

## Testing

### Run Tests

```bash
# Run checkpointer tests
npm test -- postgres-checkpointer.test.ts

# Run all workflow tests
npm test -- invoke-*.test.ts
```

### Manual Testing

1. **Test Persistence**:

   ```bash
   # Start a workflow
   curl -X POST http://localhost:3456/api/invoke/async \
     -H "Content-Type: application/json" \
     -d '{"workflow": {"role": "dev", "task": "test persistence"}}'

   # Note the threadId in response
   # Restart the server
   npm run env:restart

   # Check workflow status
   curl http://localhost:3456/api/invoke-status/status/{threadId}
   ```

2. **Test Feature Flag**:

   ```bash
   # Disable PostgresSaver
   USE_POSTGRES_SAVER=false npm run env:restart:dev

   # Verify using MemorySaver
   curl http://localhost:3456/api/health/checkpointer
   ```

## Monitoring

### Key Metrics to Track

1. **Checkpointer Performance**
   - Save latency (target: < 50ms p95)
   - Load latency (target: < 100ms p95)
   - Error rate (target: < 1%)

2. **Database Health**
   - Connection pool usage
   - Query execution time
   - Storage growth rate

3. **Workflow Recovery**
   - Recovery success rate after restart
   - Data integrity checks
   - Checkpoint size distribution

### Logs to Monitor

```bash
# PostgresSaver initialization
grep "\[Checkpointer\]" ~/.claude-studio/dev-server.log

# Connection pool events
grep "\[POSTGRES\]" ~/.claude-studio/dev-server.log

# Workflow orchestrator
grep "\[WorkflowOrchestrator\]" ~/.claude-studio/dev-server.log
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check PostgreSQL is running: `docker-compose ps`
   - Verify connection string in `.env`
   - Check firewall/network settings

2. **Schema Not Found**
   - Run init script: `docker-compose down && docker-compose up -d`
   - Check migrations ran: `docker exec -it claude_studio_postgres psql -U claude -d claude_studio -c '\dn'`

3. **Performance Degradation**
   - Check connection pool exhaustion
   - Monitor checkpoint sizes
   - Review database indexes

### Debug Commands

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Connect to PostgreSQL
docker exec -it claude_studio_postgres psql -U claude -d claude_studio

# Check schema
\dn

# Check tables
\dt workflow_checkpoints.*

# Check active connections
SELECT count(*) FROM pg_stat_activity;
```

## Next Steps

1. **Complete Testing Phase**
   - Performance benchmarks
   - Load testing with 100+ concurrent workflows
   - Failure injection testing

2. **Production Rollout**
   - Week 1: Enable for internal testing
   - Week 2: 10% of production traffic
   - Week 3: 50% of production traffic
   - Week 4: 100% deployment

3. **Long-term Improvements**
   - Add checkpoint compression
   - Implement automatic cleanup
   - Add checkpoint versioning
   - Create backup/restore tools

## Contact

For questions or issues:

- Create a GitHub issue
- Check logs in `~/.claude-studio/`
- Review this guide for rollback procedures
