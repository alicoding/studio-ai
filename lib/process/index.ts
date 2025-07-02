/**
 * Process Management Library - Main Exports
 * 
 * The ProcessManager/ProcessRegistry/ProcessCleaner trinity for managing
 * agent processes across multiple projects with proper zombie cleanup.
 */

export { ProcessManager } from './ProcessManager.js'
export { ProcessRegistry } from './ProcessRegistry.js'
export { ProcessCleaner } from './ProcessCleaner.js'

export type {
  AgentProcess,
  AgentStatus,
  AgentConfig,
  SpawnOptions,
  ProcessEvent,
  ProcessEventHandler,
  HealthCheck,
  CleanupResult,
  ProcessRegistryData
} from './types.js'

/**
 * Convenience function to initialize the entire process management system
 */
export async function initializeProcessManagement() {
  const processManager = ProcessManager.getInstance()
  await processManager.initialize()
  
  console.log('Process management system initialized')
  return {
    processManager,
    registry: ProcessRegistry.getInstance(),
    cleaner: ProcessCleaner.getInstance()
  }
}

/**
 * Convenience function for emergency cleanup
 */
export async function emergencyCleanupAllClaude() {
  const cleaner = ProcessCleaner.getInstance()
  return await cleaner.emergencyCleanup()
}