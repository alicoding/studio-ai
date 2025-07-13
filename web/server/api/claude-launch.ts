/**
 * API endpoint to launch Claude with custom environment variables
 * This allows Studio to pass context like project ID, agent ID, etc.
 */

import { Router } from 'express'
import { spawn } from 'child_process'
import type { Request, Response } from 'express'

const router = Router()

interface LaunchClaudeRequest {
  workingDirectory?: string
  environmentVariables?: Record<string, string>
  mcpConfig?: {
    servers?: Record<
      string,
      {
        command: string
        args: string[]
        env?: Record<string, string>
      }
    >
  }
  prompt?: string
}

/**
 * Launch Claude with custom environment variables
 *
 * @example
 * POST /api/claude/launch
 * {
 *   "workingDirectory": "/path/to/project",
 *   "environmentVariables": {
 *     "CLAUDE_STUDIO_PROJECT_ID": "my-project",
 *     "CLAUDE_STUDIO_AGENT_ID": "dev_01",
 *     "CLAUDE_STUDIO_SESSION_ID": "session-123",
 *     "CLAUDE_STUDIO_API": "http://localhost:3456/api"
 *   },
 *   "mcpConfig": {
 *     "servers": {
 *       "studio-ai": {
 *         "command": "node",
 *         "args": ["path/to/studio-ai/index.js"],
 *         "env": {
 *           "CLAUDE_STUDIO_PROJECT_ID": "{projectId}",
 *           "CLAUDE_STUDIO_AGENT_ID": "{agentId}"
 *         }
 *       }
 *     }
 *   },
 *   "prompt": "Initial prompt to send to Claude"
 * }
 */
router.post('/launch', async (req: Request, res: Response) => {
  try {
    const {
      workingDirectory,
      environmentVariables = {},
      mcpConfig,
      prompt,
    }: LaunchClaudeRequest = req.body

    // Validate required fields
    if (!workingDirectory) {
      return res.status(400).json({
        error: 'workingDirectory is required',
      })
    }

    // Process MCP config to replace template variables
    let processedMcpConfig = mcpConfig
    if (mcpConfig?.servers) {
      processedMcpConfig = {
        ...mcpConfig,
        servers: Object.entries(mcpConfig.servers).reduce(
          (acc, [name, config]) => {
            // Replace template variables in env
            let processedEnv = config.env || {}
            if (config.env) {
              processedEnv = Object.entries(config.env).reduce(
                (envAcc, [key, value]) => {
                  // Replace template variables like {projectId} with actual values
                  let processedValue = value
                  processedValue = processedValue.replace(
                    '{projectId}',
                    environmentVariables.CLAUDE_STUDIO_PROJECT_ID || ''
                  )
                  processedValue = processedValue.replace(
                    '{agentId}',
                    environmentVariables.CLAUDE_STUDIO_AGENT_ID || ''
                  )
                  processedValue = processedValue.replace(
                    '{sessionId}',
                    environmentVariables.CLAUDE_STUDIO_SESSION_ID || ''
                  )
                  processedValue = processedValue.replace('{workspace}', workingDirectory)
                  processedValue = processedValue.replace(
                    '{apiUrl}',
                    environmentVariables.CLAUDE_STUDIO_API || ''
                  )

                  envAcc[key] = processedValue
                  return envAcc
                },
                {} as Record<string, string>
              )
            }

            acc[name] = {
              ...config,
              env: processedEnv,
            }
            return acc
          },
          {} as typeof mcpConfig.servers
        ),
      }
    }

    // Build the claude command
    const claudeArgs = ['--cwd', workingDirectory]

    // Add MCP config if provided
    if (processedMcpConfig) {
      // Write MCP config to a temporary file or pass it via stdin
      // For now, we'll use environment variable approach
      environmentVariables.CLAUDE_MCP_CONFIG = JSON.stringify(processedMcpConfig)
    }

    // Add initial prompt if provided
    if (prompt) {
      claudeArgs.push('--query', prompt)
    }

    // Spawn Claude process with custom environment
    const claudeProcess = spawn('claude', claudeArgs, {
      env: {
        ...process.env,
        ...environmentVariables,
      },
      cwd: workingDirectory,
      stdio: 'inherit', // This allows Claude to interact with the terminal
    })

    // Track the process
    const processInfo = {
      pid: claudeProcess.pid,
      workingDirectory,
      environmentVariables: Object.keys(environmentVariables),
      startedAt: new Date().toISOString(),
    }

    // Handle process events
    claudeProcess.on('error', (error) => {
      console.error('Error launching Claude:', error)
    })

    claudeProcess.on('exit', (code, signal) => {
      console.log(`Claude process exited with code ${code} and signal ${signal}`)
    })

    res.json({
      success: true,
      processInfo,
      message: 'Claude launched successfully with custom environment',
    })
  } catch (error) {
    console.error('Error launching Claude:', error)
    res.status(500).json({
      error: 'Failed to launch Claude',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Test the environment variable propagation
 * This endpoint helps verify that environment variables are being passed correctly
 */
router.post('/test-env', async (req: Request, res: Response) => {
  try {
    const { environmentVariables = {} } = req.body

    // Create a simple test script that outputs environment variables
    const testScript = `
      console.log('=== Claude Studio Environment Variables ===');
      console.log('CLAUDE_STUDIO_PROJECT_ID:', process.env.CLAUDE_STUDIO_PROJECT_ID);
      console.log('CLAUDE_STUDIO_AGENT_ID:', process.env.CLAUDE_STUDIO_AGENT_ID);
      console.log('CLAUDE_STUDIO_SESSION_ID:', process.env.CLAUDE_STUDIO_SESSION_ID);
      console.log('CLAUDE_STUDIO_WORKSPACE:', process.env.CLAUDE_STUDIO_WORKSPACE);
      console.log('CLAUDE_STUDIO_API:', process.env.CLAUDE_STUDIO_API);
      console.log('==========================================');
    `

    const testProcess = spawn('node', ['-e', testScript], {
      env: {
        ...process.env,
        ...environmentVariables,
      },
    })

    let output = ''
    testProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    testProcess.stderr.on('data', (data) => {
      output += data.toString()
    })

    await new Promise((resolve) => {
      testProcess.on('exit', resolve)
    })

    res.json({
      success: true,
      output,
      environmentVariables: Object.keys(environmentVariables),
    })
  } catch (error) {
    console.error('Error testing environment:', error)
    res.status(500).json({
      error: 'Failed to test environment',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
