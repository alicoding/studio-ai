import type { Database } from 'better-sqlite3'

export const migration = {
  up: (_db: Database) => {
    // Migration already handled in database.ts
    console.log('Timestamp fix migration - already handled')
  },
}
