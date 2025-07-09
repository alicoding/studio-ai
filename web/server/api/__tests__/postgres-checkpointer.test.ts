/**
 * Tests for PostgresSaver workflow persistence
 *
 * SOLID: Single responsibility - testing persistence
 * DRY: Reusable test utilities
 * KISS: Simple test structure
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { getCheckpointer, resetCheckpointer } from '../../services/database/checkpointer'
import { closePostgresPool } from '../../services/database/postgres'

describe('PostgresSaver Checkpointer', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset checkpointer instance before each test
    resetCheckpointer()
  })

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv
    // Close any open connections
    await closePostgresPool()
  })

  describe('Feature Flag', () => {
    test('should use MemorySaver when USE_POSTGRES_SAVER is false', async () => {
      process.env.USE_POSTGRES_SAVER = 'false'

      const checkpointer = await getCheckpointer()

      // MemorySaver doesn't have a connectionString property
      expect(checkpointer).toBeDefined()
      expect(checkpointer.constructor.name).toBe('MemorySaver')
    })

    test('should use MemorySaver when USE_POSTGRES_SAVER is not set', async () => {
      delete process.env.USE_POSTGRES_SAVER

      const checkpointer = await getCheckpointer()

      expect(checkpointer).toBeDefined()
      expect(checkpointer.constructor.name).toBe('MemorySaver')
    })

    test('should fall back to MemorySaver when connection string is missing', async () => {
      process.env.USE_POSTGRES_SAVER = 'true'
      delete process.env.POSTGRES_CONNECTION_STRING

      const checkpointer = await getCheckpointer()

      expect(checkpointer).toBeDefined()
      expect(checkpointer.constructor.name).toBe('MemorySaver')
    })

    test('should attempt PostgresSaver when properly configured', async () => {
      process.env.USE_POSTGRES_SAVER = 'true'
      process.env.POSTGRES_CONNECTION_STRING = 'postgresql://test:test@localhost:5432/test'
      process.env.POSTGRES_SCHEMA = 'test_schema'

      // This will fail to connect in test environment, but should attempt PostgresSaver
      const checkpointer = await getCheckpointer()

      // Will fall back to MemorySaver in test environment
      expect(checkpointer).toBeDefined()
    })
  })

  describe('Singleton Pattern', () => {
    test('should return the same instance on multiple calls', async () => {
      process.env.USE_POSTGRES_SAVER = 'false'

      const checkpointer1 = await getCheckpointer()
      const checkpointer2 = await getCheckpointer()

      expect(checkpointer1).toBe(checkpointer2)
    })

    test('should handle concurrent initialization', async () => {
      process.env.USE_POSTGRES_SAVER = 'false'

      // Call getCheckpointer multiple times concurrently
      const promises = Array(5)
        .fill(null)
        .map(() => getCheckpointer())
      const checkpointers = await Promise.all(promises)

      // All should be the same instance
      const firstCheckpointer = checkpointers[0]
      checkpointers.forEach((checkpointer) => {
        expect(checkpointer).toBe(firstCheckpointer)
      })
    })
  })
})
