/**
 * Shared mock setup for API tests
 * Prevents real HTTP calls and Claude SDK usage
 */

import { vi } from 'vitest'
import type { KyInstance } from 'ky'

// Mock response types
export interface MockInvokeResponse {
  threadId: string
  sessionIds: Record<string, string>
  results: Array<{
    stepId: string
    agentId: string
    output: string
    status: 'completed' | 'failed'
  }>
  status: 'completed' | 'running' | 'failed'
  projectId?: string
}

interface MockStatusResponse {
  status: 'running' | 'completed' | 'failed' | 'aborted'
  sessionIds?: Record<string, string>
  currentStep?: string
  completedSteps?: string[]
  results?: Record<string, { output: string; status: string }>
  error?: string
}

interface MockProjectResponse {
  id: string
  name: string
  description: string
  workspacePath: string
  agentRoleAssignments?: Array<{
    agentConfigId: string
    role: string
    shortId: string
  }>
}

interface MockAgentResponse {
  id: string
  name: string
  role: string
  systemPrompt: string
}

// Default mock responses
export const DEFAULT_MOCK_RESPONSES = {
  invoke: {
    threadId: 'test-thread-123',
    sessionIds: {
      developer: 'session-dev-123',
      architect: 'session-arch-123',
    },
    results: [
      {
        stepId: 'step1',
        agentId: 'developer_01',
        output: 'Mock response: Task completed successfully',
        status: 'completed' as const,
      },
    ],
    status: 'completed' as const,
  } as MockInvokeResponse,

  status: {
    status: 'completed' as const,
    sessionIds: {
      developer: 'session-dev-123',
    },
    completedSteps: ['step1'],
    results: {
      step1: {
        output: 'Mock response: Task completed',
        status: 'completed',
      },
    },
  } as MockStatusResponse,

  project: {
    id: 'test-project-123',
    name: 'Test Project',
    description: 'A test project',
    workspacePath: '/test/workspace',
    agentRoleAssignments: [
      {
        agentConfigId: 'agent-config-123',
        role: 'developer',
        shortId: 'dev_01',
      },
    ],
  } as MockProjectResponse,

  agent: {
    id: 'agent-123',
    name: 'Test Developer',
    role: 'developer',
    systemPrompt: 'You are a helpful developer',
  } as MockAgentResponse,
}

// Mock ky instance
export function createMockKy(customResponses: Record<string, unknown> = {}): Partial<KyInstance> {
  const responses = { ...DEFAULT_MOCK_RESPONSES, ...customResponses }

  return {
    post: vi.fn().mockImplementation((url: string, _options?: { json?: unknown }) => ({
      json: vi.fn().mockImplementation(async () => {
        // Parse the URL to determine which endpoint is being called
        if (url.includes('/invoke/async')) {
          return responses.invoke
        }
        if (url.includes('/invoke')) {
          return responses.invoke
        }
        if (url.includes('/studio-projects') && url.includes('/agents')) {
          return { success: true }
        }
        if (url.includes('/studio-projects')) {
          return responses.project
        }
        return {}
      }),
      text: vi.fn().mockResolvedValue('OK'),
    })),

    get: vi.fn().mockImplementation((url: string) => ({
      json: vi.fn().mockImplementation(async () => {
        if (url.includes('/invoke-status/status/')) {
          return responses.status
        }
        if (url.includes('/agents')) {
          return [responses.agent]
        }
        if (url.includes('/studio-projects')) {
          return responses.project
        }
        return {}
      }),
    })),

    delete: vi.fn().mockImplementation(() => ({
      json: vi.fn().mockResolvedValue({ success: true }),
    })),
  } as Partial<KyInstance>
}

// Mock EventSource for SSE tests
export class MockEventSource {
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  readyState: number = 0
  CONNECTING = 0
  OPEN = 1
  CLOSED = 2

  constructor(url: string) {
    this.url = url
    // Simulate connection
    setTimeout(() => {
      this.readyState = 1
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
      // Auto-simulate workflow completion for async tests
      if (url.includes('/invoke/stream/')) {
        this.simulateWorkflowCompletion()
      }
    }, 10)
  }

  close() {
    this.readyState = 2
  }

  // Helper to simulate messages
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }))
    }
  }

  // Helper to simulate SSE workflow updates
  simulateWorkflowUpdate(update: { step: string; status: string; output?: string }) {
    this.simulateMessage(`data: ${JSON.stringify(update)}`)
  }

  // Auto-simulate workflow completion
  private simulateWorkflowCompletion() {
    setTimeout(() => {
      this.simulateMessage('data: {"type":"start","step":"step1","agentId":"developer_01"}')
      this.simulateMessage('data: {"type":"token","content":"Mock "}')
      this.simulateMessage('data: {"type":"token","content":"response"}')
      this.simulateMessage(
        'data: {"type":"complete","step":"step1","output":"Mock response","status":"completed"}'
      )
      this.simulateMessage('data: {"type":"workflow-complete","status":"completed"}')
    }, 50)
  }
}

// Mock the ky module
export function setupKyMocks(customResponses: Record<string, unknown> = {}) {
  const mockKy = createMockKy(customResponses)

  vi.mock('ky', () => ({
    default: mockKy,
    ky: mockKy,
  }))

  return mockKy
}

// Mock WorkflowOrchestrator to prevent real Claude SDK calls
export function mockWorkflowOrchestrator() {
  vi.mock('../../../services/WorkflowOrchestrator', () => ({
    WorkflowOrchestrator: {
      getInstance: vi.fn().mockReturnValue({
        executeWorkflow: vi.fn().mockResolvedValue({
          threadId: 'mock-thread-123',
          sessionIds: { developer: 'mock-session-123' },
          results: [
            {
              stepId: 'step1',
              agentId: 'dev_01',
              output: 'Mock output',
              status: 'completed',
            },
          ],
          status: 'completed',
        }),
        getWorkflowStatus: vi.fn().mockResolvedValue({
          status: 'completed',
          results: { step1: { output: 'Mock output', status: 'completed' } },
        }),
      }),
    },
  }))
}

// Mock ClaudeService to prevent real SDK calls
export function mockClaudeService() {
  vi.mock('../../../services/ClaudeService', () => ({
    ClaudeService: {
      getInstance: vi.fn().mockReturnValue({
        sendMessage: vi.fn().mockResolvedValue({
          content: 'Mock response',
          sessionId: 'mock-session-123',
        }),
        createSession: vi.fn().mockResolvedValue('mock-session-123'),
        abortSession: vi.fn().mockResolvedValue(true),
      }),
    },
  }))
}

// Setup all mocks for invoke tests
export function setupInvokeTestMocks(customResponses: Record<string, unknown> = {}) {
  const kyMocks = setupKyMocks(customResponses)
  mockWorkflowOrchestrator()
  mockClaudeService()

  // Mock EventSource globally
  // @ts-expect-error - Mocking EventSource for tests
  global.EventSource = MockEventSource

  return {
    kyMocks,
    MockEventSource,
  }
}

// Cleanup function
export function cleanupMocks() {
  vi.clearAllMocks()
  vi.resetModules()
}
