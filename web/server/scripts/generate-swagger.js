/**
 * Automatic Swagger Documentation Generator
 *
 * SOLID: Single responsibility - generates API docs
 * DRY: Reuses existing Express routes
 * KISS: Simple swagger-autogen integration
 * Library-First: Uses swagger-autogen for automatic generation
 *
 * This script automatically scans all API routes and generates OpenAPI documentation
 * No manual maintenance required - docs are generated from actual code
 */

import swaggerAutogen from 'swagger-autogen'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const swaggerAutoGenInstance = swaggerAutogen({ openapi: '3.0.0' })

const doc = {
  info: {
    title: 'Claude Studio API',
    description: `
# Claude Studio API Documentation

This is the comprehensive API documentation for Claude Studio - an autonomous software engineering system.

## Key Features

### 🤖 Multi-Agent Orchestration
- Execute complex workflows with multiple AI agents
- Support for sequential, parallel, and conditional execution
- Built-in dependency resolution and state management

### 📝 Workflow Management  
- Create, save, and execute reusable workflows
- Support for project-specific, global, and cross-project workflows
- Visual workflow builder with drag-and-drop interface

### 🔧 Agent Management
- Configure AI agents with custom tools and permissions
- Role-based agent assignment for projects
- Dynamic tool discovery and permission management

### 📊 Real-time Monitoring
- WebSocket-based real-time updates
- Workflow execution tracking and status monitoring
- Session management and message history

## API Categories

- **Workflows**: Create, manage, and execute AI workflows
- **Agents**: Configure and manage AI agents  
- **Projects**: Project and workspace management
- **Intelligence**: AI capabilities and smart features
- **Tools**: Tool discovery and permission management
- **System**: Health checks, settings, and system info

## Authentication

Most endpoints require authentication. See individual endpoint documentation for details.

## Rate Limiting

API calls are rate-limited to prevent abuse. See response headers for current limits.
    `,
    version: '1.0.0',
    contact: {
      name: 'Claude Studio',
      url: 'https://github.com/anthropics/claude-studio',
    },
  },
  servers: [
    {
      url: 'http://localhost:3456',
      description: 'Stable Server (Production)',
    },
    {
      url: 'http://localhost:3457',
      description: 'Development Server (Hot Reload)',
    },
  ],
  tags: [
    {
      name: 'Workflow Management',
      description:
        '🔄 Create, save, validate, and execute workflows. Includes saved workflow CRUD operations and workflow definitions.',
    },
    {
      name: 'Workflow Execution',
      description:
        '⚡ Execute workflows with multi-agent orchestration. Real-time status monitoring and execution control.',
    },
    {
      name: 'Agent Management',
      description:
        '🤖 Configure AI agents, manage roles, and assign agents to projects. Tool permissions and capabilities.',
    },
    {
      name: 'Project & Workspace',
      description:
        '📁 Project creation, workspace management, and Claude project integration. Studio projects and settings.',
    },
    {
      name: 'Messages & Communication',
      description:
        '💬 Message history, chat functionality, and real-time communication between agents and users.',
    },
    {
      name: 'AI Capabilities',
      description:
        '🧠 AI model execution, LangChain integration, and intelligent features. Studio intelligence system.',
    },
    {
      name: 'Tools & Permissions',
      description:
        '🔧 Tool discovery, permission management, and MCP (Model Context Protocol) configuration.',
    },
    {
      name: 'System & Health',
      description:
        '⚙️ System health checks, settings, storage, and API documentation. Server status and diagnostics.',
    },
    {
      name: 'Data & Storage',
      description:
        '💾 File storage, screenshot capture, and data persistence. Session management and workspace data.',
    },
    {
      name: 'Teams & Collaboration',
      description:
        '👥 Team management, role assignments, and collaborative features for multi-user environments.',
    },
  ],
  '@hapi/qs': {}, // Required for swagger-autogen
  host: undefined, // Will be set dynamically
  basePath: '/api',
  schemes: ['http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  definitions: {}, // Legacy support
  components: {
    schemas: {
      WorkflowDefinition: {
        type: 'object',
        required: ['id', 'name', 'steps'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique workflow identifier',
          },
          name: {
            type: 'string',
            description: 'Human-readable workflow name',
          },
          description: {
            type: 'string',
            description: 'Optional workflow description',
          },
          steps: {
            type: 'array',
            items: { $ref: '#/components/schemas/WorkflowStep' },
            description: 'Array of workflow steps',
          },
        },
      },
      WorkflowStep: {
        type: 'object',
        required: ['id', 'task'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique step identifier',
          },
          task: {
            type: 'string',
            description: 'Task description for the AI agent',
          },
          role: {
            type: 'string',
            description: 'Agent role (developer, reviewer, architect, etc.)',
          },
          agentId: {
            type: 'string',
            description: 'Specific agent ID to use',
          },
          deps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of step IDs this step depends on',
          },
        },
      },
      SavedWorkflow: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectId: {
            type: 'string',
            nullable: true,
            description: 'Project ID (null for global workflows)',
          },
          name: { type: 'string' },
          description: { type: 'string' },
          definition: { $ref: '#/components/schemas/WorkflowDefinition' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          version: { type: 'integer' },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          isTemplate: { type: 'boolean' },
          source: {
            type: 'string',
            enum: ['ui', 'mcp', 'api'],
          },
          scope: {
            type: 'string',
            enum: ['project', 'global', 'cross-project'],
            description: 'Workflow visibility scope',
          },
        },
      },
      Agent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          model: { type: 'string' },
          systemPrompt: { type: 'string' },
          tools: {
            type: 'array',
            items: { type: 'string' },
          },
          maxTokens: { type: 'integer' },
          temperature: { type: 'number' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          workspacePath: { type: 'string' },
          settings: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          lastActivityAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
          details: {
            type: 'object',
            description: 'Additional error details',
          },
        },
      },
    },
  },
}

const outputFile = path.join(__dirname, '../api-docs/swagger.json')
const endpointsFiles = [
  path.join(__dirname, '../app.ts'), // Main app file that registers routes
  path.join(__dirname, '../api/**/*.ts'), // All API route files
]

// Generate the swagger documentation
swaggerAutoGenInstance(outputFile, endpointsFiles, doc)
  .then(() => {
    console.log('✅ Swagger documentation generated successfully!')
    console.log(`📁 Output: ${outputFile}`)
    console.log(
      '🌐 View at: http://localhost:3456/api/api-docs or http://localhost:3457/api/api-docs'
    )
  })
  .catch((error) => {
    console.error('❌ Failed to generate Swagger documentation:', error)
  })
