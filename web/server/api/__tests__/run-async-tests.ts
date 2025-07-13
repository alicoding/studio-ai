#!/usr/bin/env tsx
/**
 * Test runner for async workflow API tests
 * Run with: npx tsx web/server/api/__tests__/run-async-tests.ts
 */

import { runComprehensiveTests } from './invoke-comprehensive.test'

console.log('🚀 Running Async Workflow API Tests...\n')

runComprehensiveTests()
  .then((results) => {
    console.log('\n✅ Test run completed!')

    const passed = results.filter((r) => r.status === 'PASS').length
    const total = results.length

    console.log(`\n📊 Final Score: ${passed}/${total} tests passed`)

    if (passed < total) {
      console.log('\n⚠️  Some tests failed. Check the results above for details.')
      process.exit(1)
    } else {
      console.log('\n🎉 All tests passed!')
    }
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error)
    process.exit(1)
  })
