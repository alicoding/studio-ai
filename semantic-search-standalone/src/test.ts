/**
 * Test script for semantic search
 */

import { createSearchEngine } from './index.js'
import * as path from 'path'
import * as fs from 'fs/promises'

// Test data
const TEST_FILES = {
  'test-project/auth.ts': `
export class AuthService {
  async login(username: string, password: string) {
    // Authenticate user
    return { token: 'xyz' }
  }
  
  async logout() {
    // Clear session
  }
}

export function validateToken(token: string): boolean {
  return token.length > 0
}
`,
  'test-project/api.ts': `
export async function fetchUserData(userId: string) {
  const response = await fetch(\`/api/users/\${userId}\`)
  return response.json()
}

export class APIClient {
  async get(endpoint: string) {
    return fetch(endpoint)
  }
  
  async post(endpoint: string, data: unknown) {
    return fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}
`,
  'test-project/events.ts': `
export function handleClick(event: MouseEvent) {
  console.log('Button clicked', event)
}

export const handleSubmit = async (form: FormData) => {
  // Process form submission
  await submitForm(form)
}

function submitForm(data: FormData) {
  // Submit logic
}
`
}

async function setupTestProject(): Promise<string> {
  const testDir = path.join(process.cwd(), 'test-project')
  
  // Create test files
  for (const [filePath, content] of Object.entries(TEST_FILES)) {
    const fullPath = path.join(process.cwd(), filePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content)
  }
  
  return testDir
}

async function runTests() {
  console.log('🧪 Semantic Search Test Suite\n')
  
  try {
    // Setup test project
    const projectPath = await setupTestProject()
    console.log('✅ Created test project at:', projectPath)
    
    // Create search engine
    const engine = await createSearchEngine(projectPath, {
      apiKey: process.env.ELECTRONHUB_API_KEY
    })
    
    // Build index
    console.log('\n📚 Building search index...')
    const stats = await engine.buildIndex(true)
    console.log('✅ Index built:', stats)
    
    // Test searches
    const queries = [
      { query: 'user authentication', expected: 'AuthService' },
      { query: 'click handler', expected: 'handleClick' },
      { query: 'fetch api data', expected: 'fetchUserData' },
      { query: 'submit form', expected: 'handleSubmit' }
    ]
    
    console.log('\n🔍 Testing searches:')
    for (const { query, expected } of queries) {
      const results = await engine.search(query, 3)
      const topResult = results[0]
      
      console.log(`\n   Query: "${query}"`)
      console.log(`   Expected: ${expected}`)
      console.log(`   Got: ${topResult?.functionName || 'No results'}`)
      console.log(`   Score: ${topResult?.score.toFixed(4) || 'N/A'}`)
      console.log(`   ✅ ${topResult?.functionName === expected ? 'PASS' : '❌ FAIL'}`)
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up...')
    await fs.rm('test-project', { recursive: true, force: true })
    console.log('✅ Test complete!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
}