-- Authentication Database Schema
-- This schema supports user authentication with password reset and remember me functionality

CREATE TABLE IF NOT EXISTS users (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- User credentials
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Password reset fields
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    
    -- Remember me functionality
    remember_token VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_reset_token ON users(reset_token);
CREATE INDEX idx_users_remember_token ON users(remember_token);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE
    ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();