-- Create workflow checkpoints schema
CREATE SCHEMA IF NOT EXISTS workflow_checkpoints;

-- LangGraph will create its own checkpoint tables automatically
-- But we'll add our own metadata tracking table for monitoring

-- Workflow metadata table for tracking and monitoring
CREATE TABLE workflow_checkpoints.workflow_metadata (
    thread_id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_steps INTEGER,
    completed_steps INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'aborted'))
);

-- Indexes for performance
CREATE INDEX idx_workflow_status ON workflow_checkpoints.workflow_metadata(status);
CREATE INDEX idx_workflow_created ON workflow_checkpoints.workflow_metadata(created_at);
CREATE INDEX idx_workflow_updated ON workflow_checkpoints.workflow_metadata(updated_at);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION workflow_checkpoints.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update the updated_at column
CREATE TRIGGER update_workflow_metadata_updated_at 
    BEFORE UPDATE ON workflow_checkpoints.workflow_metadata 
    FOR EACH ROW 
    EXECUTE FUNCTION workflow_checkpoints.update_updated_at_column();

-- Grant permissions (adjust as needed for your setup)
GRANT ALL ON SCHEMA workflow_checkpoints TO claude;
GRANT ALL ON ALL TABLES IN SCHEMA workflow_checkpoints TO claude;
GRANT ALL ON ALL SEQUENCES IN SCHEMA workflow_checkpoints TO claude;