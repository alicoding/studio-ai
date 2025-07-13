#!/usr/bin/env tsx
import { spawn } from 'child_process'

interface MCPRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: unknown
}

interface MCPResponse {
  jsonrpc: '2.0'
  id: number
  result?: unknown
  error?: {
    message: string
  }
}

class MCPClient {
  private process: ReturnType<typeof spawn> | null = null
  private requestId = 0
  private pendingRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason: Error) => void }
  >()
  private buffer = ''

  constructor(
    private command: string,
    private args: string[],
    private env?: Record<string, string>
  ) {}

  async start() {
    this.process = spawn(this.command, this.args, {
      env: { ...process.env, ...this.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.process?.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString()
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line) as MCPResponse
            const pending = this.pendingRequests.get(response.id)
            if (pending) {
              this.pendingRequests.delete(response.id)
              if (response.error) {
                pending.reject(new Error(response.error.message))
              } else {
                pending.resolve(response.result)
              }
            }
          } catch (_e) {
            console.error('Failed to parse response:', line)
          }
        }
      }
    })

    this.process?.stderr?.on('data', (data: Buffer) => {
      console.error('MCP Server Error:', data.toString())
    })

    // Wait a bit for server to start
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  async sendRequest(method: string, params?: unknown): Promise<unknown> {
    const id = ++this.requestId
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })
      this.process?.stdin.write(JSON.stringify(request) + '\n')

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Request timeout'))
        }
      }, 5000)
    })
  }

  async stop() {
    if (this.process) {
      this.process.kill()
    }
  }
}

async function testMCPServer() {
  console.log('Testing Refactored Studio AI MCP Server...\n')

  const client = new MCPClient('node', ['dist/index.js'], {
    CLAUDE_STUDIO_API: 'http://localhost:3456/api',
  })

  try {
    await client.start()
    console.log('✅ Server started\n')

    // Test listing tools
    console.log('Testing tools/list...')
    const toolsResponse = (await client.sendRequest('tools/list')) as {
      tools: Array<{ name: string; description: string }>
    }
    console.log(`Found ${toolsResponse.tools.length} tools:`)
    toolsResponse.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`)
    })
    console.log('✅ Listed tools\n')

    // Test list_agents
    console.log('Testing list_agents...')
    const agentsResult = await client.sendRequest('tools/call', {
      name: 'list_agents',
      arguments: {},
    })
    console.log('Agents result:', JSON.stringify(agentsResult, null, 2))
    console.log('✅ list_agents completed\n')

    // Test list_capabilities
    console.log('Testing list_capabilities...')
    const capabilitiesResult = await client.sendRequest('tools/call', {
      name: 'list_capabilities',
      arguments: {},
    })
    console.log('Capabilities result:', JSON.stringify(capabilitiesResult, null, 2))
    console.log('✅ list_capabilities completed\n')

    // Test mention
    console.log('Testing mention...')
    const mentionResult = await client.sendRequest('tools/call', {
      name: 'mention',
      arguments: {
        to: 'researcher',
        message: 'What are the latest TypeScript features?',
        wait: false,
      },
    })
    console.log('Mention result:', JSON.stringify(mentionResult, null, 2))
    console.log('✅ mention completed\n')

    // Test batch_messages
    console.log('Testing batch_messages...')
    const batchResult = await client.sendRequest('tools/call', {
      name: 'batch_messages',
      arguments: {
        messages: [
          {
            id: 'msg1',
            to: 'researcher',
            content: 'Research topic A',
          },
          {
            id: 'msg2',
            to: 'debugger',
            content: 'Debug issue B',
            dependencies: ['msg1'],
          },
        ],
        waitStrategy: 'none',
      },
    })
    console.log('Batch result:', JSON.stringify(batchResult, null, 2))
    console.log('✅ batch_messages completed\n')

    // Test a capability execution (if any exist)
    const tools = toolsResponse.tools
    const capabilityTool = tools.find((t) => t.name.startsWith('execute_'))
    if (capabilityTool) {
      console.log(`Testing ${capabilityTool.name}...`)
      const capabilityResult = await client.sendRequest('tools/call', {
        name: capabilityTool.name,
        arguments: {
          input: 'Test input for capability',
          context: {
            projectId: 'test-project',
          },
        },
      })
      console.log('Capability result:', JSON.stringify(capabilityResult, null, 2))
      console.log(`✅ ${capabilityTool.name} completed\n`)
    }

    console.log('All tests passed! ✨')
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await client.stop()
  }
}

// Run tests
testMCPServer().catch(console.error)
