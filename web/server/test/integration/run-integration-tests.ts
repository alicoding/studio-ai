/**
 * Integration Test Runner
 * Runs all orchestration integration tests against real server
 */

import { Phase1IntegrationTest } from './phase1-mention-wait.js'
import { Phase2IntegrationTest } from './phase2-batch-operations.js'

class IntegrationTestRunner {
  private baseUrl: string
  private testResults: { phase: string; success: boolean; error?: string }[] = []

  constructor(baseUrl = 'http://localhost:3004') {
    this.baseUrl = baseUrl
  }

  async runAllTests(): Promise<boolean> {
    console.log('🚀 Orchestration Integration Test Suite')
    console.log('=======================================')
    console.log(`Server: ${this.baseUrl}`)
    console.log(`Started: ${new Date().toISOString()}\n`)

    let allPassed = true

    // Check server availability first
    if (!(await this.checkServerAvailability())) {
      console.error('❌ Server is not available. Please start the server and try again.')
      return false
    }

    // Run Phase 1 Tests
    try {
      console.log('🔄 Running Phase 1 Tests...')
      const phase1 = new Phase1IntegrationTest(this.baseUrl)
      const phase1Success = await phase1.runAllTests()

      this.testResults.push({
        phase: 'Phase 1 - Mention Wait Mode',
        success: phase1Success,
      })

      if (!phase1Success) {
        allPassed = false
        console.error('❌ Phase 1 tests failed')
      } else {
        console.log('✅ Phase 1 tests passed')
      }
    } catch (error) {
      this.testResults.push({
        phase: 'Phase 1 - Mention Wait Mode',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
      allPassed = false
      console.error('❌ Phase 1 tests crashed:', error)
    }

    // Wait between phases
    await this.delay(2000)

    // Run Phase 2 Tests
    try {
      console.log('\n🔄 Running Phase 2 Tests...')
      const phase2 = new Phase2IntegrationTest(this.baseUrl)
      const phase2Success = await phase2.runAllTests()

      this.testResults.push({
        phase: 'Phase 2 - Batch Operations',
        success: phase2Success,
      })

      if (!phase2Success) {
        allPassed = false
        console.error('❌ Phase 2 tests failed')
      } else {
        console.log('✅ Phase 2 tests passed')
      }
    } catch (error) {
      this.testResults.push({
        phase: 'Phase 2 - Batch Operations',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
      allPassed = false
      console.error('❌ Phase 2 tests crashed:', error)
    }

    // Print final results
    this.printFinalResults(allPassed)

    return allPassed
  }

  private async checkServerAvailability(): Promise<boolean> {
    try {
      console.log('🔍 Checking server availability...')

      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (!response.ok) {
        console.error(`Server responded with status: ${response.status}`)
        return false
      }

      const health = (await response.json()) as { status: string }
      console.log(`✅ Server is available: ${health.status}`)

      // Check if orchestration endpoints exist
      const mentionResponse = await fetch(`${this.baseUrl}/api/messages/mention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Invalid body to test endpoint existence
      })

      const batchResponse = await fetch(`${this.baseUrl}/api/messages/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Invalid body to test endpoint existence
      })

      if (mentionResponse.status === 404) {
        console.error('❌ Mention endpoint not found (/api/messages/mention)')
        return false
      }

      if (batchResponse.status === 404) {
        console.error('❌ Batch endpoint not found (/api/messages/batch)')
        return false
      }

      console.log('✅ Orchestration endpoints are available')
      return true
    } catch (error) {
      console.error('❌ Failed to connect to server:', error)
      console.error('Please ensure the server is running at:', this.baseUrl)
      return false
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private printFinalResults(allPassed: boolean): void {
    console.log('\n' + '='.repeat(50))
    console.log('📊 INTEGRATION TEST RESULTS')
    console.log('='.repeat(50))

    for (const result of this.testResults) {
      const status = result.success ? '✅ PASS' : '❌ FAIL'
      console.log(`${status} - ${result.phase}`)
      if (result.error) {
        console.log(`    Error: ${result.error}`)
      }
    }

    console.log('='.repeat(50))

    if (allPassed) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED!')
      console.log('✅ Phase 1 (Mention Wait Mode) - READY FOR PRODUCTION')
      console.log('✅ Phase 2 (Batch Operations) - READY FOR PRODUCTION')
      console.log('\n📋 Next Steps:')
      console.log('   - Phase 3: Cross-Project Routing')
      console.log('   - Phase 4: MCP Integration')
      console.log('   - Phase 5: Configuration UI')
    } else {
      console.log('❌ SOME INTEGRATION TESTS FAILED!')
      console.log('🔧 Please fix the failing tests before proceeding to next phases')
      console.log('\n📋 Required Actions:')
      console.log('   - Review failed test outputs above')
      console.log('   - Fix any server or API issues')
      console.log('   - Re-run integration tests')
      console.log('   - Do not proceed to Phase 3 until all tests pass')
    }

    console.log('='.repeat(50))
    console.log(`Completed: ${new Date().toISOString()}`)
  }
}

// Usage instructions
function printUsageInstructions(): void {
  console.log('📖 Usage Instructions:')
  console.log('======================')
  console.log('1. Start the Studio AI server:')
  console.log('   npm run dev:server')
  console.log('')
  console.log('2. In another terminal, run the integration tests:')
  console.log('   npx tsx web/server/test/integration/run-integration-tests.ts')
  console.log('')
  console.log('3. Or specify a custom server URL:')
  console.log(
    '   npx tsx web/server/test/integration/run-integration-tests.ts http://localhost:3005'
  )
  console.log('')
  console.log('⚠️  IMPORTANT: These tests require a REAL running server')
  console.log('   - Not mocks or test servers')
  console.log('   - Real Claude service integration')
  console.log('   - Real WebSocket connections')
  console.log('   - Real database and storage')
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    printUsageInstructions()
    return
  }

  const serverUrl = args[0] || 'http://localhost:3004'

  console.log('⚡ Starting Integration Tests...')
  console.log('This will test REAL server functionality')
  console.log('Make sure the server is running!\n')

  const runner = new IntegrationTestRunner(serverUrl)
  const success = await runner.runAllTests()

  process.exit(success ? 0 : 1)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Test runner crashed:', error)
    process.exit(1)
  })
}

export { IntegrationTestRunner }
