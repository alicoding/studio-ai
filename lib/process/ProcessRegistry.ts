/**
 * ProcessRegistry - Single Source of Truth for Agent Process Tracking
 * 
 * DRY principle: All process state managed here
 * SOLID: Single Responsibility - only handles process registry
 * KISS: Simple file-based storage with Map for performance
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { 
  AgentProcess, 
  ProcessRegistryData, 
  ProcessEvent,
  HealthCheck,
  AgentStatus 
} from './types.js'

export class ProcessRegistry extends EventEmitter {
  private static instance: ProcessRegistry | null = null
  private processes: Map<string, AgentProcess> = new Map()
  private readonly registryPath: string
  private healthCheckInterval: NodeJS.Timeout | null = null
  private isInitialized = false

  private constructor() {
    super()
    this.registryPath = path.join(os.tmpdir(), 'claude-agents', 'registry.json')
  }

  /**
   * Singleton pattern - ensure single registry across application
   */
  public static getInstance(): ProcessRegistry {
    if (!ProcessRegistry.instance) {
      ProcessRegistry.instance = new ProcessRegistry()
    }
    return ProcessRegistry.instance
  }

  /**
   * Initialize registry - load existing data and start health checks
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.ensureRegistryDirectory()
      await this.loadFromDisk()
      this.startHealthChecks()
      this.isInitialized = true
      
      console.log(`ProcessRegistry initialized with ${this.processes.size} existing processes`)
    } catch (error) {
      console.error('Failed to initialize ProcessRegistry:', error)
      throw error
    }
  }

  /**
   * Register a new agent process
   */  /**
   * Register a new agent process
   */
  public async register(process: AgentProcess): Promise<void> {
    this.processes.set(process.agentId, process)
    await this.saveToDisk()
    
    this.emit('process:registered', {
      type: 'spawn',
      agentId: process.agentId,
      projectId: process.projectId,
      data: process,
      timestamp: new Date()
    } as ProcessEvent)
  }

  /**
   * Update agent status
   */
  public async updateStatus(agentId: string, status: AgentStatus): Promise<void> {
    const process = this.processes.get(agentId)
    if (!process) {
      throw new Error(`Agent ${agentId} not found in registry`)
    }

    const oldStatus = process.status
    process.status = status
    process.lastActivity = new Date()
    
    await this.saveToDisk()
    
    this.emit('process:status-change', {
      type: 'status-change',
      agentId,
      projectId: process.projectId,
      data: { oldStatus, newStatus: status },
      timestamp: new Date()
    } as ProcessEvent)
  }

  /**
   * Get agent process by ID
   */
  public get(agentId: string): AgentProcess | undefined {
    return this.processes.get(agentId)
  }

  /**
   * Get all processes for a project
   */
  public getByProject(projectId: string): AgentProcess[] {
    return Array.from(this.processes.values())
      .filter(p => p.projectId === projectId)
  }

  /**
   * Get all online agents (for @mention autocomplete)
   */  /**
   * Get all online agents (for @mention autocomplete)
   */
  public getOnlineAgents(): AgentProcess[] {
    return Array.from(this.processes.values())
      .filter(p => p.status === 'online' || p.status === 'busy')
  }

  /**
   * Remove agent from registry
   */
  public async remove(agentId: string): Promise<void> {
    const process = this.processes.get(agentId)
    if (!process) return

    this.processes.delete(agentId)
    await this.saveToDisk()
    
    this.emit('process:removed', {
      type: 'cleanup',
      agentId,
      projectId: process.projectId,
      timestamp: new Date()
    } as ProcessEvent)
  }

  /**
   * Remove all agents for a project
   */
  public async removeProject(projectId: string): Promise<string[]> {
    const projectAgents = this.getByProject(projectId)
    const removedIds: string[] = []

    for (const agent of projectAgents) {
      await this.remove(agent.agentId)
      removedIds.push(agent.agentId)
    }

    return removedIds
  }

  /**
   * Health check all processes
   */
  public async performHealthCheck(): Promise<HealthCheck[]> {
    const results: HealthCheck[] = []
    
    for (const [agentId, process] of this.processes) {
      const result = await this.checkProcessHealth(process)
      results.push(result)
      
      // Update status if process is dead
      if (!result.isAlive && process.status !== 'offline') {
        console.warn(`Process ${agentId} (PID: ${process.pid}) is dead, marking offline`)
        await this.updateStatus(agentId, 'offline')
      }
    }
    
    return results
  }  /**
   * Check if a single process is alive
   */
  private async checkProcessHealth(process: AgentProcess): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      if (!process.pid) {
        return {
          agentId: process.agentId,
          isAlive: false,
          error: 'No PID assigned',
          lastSeen: process.lastActivity
        }
      }

      // Check if process exists using kill(0) - doesn't actually kill
      // Note: Using global process, not the AgentProcess object
      const nodejsProcess = globalThis.process
      nodejsProcess.kill(process.pid, 0)
      
      return {
        agentId: process.agentId,
        isAlive: true,
        responseTime: Date.now() - startTime,
        lastSeen: new Date()
      }
    } catch (error: any) {
      return {
        agentId: process.agentId,
        isAlive: false,
        error: error.message,
        lastSeen: process.lastActivity
      }
    }
  }

  /**
   * Start periodic health checks (every 30 seconds)
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) return

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, 30000) // 30 seconds

    console.log('Health check started (30s interval)')
  }

  /**
   * Stop health checks
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }  /**
   * Ensure registry directory exists
   */
  private async ensureRegistryDirectory(): Promise<void> {
    const dir = path.dirname(this.registryPath)
    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error
      }
    }
  }

  /**
   * Load registry from disk
   */
  private async loadFromDisk(): Promise<void> {
    try {
      const data = await fs.readFile(this.registryPath, 'utf-8')
      const registryData: ProcessRegistryData = JSON.parse(data)
      
      // Convert plain objects back to Map
      for (const [agentId, process] of Object.entries(registryData.processes)) {
        // Convert date strings back to Date objects
        process.lastActivity = new Date(process.lastActivity)
        this.processes.set(agentId, process)
      }
      
      console.log(`Loaded ${this.processes.size} processes from registry`)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Registry doesn't exist yet, start fresh
        console.log('No existing registry found, starting fresh')
        return
      }
      console.error('Failed to load registry:', error)
      throw error
    }
  }

  /**
   * Save registry to disk
   */
  private async saveToDisk(): Promise<void> {
    try {
      const registryData: ProcessRegistryData = {
        processes: Object.fromEntries(this.processes),
        lastCleanup: new Date(),
        version: '1.0.0'
      }
      
      await fs.writeFile(
        this.registryPath,
        JSON.stringify(registryData, null, 2),
        'utf-8'
      )
    } catch (error) {
      console.error('Failed to save registry:', error)
      throw error
    }
  }

  /**
   * Get registry statistics
   */
  public getStats() {
    const statusCounts = {
      ready: 0,
      online: 0,
      busy: 0,
      offline: 0
    }

    const projectCounts: Record<string, number> = {}

    for (const process of this.processes.values()) {
      statusCounts[process.status]++
      projectCounts[process.projectId] = (projectCounts[process.projectId] || 0) + 1
    }

    return {
      totalProcesses: this.processes.size,
      statusCounts,
      projectCounts,
      registryPath: this.registryPath
    }
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    this.stopHealthChecks()
    await this.saveToDisk()
    this.removeAllListeners()
    ProcessRegistry.instance = null
    console.log('ProcessRegistry shutdown complete')
  }
}