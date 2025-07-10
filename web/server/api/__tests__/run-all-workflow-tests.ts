#!/usr/bin/env tsx
/**
 * Comprehensive Workflow Test Runner
 * Runs all async/sync workflow tests to ensure no bugs
 *
 * Usage: npx tsx web/server/api/__tests__/run-all-workflow-tests.ts
 */

import { execSync } from 'child_process'
import path from 'path'

interface TestResult {
  suite: string
  passed: boolean
  output: string
  duration: number
}

const testSuites = [
  {
    name: 'Basic Async/Sync Workflows',
    file: 'invoke-async.test.ts',
  },
  {
    name: 'Edge Cases and Bug Prevention',
    file: 'invoke-edge-cases.test.ts',
  },
  {
    name: 'Concurrency and Race Conditions',
    file: 'invoke-concurrency.test.ts',
  },
  {
    name: 'Comprehensive Integration Tests',
    file: 'invoke-comprehensive.test.ts',
  },
]

async function runTestSuite(suite: { name: string; file: string }): Promise<TestResult> {
  console.log(`\n🧪 Running ${suite.name}...`)

  const startTime = Date.now()
  let passed = false
  let output = ''

  try {
    // Run vitest on the specific file
    const testPath = path.join(__dirname, suite.file)
    output = execSync(`npx vitest run ${testPath} --reporter=verbose`, {
      encoding: 'utf8',
      timeout: 300000, // 5 minutes per test suite
    })

    passed = !output.includes('FAIL') && output.includes('PASS')
    console.log(`✅ ${suite.name} - PASSED`)
  } catch (error) {
    output = error instanceof Error ? error.message : String(error)
    console.log(`❌ ${suite.name} - FAILED`)
    console.log(`Error: ${output.slice(0, 500)}...`)
  }

  const duration = Date.now() - startTime
  return { suite: suite.name, passed, output, duration }
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Comprehensive Workflow API Tests\n')
  console.log('='.repeat(80))

  const results: TestResult[] = []

  for (const suite of testSuites) {
    const result = await runTestSuite(suite)
    results.push(result)
  }

  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY')
  console.log('='.repeat(80))

  const passed = results.filter((r) => r.passed).length
  const total = results.length
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌'
    const time = (result.duration / 1000).toFixed(1)
    console.log(`${icon} ${result.suite} (${time}s)`)

    if (!result.passed) {
      // Show brief error details
      const errorLines = result.output.split('\n').slice(0, 3)
      errorLines.forEach((line) => console.log(`   ${line}`))
    }
  })

  console.log('\n' + '='.repeat(80))
  console.log(`📈 OVERALL: ${passed}/${total} test suites passed`)
  console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(1)}s`)
  console.log(`🎯 Success rate: ${Math.round((passed / total) * 100)}%`)

  if (passed === total) {
    console.log('\n🎉 All workflow tests passed! The API is ready for production.')
    console.log('\n✅ Coverage includes:')
    console.log('   • Basic sync/async workflow execution')
    console.log('   • Template variable resolution')
    console.log('   • Dependency handling')
    console.log('   • Session management')
    console.log('   • Error handling and recovery')
    console.log('   • SSE streaming')
    console.log('   • Concurrency and race conditions')
    console.log('   • Resource contention')
    console.log('   • Edge cases and special characters')
  } else {
    console.log('\n⚠️  Some test suites failed. Review the errors above.')
    console.log('   Fix issues before deploying to production.')
    process.exit(1)
  }
}

// Health check before running tests
async function healthCheck(): Promise<boolean> {
  console.log('🔍 Performing health check...')

  try {
    const response = await fetch(
      `${process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'}/health`
    )

    if (response.ok) {
      console.log('✅ Server is healthy')
      return true
    } else {
      console.log('❌ Server health check failed')
      return false
    }
  } catch {
    console.log("❌ Cannot connect to server. Make sure it's running on port 3456.")
    return false
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  healthCheck()
    .then((healthy) => {
      if (!healthy) {
        console.log('\n💡 Start the server with: npm run env:start')
        process.exit(1)
      }
      return runAllTests()
    })
    .catch((error) => {
      console.error('\n❌ Test runner failed:', error)
      process.exit(1)
    })
}
