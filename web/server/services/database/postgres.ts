import { Pool, PoolConfig } from 'pg'

let pool: Pool | null = null

export interface PostgresConfig extends PoolConfig {
  connectionString?: string
  max?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
}

/**
 * Create or get the PostgreSQL connection pool
 * Implements singleton pattern for connection reuse
 */
export function getPostgresPool(): Pool {
  if (!pool) {
    const config: PostgresConfig = {
      connectionString: process.env.POSTGRES_CONNECTION_STRING,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
      connectionTimeoutMillis: 2000, // How long to wait for a connection
    }

    if (!config.connectionString) {
      throw new Error('POSTGRES_CONNECTION_STRING environment variable is not set')
    }

    pool = new Pool(config)

    // Log successful connection
    pool.on('connect', () => {
      console.log('[POSTGRES] Client connected to pool')
    })

    // Log errors
    pool.on('error', (err) => {
      console.error('[POSTGRES] Unexpected error on idle client', err)
    })

    console.log('[POSTGRES] Connection pool created', {
      connectionString: config.connectionString.replace(/:[^@]+@/, ':***@'), // Hide password
      maxClients: config.max,
    })
  }

  return pool
}

/**
 * Check if PostgreSQL connection is healthy
 */
export async function checkPostgresHealth(): Promise<boolean> {
  try {
    const client = await getPostgresPool().connect()
    try {
      const result = await client.query('SELECT 1')
      return result.rowCount === 1
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('[POSTGRES] Health check failed', error)
    return false
  }
}

/**
 * Close the PostgreSQL connection pool
 */
export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log('[POSTGRES] Connection pool closed')
  }
}

/**
 * Execute a query with automatic client management
 */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await getPostgresPool().connect()
  try {
    const result = await client.query<T>(text, params)
    return result.rows
  } finally {
    client.release()
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPostgresPool().connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
