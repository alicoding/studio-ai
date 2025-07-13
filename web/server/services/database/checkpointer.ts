import { BaseCheckpointSaver, MemorySaver } from '@langchain/langgraph'

let checkpointerInstance: BaseCheckpointSaver | null = null
let initializationPromise: Promise<BaseCheckpointSaver> | null = null

/**
 * Get or create the workflow checkpointer based on environment configuration
 * Implements singleton pattern with async initialization support
 */
export async function getCheckpointer(): Promise<BaseCheckpointSaver> {
  // If already initialized, return the instance
  if (checkpointerInstance) {
    return checkpointerInstance
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise
  }

  // Start initialization
  initializationPromise = initializeCheckpointer()
  checkpointerInstance = await initializationPromise

  return checkpointerInstance
}

/**
 * Initialize the appropriate checkpointer based on environment configuration
 */
async function initializeCheckpointer(): Promise<BaseCheckpointSaver> {
  if (process.env.USE_POSTGRES_SAVER === 'true') {
    try {
      const connectionString = process.env.POSTGRES_CONNECTION_STRING
      const schema = process.env.POSTGRES_SCHEMA || 'workflow_checkpoints'

      if (!connectionString) {
        console.error('[Checkpointer] PostgresSaver enabled but POSTGRES_CONNECTION_STRING not set')
        console.log('[Checkpointer] Falling back to MemorySaver')
        return new MemorySaver()
      }

      console.log('[Checkpointer] Loading PostgresSaver module...')
      const { PostgresSaver } = await import('@langchain/langgraph-checkpoint-postgres')

      console.log('[Checkpointer] Getting PostgreSQL pool...')
      const { getPostgresPool } = await import('./postgres')
      const pool = getPostgresPool()

      console.log('[Checkpointer] Testing PostgreSQL connection...')
      // Test connection before setup
      await pool.query('SELECT 1')

      console.log('[Checkpointer] Initializing PostgresSaver with schema:', schema)
      // Use fromConnString which properly handles schema
      const postgresSaver = PostgresSaver.fromConnString(connectionString, {
        schema: schema,
      })

      // IMPORTANT: Must call setup() on first use to create tables
      console.log('[Checkpointer] Setting up PostgresSaver (creating tables if needed)...')
      await postgresSaver.setup()

      console.log('[Checkpointer] Successfully initialized PostgresSaver')
      return postgresSaver
    } catch (error) {
      console.error('[Checkpointer] Failed to initialize PostgresSaver:', error)
      console.log('[Checkpointer] Falling back to MemorySaver')
      return new MemorySaver()
    }
  }

  console.log('[Checkpointer] Using MemorySaver for workflow checkpoints')
  return new MemorySaver()
}

/**
 * Reset the checkpointer instance (useful for testing)
 */
export function resetCheckpointer(): void {
  checkpointerInstance = null
  initializationPromise = null
}
