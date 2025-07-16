/**
 * Migration Runner
 *
 * SOLID: Single responsibility - database migrations
 * KISS: Simple migration execution
 * Library-First: Uses better-sqlite3
 */

import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(process.env.HOME || '', '.studio-ai', 'studio.db')

function runMigrations() {
  console.log('Running database migrations...')

  const db = new Database(DB_PATH)

  // Get all migration files
  const migrationFiles = fs
    .readdirSync(__dirname)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of migrationFiles) {
    const migrationName = file.replace('.sql', '')

    // Check if migration already applied
    const existing = db.prepare('SELECT * FROM migrations WHERE name = ?').get(migrationName)
    if (existing) {
      console.log(`✅ Migration ${migrationName} already applied`)
      continue
    }

    // Read and execute migration
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf-8')

    try {
      db.exec(sql)

      // Record migration
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName)

      console.log(`✅ Applied migration: ${migrationName}`)
    } catch (error) {
      console.error(`❌ Failed to apply migration ${migrationName}:`, error)
      throw error
    }
  }

  db.close()
  console.log('✅ All migrations completed')
}

// Run migrations
runMigrations()
