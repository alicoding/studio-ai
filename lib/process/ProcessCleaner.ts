/**
 * ProcessCleaner - Zombie Process Detection and Cleanup
 * 
 * SOLID: Single Responsibility - only handles zombie cleanup
 * KISS: Simple process detection and force kill
 * Library-First: Uses built-in Node.js process utilities
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { ProcessRegistry } from './ProcessRegistry.js'
import { CleanupResult } from './types.js'

const execAsync = promisify(exec)

export class ProcessCleaner {
  private static instance: ProcessCleaner | null = null
  private registry: ProcessRegistry

  private constructor() {
    this.registry = ProcessRegistry.getInstance()
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): ProcessCleaner {
    if (!ProcessCleaner.instance) {
      ProcessCleaner.instance = new ProcessCleaner()
    }
    return ProcessCleaner.instance
  }

  /**
   * Detect and clean zombie Claude processes
   * 
   * This addresses the core issue: 30+ Claude processes running without cleanup
   */
  public async cleanupZombies(): Promise<CleanupResult> {
    console.log('Starting zombie process cleanup...')
    
    const result: CleanupResult = {
      killedProcesses: [],
      errors: [],
      registryUpdated: false
    }

    try {
      // Find all Claude processes on the system
      const claudeProcesses = await this.findClaudeProcesses()
      
      // Get registered processes from registry
      const registeredPids = new Set<number>()
      const registryStats = this.registry.getStats()
      
      // Build set of legitimate PIDs
      for (const projectCounts of Object.values(registryStats.statusCounts)) {
        // Get all registered processes and their PIDs
        const allProcesses = Array.from(this.registry['processes'].values())
        for (const process of allProcesses) {
          if (process.pid) {
            registeredPids.add(process.pid)
          }
        }
      }

      console.log(`Found ${claudeProcesses.length} Claude processes, ${registeredPids.size} registered`)

      // Kill processes that aren't in our registry (zombies)
      for (const processInfo of claudeProcesses) {
        if (!registeredPids.has(processInfo.pid)) {
          try {
            await this.forceKillProcess(processInfo.pid)
            result.killedProcesses.push(`PID ${processInfo.pid}: ${processInfo.command}`)
            console.log(`Killed zombie process PID ${processInfo.pid}`)
          } catch (error: any) {
            result.errors.push({
              agentId: `PID-${processInfo.pid}`,
              error: error.message
            })
            console.error(`Failed to kill PID ${processInfo.pid}:`, error.message)
          }
        }
      }

      // Also cleanup dead entries from registry
      await this.cleanupDeadRegistryEntries()
      result.registryUpdated = true

      console.log(`Cleanup complete: killed ${result.killedProcesses.length} zombies, ${result.errors.length} errors`)
      return result

    } catch (error: any) {
      console.error('Zombie cleanup failed:', error)
      result.errors.push({
        agentId: 'system',
        error: error.message
      })
      return result
    }
  }  /**
   * Find all Claude processes on the system
   */
  private async findClaudeProcesses(): Promise<Array<{pid: number, command: string}>> {
    try {
      // Only look for actual Claude Code CLI processes, not the server or other claude-related processes
      // This is more specific to avoid catching the server or other unrelated processes
      const { stdout } = await execAsync(`ps aux | grep -E "@anthropic-ai/claude-code|claude-code\\s+(--api|api)" | grep -v grep`)
      
      const processes: Array<{pid: number, command: string}> = []
      const lines = stdout.trim().split('\n').filter(line => line.length > 0)
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        const pid = parseInt(parts[1])
        const command = parts.slice(10).join(' ')
        
        if (!isNaN(pid) && pid > 0) {
          // Only include actual Claude Code agent processes
          if (command.includes('@anthropic-ai/claude-code') || 
              (command.includes('claude-code') && (command.includes('--api') || command.includes('api')))) {
            processes.push({ pid, command })
          }
        }
      }

      return processes
    } catch (error) {
      // No matching processes found - that's OK
      return []
    }
  }

  /**
   * Force kill a process by PID
   */
  private async forceKillProcess(pid: number): Promise<void> {
    try {
      // Try SIGTERM first (graceful)
      process.kill(pid, 'SIGTERM')
      
      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check if still running, then SIGKILL
      try {
        process.kill(pid, 0) // Check if exists
        process.kill(pid, 'SIGKILL') // Force kill
        console.log(`Force killed PID ${pid}`)
      } catch (error: any) {
        if (error.code === 'ESRCH') {
          // Process already gone - that's what we wanted
          return
        }
        throw error
      }
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        // Process doesn't exist - already cleaned up
        return
      }
      throw error
    }
  }  /**
   * Clean up dead entries from registry
   */
  private async cleanupDeadRegistryEntries(): Promise<void> {
    const healthChecks = await this.registry.performHealthCheck()
    
    for (const check of healthChecks) {
      if (!check.isAlive) {
        console.log(`Removing dead registry entry: ${check.agentId}`)
        await this.registry.remove(check.agentId)
      }
    }
  }

  /**
   * Emergency cleanup - kill ALL Claude processes (nuclear option)
   */
  public async emergencyCleanup(): Promise<CleanupResult> {
    console.warn('EMERGENCY CLEANUP: Killing ALL Claude processes')
    
    const result: CleanupResult = {
      killedProcesses: [],
      errors: [],
      registryUpdated: false
    }

    try {
      const allClaudeProcesses = await this.findClaudeProcesses()
      
      for (const processInfo of allClaudeProcesses) {
        try {
          await this.forceKillProcess(processInfo.pid)
          result.killedProcesses.push(`PID ${processInfo.pid}: ${processInfo.command}`)
        } catch (error: any) {
          result.errors.push({
            agentId: `PID-${processInfo.pid}`,
            error: error.message
          })
        }
      }

      // Clear entire registry
      const allAgentIds = Array.from(this.registry['processes'].keys())
      for (const agentId of allAgentIds) {
        await this.registry.remove(agentId)
      }
      result.registryUpdated = true

      console.warn(`Emergency cleanup complete: killed ${result.killedProcesses.length} processes`)
      return result

    } catch (error: any) {
      result.errors.push({
        agentId: 'emergency-cleanup',
        error: error.message
      })
      return result
    }
  }

  /**
   * Get current system Claude process count
   */
  public async getClaudeProcessCount(): Promise<number> {
    const processes = await this.findClaudeProcesses()
    return processes.length
  }

  /**
   * Check if cleanup is needed
   */
  public async needsCleanup(): Promise<boolean> {
    const systemProcesses = await this.findClaudeProcesses()
    const registryCount = this.registry.getStats().totalProcesses
    
    // If system has more Claude processes than registry, cleanup needed
    return systemProcesses.length > registryCount
  }
}