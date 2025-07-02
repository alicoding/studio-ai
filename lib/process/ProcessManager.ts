/**
 * ProcessManager - Agent Lifecycle Management
 * 
 * SOLID: Single Responsibility - manages agent spawning and lifecycle
 * DRY: Reuses ProcessRegistry for state management
 * KISS: Simple spawn/kill operations with Claude SDK
 */

import { spawn, ChildProcess } from 'child_process'
import { ProcessRegistry } from './ProcessRegistry.js'
import { IPCClient } from '../ipc/IPCClient.js'
import { 
  AgentProcess, 
  AgentConfig, 
  SpawnOptions
} from './types.js'

export class ProcessManager {
  private static instance: ProcessManager | null = null
  private registry: ProcessRegistry
  private ipcClient: IPCClient
  private activeProcesses: Map<string, ChildProcess> = new Map()

  private constructor() {
    this.registry = ProcessRegistry.getInstance()
    this.ipcClient = new IPCClient()
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager()
    }
    return ProcessManager.instance
  }

  /**
   * Initialize the process manager
   */
  public async initialize(): Promise<void> {
    await this.registry.initialize()
    // Don't setup signal handlers here - let the server handle graceful shutdown
    // this.setupSignalHandlers()
    console.log('ProcessManager initialized')
  }

  /**
   * Spawn a new agent process
   * 
   * Following plan.md: Agent starts in 'ready' state, NOT auto-executing
   */
  public async spawnAgent(
    agentId: string,
    projectId: string,
    config: AgentConfig,
    options: SpawnOptions = {}
  ): Promise<AgentProcess> {
    // Check if agent already exists
    const existing = this.registry.get(agentId)
    if (existing && existing.pid) {
      throw new Error(`Agent ${agentId} already running with PID ${existing.pid}`)
    }

    try {
      // Create agent process entry
      const agentProcess: AgentProcess = {
        agentId,
        projectId,
        pid: null,
        status: 'ready', // Start in ready state - DON'T auto-execute
        sessionId: options.sessionId || null,
        lastActivity: new Date(),
        role: config.role,
        config
      }

      // Spawn the Claude process
      const childProcess = await this.spawnClaudeProcess(agentProcess, options)
      
      // Update with actual PID
      agentProcess.pid = childProcess.pid || null
      
      // Register in registry
      await this.registry.register(agentProcess)
      
      // Track active process
      this.activeProcesses.set(agentId, childProcess)

      console.log(`Spawned agent ${agentId} (PID: ${agentProcess.pid}) in project ${projectId}`)
      return agentProcess
    } catch (error) {
      console.error(`Failed to spawn agent ${agentId}:`, error)
      throw error
    }
  }  /**
   * Spawn Claude process using the SDK approach
   */
  private async spawnClaudeProcess(
    agentProcess: AgentProcess,
    options: SpawnOptions
  ): Promise<ChildProcess> {
    const cwd = options.projectPath || process.cwd()
    
    // Build Claude command - using npm run claude to ensure proper environment
    const claudeArgs = [
      'run',
      'claude',
      '--',
      '--role', agentProcess.role
    ]

    // Add session ID if resuming
    if (options.sessionId) {
      claudeArgs.push('--resume', options.sessionId)
    }

    // Add max tokens if specified
    if (agentProcess.config?.maxTokens) {
      claudeArgs.push('--max-tokens', agentProcess.config.maxTokens.toString())
    }

    // Add tool configuration via CLI flags
    if (agentProcess.config?.tools && agentProcess.config.tools.length > 0) {
      // Use --allowedTools to specify which tools this agent can use
      claudeArgs.push('--allowedTools', ...agentProcess.config.tools)
    }

    // Setup environment variables
    const processEnv: any = {
      ...process.env,
      ...options.env,
      CLAUDE_AGENT_ID: agentProcess.agentId,
      CLAUDE_PROJECT_ID: agentProcess.projectId
    }

    const childProcess = spawn('npm', claudeArgs, {
      cwd,
      env: processEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false // Keep as child process for proper cleanup
    })

    // Handle process events
    childProcess.on('spawn', () => {
      console.log(`Claude process spawned for agent ${agentProcess.agentId}`)
    })

    childProcess.on('error', (error) => {
      console.error(`Claude process error for agent ${agentProcess.agentId}:`, error)
      this.handleProcessError(agentProcess.agentId, error)
    })

    childProcess.on('exit', (code, signal) => {
      console.log(`Claude process exited for agent ${agentProcess.agentId} (code: ${code}, signal: ${signal})`)
      this.handleProcessExit(agentProcess.agentId, code, signal)
    })

    return childProcess
  }


  /**
   * Kill an agent process gracefully
   */
  public async killAgent(agentId: string): Promise<void> {
    const process = this.registry.get(agentId)
    if (!process) {
      console.warn(`Agent ${agentId} not found in registry`)
      return
    }

    const childProcess = this.activeProcesses.get(agentId)
    if (childProcess && !childProcess.killed) {
      try {
        // Try graceful shutdown first
        childProcess.kill('SIGTERM')
        
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (!childProcess.killed) {
            console.warn(`Force killing agent ${agentId}`)
            childProcess.kill('SIGKILL')
          }
        }, 5000)
      } catch (error) {
        console.error(`Error killing agent ${agentId}:`, error)
      }
    }

    // Remove from tracking
    this.activeProcesses.delete(agentId)
    await this.registry.remove(agentId)
  }  /**
   * Kill all agents for a project
   */
  public async killProject(projectId: string): Promise<void> {
    const projectAgents = this.registry.getByProject(projectId)
    
    console.log(`Killing ${projectAgents.length} agents for project ${projectId}`)
    
    // Kill all agents in parallel
    const killPromises = projectAgents.map(agent => this.killAgent(agent.agentId))
    await Promise.allSettled(killPromises)
    
    console.log(`Project ${projectId} cleanup complete`)
  }

  /**
   * Kill all active agents
   */
  public async killAll(): Promise<void> {
    const allProcesses = Array.from(this.activeProcesses.keys())
    
    console.log(`Killing ${allProcesses.length} active agents`)
    
    const killPromises = allProcesses.map(agentId => this.killAgent(agentId))
    await Promise.allSettled(killPromises)
    
    console.log('All agents killed')
  }

  /**
   * Change agent status (for play/pause button)
   */
  public async setAgentStatus(agentId: string, status: 'online' | 'offline'): Promise<void> {
    const process = this.registry.get(agentId)
    if (!process) {
      throw new Error(`Agent ${agentId} not found`)
    }

    // Update registry
    await this.registry.updateStatus(agentId, status)
    
    // Note: We keep the PID alive even when paused
    // The agent will just ignore incoming messages when offline
    console.log(`Agent ${agentId} status changed to ${status}`)
  }

  /**
   * Auto-respawn agent on @mention if process is dead but sessionId exists
   */
  public async ensureAgentAlive(agentId: string): Promise<AgentProcess> {
    const process = this.registry.get(agentId)
    if (!process) {
      throw new Error(`Agent ${agentId} not found in registry`)
    }

    // Check if process is actually alive
    const healthCheck = await this.registry.performHealthCheck()
    const agentHealth = healthCheck.find(h => h.agentId === agentId)
    
    if (agentHealth?.isAlive) {
      return process // Already alive
    }

    // Process is dead but we have sessionId - respawn it
    if (process.sessionId && process.config) {
      console.log(`Auto-respawning dead agent ${agentId} with session ${process.sessionId}`)
      
      // Remove dead entry first
      await this.registry.remove(agentId)
      
      // Respawn with same session
      return await this.spawnAgent(
        agentId,
        process.projectId,
        process.config,
        { sessionId: process.sessionId }
      )
    }

    throw new Error(`Cannot respawn agent ${agentId}: no sessionId available`)
  }  /**
   * Handle process errors
   */
  private async handleProcessError(agentId: string, error: Error): Promise<void> {
    console.error(`Process error for agent ${agentId}:`, error)
    
    await this.registry.updateStatus(agentId, 'offline')
    this.activeProcesses.delete(agentId)
  }

  /**
   * Handle process exit
   */
  private async handleProcessExit(
    agentId: string, 
    code: number | null, 
    signal: NodeJS.Signals | null
  ): Promise<void> {
    console.log(`Agent ${agentId} exited with code ${code}, signal ${signal}`)
    
    // Update registry status
    await this.registry.updateStatus(agentId, 'offline')
    
    // Remove from active tracking
    this.activeProcesses.delete(agentId)
  }



  /**
   * Get IPC client for inter-agent communication
   */
  public getIPCClient(): IPCClient {
    return this.ipcClient
  }

  /**
   * Get process manager statistics
   */
  public getStats() {
    return {
      activeProcesses: this.activeProcesses.size,
      registryStats: this.registry.getStats()
    }
  }

  /**
   * Get all agents for @mention autocomplete
   */
  public getOnlineAgents(): AgentProcess[] {
    return this.registry.getOnlineAgents()
  }

  /**
   * Get all agents for a specific project
   */
  public getProjectAgents(projectId: string): AgentProcess[] {
    return this.registry.getByProject(projectId)
  }

  /**
   * Shutdown the process manager
   */
  public async shutdown(): Promise<void> {
    await this.killAll()
    await this.registry.shutdown()
    ProcessManager.instance = null
    console.log('ProcessManager shutdown complete')
  }
}