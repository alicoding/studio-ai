/**
 * Test the AI endpoint integration
 * 
 * Run with: tsx test-ai-endpoint.ts
 */

async function testAIEndpoint() {
  const API_BASE = 'http://localhost:3000/api'
  
  console.log('Testing AI endpoint...')
  
  // Test 1: Create a test capability
  console.log('\n1. Creating test capability...')
  try {
    const createResponse = await fetch(`${API_BASE}/ai/capabilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-search',
        name: 'Test Search',
        description: 'Test search capability',
        command: {
          enabled: true,
          trigger: '#search',
          aliases: ['#find', '#lookup']
        },
        model: {
          primary: 'gpt-4',
          temperature: 0.3,
          maxTokens: 2000
        },
        prompts: {
          system: 'You are a helpful search assistant.',
          user: 'Search for: {input}'
        }
      })
    })
    
    if (createResponse.ok) {
      console.log('✓ Capability created successfully')
    } else {
      console.log('✗ Failed to create capability:', await createResponse.text())
    }
  } catch (error) {
    console.log('✗ Error creating capability:', error)
  }
  
  // Test 2: Get capability by trigger
  console.log('\n2. Getting capability by trigger...')
  try {
    const getResponse = await fetch(`${API_BASE}/ai/capabilities?trigger=#search`)
    
    if (getResponse.ok) {
      const capability = await getResponse.json()
      console.log('✓ Found capability:', capability.name)
    } else {
      console.log('✗ Failed to get capability:', await getResponse.text())
    }
  } catch (error) {
    console.log('✗ Error getting capability:', error)
  }
  
  // Test 3: Execute AI capability (this will fail without API key)
  console.log('\n3. Testing AI execution...')
  try {
    const executeResponse = await fetch(`${API_BASE}/ai/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capabilityId: 'test-search',
        input: 'TypeScript best practices',
        context: {
          projectId: 'test-project',
          sessionId: 'test-session'
        }
      })
    })
    
    if (executeResponse.ok) {
      const result = await executeResponse.json()
      console.log('✓ AI execution successful')
      console.log('  Response preview:', result.content.substring(0, 100) + '...')
    } else {
      const error = await executeResponse.json()
      console.log('✗ AI execution failed:', error.error)
      console.log('  (This is expected without API keys configured)')
    }
  } catch (error) {
    console.log('✗ Error executing AI:', error)
  }
  
  // Test 4: Test MCP server integration
  console.log('\n4. Testing MCP server simulation...')
  try {
    // Simulate what the MCP server would do
    const mentionResponse = await fetch(`${API_BASE}/messages/mention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '@test-agent Please help with testing',
        fromAgentId: 'mcp-claude',
        projectId: 'test-project'
      })
    })
    
    if (mentionResponse.ok) {
      console.log('✓ Mention API is accessible')
    } else {
      console.log('✗ Mention API returned:', mentionResponse.status)
    }
  } catch (error) {
    console.log('✗ Error testing mention API:', error)
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health')
    if (!response.ok) {
      throw new Error('Server not responding')
    }
    return true
  } catch (_error) {
    console.error('❌ Server is not running. Start it with: npm run server')
    return false
  }
}

// Run tests
checkServer().then(isRunning => {
  if (isRunning) {
    testAIEndpoint()
  }
})