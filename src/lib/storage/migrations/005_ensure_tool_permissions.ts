import type { Database } from 'better-sqlite3'

export const up = (_db: Database) => {
  // Migration already handled in database.ts
  console.log('Tool permissions migration - already handled')
}
