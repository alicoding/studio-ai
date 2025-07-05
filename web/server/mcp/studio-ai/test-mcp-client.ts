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
  private pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>()
  private buffer = ''

  constructor(private command: string, private args: string[], private env?: Record<string, string>) {}

  async start() {
    this.process = spawn(this.command, this.args, {
      env: { ...process.env, ...this.env },
      stdio: ['pipe', 'pipe', 'pipe']
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
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  async sendRequest(method: string, params?: unknown): Promise<unknown> {
    const id = ++this.requestId
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
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
  console.log('Testing Studio AI MCP Server...\n')

  const client = new MCPClient(
    'node',
    ['dist/index.js'],
    { CLAUDE_STUDIO_API: 'http://localhost:3456/api' }
  )

  try {
    await client.start()
    console.log('✅ Server started\n')

    // Test listing tools
    console.log('Testing tools/list...')
    const tools = await client.sendRequest('tools/list')
    console.log('Tools:', JSON.stringify(tools, null, 2))
    console.log('✅ Listed tools\n')

    // Test calling tool with command (using the test-search capability we created)
    console.log('Testing tools/call with command...')
    const commandResult = await client.sendRequest('tools/call', {
      name: 'studio-ai',
      arguments: {
        type: 'command',
        input: '#search TypeScript best practices',
        capability: '#search'
      }
    })
    console.log('Command result:', JSON.stringify(commandResult, null, 2))
    console.log('✅ Command call completed\n')

    // Test calling tool with mention
    console.log('Testing tools/call with mention...')
    const mentionResult = await client.sendRequest('tools/call', {
      name: 'studio-ai',
      arguments: {
        type: 'mention',
        input: '@reviewer check this code',
        capability: '@reviewer'
      }
    })
    console.log('Mention result:', JSON.stringify(mentionResult, null, 2))
    console.log('✅ Mention call completed\n')

    console.log('All tests passed! ✨')
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await client.stop()
  }
}

// Run tests
testMCPServer().catch(console.error)