// Mock data for agents
const mockAgents = {
  orchestrator1: { status: 'online', role: 'orchestrator', tokens: 90000 },
  dev1: { status: 'busy', role: 'dev', tokens: 60000 },
  ux1: { status: 'online', role: 'ux', tokens: 20000 },
  tester1: { status: 'offline', role: 'tester', tokens: 0 },
}

// Terminal instances
const terminals = {}
const fitAddons = {}

// Initialize terminal for active agent
function initTerminal(agentId) {
  if (terminals[agentId]) return

  const terminalEl = document.getElementById(`terminal-${agentId}`)
  if (!terminalEl) return

  const terminal = new Terminal({
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
    },
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    cursorBlink: true,
  })

  const fitAddon = new FitAddon.FitAddon()
  terminal.loadAddon(fitAddon)

  terminal.open(terminalEl)
  fitAddon.fit()

  terminals[agentId] = terminal
  fitAddons[agentId] = fitAddon

  // Add welcome message
  terminal.writeln(`\x1b[36m[Claude EA - ${agentId}]\x1b[0m`)
  terminal.writeln(`Role: ${mockAgents[agentId].role}`)
  terminal.writeln(`Status: ${mockAgents[agentId].status}`)
  terminal.writeln('---')
  terminal.writeln('Ready for messages...\n')
}

// Sidebar toggle from inside sidebar
document.querySelector('.sidebar-toggle').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar')
  sidebar.classList.toggle('collapsed')
  const btn = document.querySelector('.sidebar-toggle')
  btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀'
})

// Sidebar toggle from main area
document.querySelector('.sidebar-toggle-main').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar')
  sidebar.classList.toggle('collapsed')
  const btn = document.querySelector('.sidebar-toggle')
  btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀'
})

// Agent card selection
document.querySelectorAll('.agent-card').forEach((card) => {
  card.addEventListener('click', (e) => {
    // Don't select if clicking on action buttons
    if (e.target.classList.contains('action-btn')) return

    // Remove previous selection
    document.querySelectorAll('.agent-card').forEach((c) => c.classList.remove('selected'))

    // Add selection to clicked card
    card.classList.add('selected')

    // Update selected agent display
    const agentId = card.dataset.agentId
    document.querySelector('.selected-agent').textContent = `→ ${agentId}`

    // Show terminal for selected agent
    showTerminal(agentId)
  })
})

// Show terminal for specific agent
function showTerminal(agentId) {
  // Hide all terminals
  document.querySelectorAll('.terminal-wrapper').forEach((wrapper) => {
    wrapper.classList.remove('active')
  })

  // Create or show terminal for agent
  let wrapper = document.querySelector(`.terminal-wrapper[data-agent="${agentId}"]`)
  if (!wrapper) {
    wrapper = createTerminalWrapper(agentId)
  }
  wrapper.classList.add('active')

  // Initialize terminal if needed
  if (!terminals[agentId]) {
    initTerminal(agentId)
  }
}

// Create terminal wrapper for agent
function createTerminalWrapper(agentId) {
  const wrapper = document.createElement('div')
  wrapper.className = 'terminal-wrapper'
  wrapper.dataset.agent = agentId

  wrapper.innerHTML = `
        <div class="terminal-header">
            <span class="terminal-title">${agentId}</span>
            <span class="terminal-status">● ${mockAgents[agentId].status}</span>
        </div>
        <div class="terminal" id="terminal-${agentId}"></div>
    `

  document.getElementById('terminal-container').appendChild(wrapper)
  return wrapper
}

// @mention autocomplete
const messageInput = document.getElementById('message-input')
const mentionAutocomplete = document.getElementById('mention-autocomplete')

messageInput.addEventListener('input', (e) => {
  const value = e.target.value
  const lastWord = value.split(' ').pop()

  if (lastWord.startsWith('@') && lastWord.length > 1) {
    // Show autocomplete
    const search = lastWord.substring(1).toLowerCase()
    const matches = Object.keys(mockAgents).filter(
      (agent) => agent.toLowerCase().includes(search) && mockAgents[agent].status !== 'offline'
    )

    if (matches.length > 0) {
      updateAutocomplete(matches)
      mentionAutocomplete.style.display = 'block'
    } else {
      mentionAutocomplete.style.display = 'none'
    }
  } else {
    mentionAutocomplete.style.display = 'none'
  }
})

// Update autocomplete suggestions
function updateAutocomplete(matches) {
  mentionAutocomplete.innerHTML = matches
    .map((agentId) => {
      const agent = mockAgents[agentId]
      return `
            <div class="mention-item" data-agent="${agentId}">
                <span class="mention-status ${agent.status}"></span>
                <span class="mention-name">@${agentId}</span>
                <span class="mention-role">(${agent.role})</span>
            </div>
        `
    })
    .join('')

  // Add click handlers
  mentionAutocomplete.querySelectorAll('.mention-item').forEach((item) => {
    item.addEventListener('click', () => {
      completeMention(item.dataset.agent)
    })
  })
}

// Complete mention
function completeMention(agentId) {
  const value = messageInput.value
  const words = value.split(' ')
  words[words.length - 1] = `@${agentId}`
  messageInput.value = words.join(' ') + ' '
  messageInput.focus()
  mentionAutocomplete.style.display = 'none'
}

// Message input handling
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    clearQueue()
  }
})

// Send message
function sendMessage() {
  const value = messageInput.value.trim()
  if (!value) return

  // Get selected agent
  const selectedCard = document.querySelector('.agent-card.selected')
  const selectedAgent = selectedCard ? selectedCard.dataset.agentId : 'orchestrator1'

  // Add to terminal
  if (terminals[selectedAgent]) {
    terminals[selectedAgent].writeln(`\x1b[32m> ${value}\x1b[0m`)

    // Simulate response
    setTimeout(() => {
      if (value.startsWith('#team')) {
        showTeamStatus(selectedAgent)
      } else if (value.startsWith('@')) {
        routeMessage(selectedAgent, value)
      } else {
        terminals[selectedAgent].writeln(`\x1b[90m[Processing...]\x1b[0m`)
        setTimeout(() => {
          terminals[selectedAgent].writeln(
            `Response from ${selectedAgent}: Understood. Working on it...`
          )
        }, 1000)
      }
    }, 500)
  }

  messageInput.value = ''
}

// Show team status
function showTeamStatus(agentId) {
  const terminal = terminals[agentId]
  terminal.writeln('\n📊 Team Status:')
  Object.entries(mockAgents).forEach(([id, agent]) => {
    const statusIcon = agent.status === 'online' ? '🟢' : agent.status === 'busy' ? '🟡' : '🔴'
    terminal.writeln(`  ${statusIcon} ${id} (${agent.role}) - ${agent.status}`)
  })
  terminal.writeln('')
}

// Route @mention message
function routeMessage(fromAgent, message) {
  const match = message.match(/^@(\w+)\s+(.+)$/)
  if (match) {
    const [, targetAgent, content] = match
    terminals[fromAgent].writeln(`\x1b[36m→ Routing to @${targetAgent}: ${content}\x1b[0m`)

    // Add to queue display
    addToQueue(targetAgent, content)

    // If it's a dev agent and preview is open, simulate a change
    if (
      targetAgent === 'dev1' &&
      content.includes('update') &&
      document.getElementById('preview-panel').style.display === 'flex'
    ) {
      setTimeout(() => {
        previewContent = previewContent.replace(
          '<h3>Feature One</h3>',
          '<h3>Feature One - Updated!</h3>'
        )
        updatePreview()
        if (terminals['dev1']) {
          terminals['dev1'].writeln('\x1b[32m✓ Updated preview: Feature section\x1b[0m')
        }
      }, 1500)
    }
  }
}

// Add message to queue
function addToQueue(target, message) {
  const queueItems = document.querySelector('.queue-items')
  const item = document.createElement('div')
  item.className = 'queue-item'
  item.innerHTML = `
        <span class="queue-target">@${target}</span>
        <span class="queue-message">${message}</span>
    `
  queueItems.appendChild(item)

  // Update count
  updateQueueCount()
}

// Update queue count
function updateQueueCount() {
  const count = document.querySelectorAll('.queue-item').length
  document.querySelector('.queue-header span').textContent = `Message Queue (${count})`
}

// Clear queue
function clearQueue() {
  document.querySelector('.queue-items').innerHTML = ''
  updateQueueCount()

  // Show in terminal
  const selectedCard = document.querySelector('.agent-card.selected')
  const selectedAgent = selectedCard ? selectedCard.dataset.agentId : 'orchestrator1'
  if (terminals[selectedAgent]) {
    terminals[selectedAgent].writeln('\x1b[33m[Queue cleared]\x1b[0m')
  }
}

// Clear queue button
document.querySelector('.clear-queue').addEventListener('click', clearQueue)

// Broadcast button
document.querySelector('.broadcast-btn').addEventListener('click', () => {
  messageInput.value = '#broadcast '
  messageInput.focus()
})

// View toggle buttons
document.querySelectorAll('.view-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'))
    btn.classList.add('active')

    const view = btn.dataset.view
    const agentWorkspace = document.getElementById('agent-workspace')
    const developWorkspace = document.getElementById('develop-workspace')
    const sidebar = document.getElementById('sidebar')
    const messageQueue = document.getElementById('message-queue')
    const inputArea = document.querySelector('.input-area')

    if (view === 'develop') {
      // Switch to develop view
      agentWorkspace.style.display = 'none'
      developWorkspace.style.display = 'flex'
      sidebar.style.display = 'none'
      messageQueue.style.display = 'none'
      inputArea.style.display = 'none'

      // Initialize develop terminal if needed
      if (!window.developTerminal) {
        initDevelopTerminal()
      }
    } else {
      // Switch to agent views (single/split/grid)
      agentWorkspace.style.display = 'flex'
      developWorkspace.style.display = 'none'
      sidebar.style.display = 'flex'
      messageQueue.style.display = 'block'
      inputArea.style.display = 'block'

      // Apply specific layout for agent views
      const workArea = document.getElementById('work-area')
      workArea.className = `work-area ${view}-view`
    }

    console.log(`Switched to ${view} view`)
  })
})

// Agent action buttons
document.querySelectorAll('.action-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    const card = btn.closest('.agent-card')
    const agentId = card.dataset.agentId

    if (btn.classList.contains('pause')) {
      card.dataset.status = 'offline'
      btn.textContent = '▶'
      btn.classList.remove('pause')
      btn.classList.add('start')
    } else if (btn.classList.contains('start')) {
      card.dataset.status = 'online'
      btn.textContent = '⏸'
      btn.classList.remove('start')
      btn.classList.add('pause')
    } else if (btn.classList.contains('clear')) {
      // Clear tokens
      const tokenBar = card.querySelector('.token-bar')
      tokenBar.style.width = '0%'
      card.querySelector('.token-text').textContent = '0K / 200K tokens'
    } else if (btn.classList.contains('remove')) {
      if (confirm(`Remove ${agentId} from team?`)) {
        card.remove()
      }
    }
  })
})

// Tab switching
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close')) {
      // Close tab
      e.stopPropagation()
      if (document.querySelectorAll('.tab').length > 1) {
        tab.remove()
      }
    } else {
      // Switch tab
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')
      console.log(`Switched to ${tab.dataset.project}`)
    }
  })
})

// Server connection state
let serverConnected = false
let serverUrl = 'http://localhost:3000'
let serverTerminal = null
let serverFitAddon = null
let activeTerminalTab = 'agent'

// Connect to server
function connectToServer() {
  const urlInput = document.getElementById('preview-url')
  serverUrl = urlInput.value || 'http://localhost:3000'

  const statusEl = document.getElementById('server-status')
  const statusDot = statusEl.querySelector('.status-dot')
  const statusText = statusEl.querySelector('.status-text')

  // Update status to connecting
  statusDot.className = 'status-dot connecting'
  statusText.textContent = 'Connecting...'

  // Show server terminal section
  const previewPanel = document.getElementById('preview-panel')
  previewPanel.classList.add('with-terminal')

  // Initialize server terminal if needed
  if (!serverTerminal) {
    initServerTerminal()
  }

  // Simulate connection attempt
  setTimeout(() => {
    // Try to load the URL in iframe
    const iframe = document.getElementById('preview-iframe')
    const placeholder = document.getElementById('preview-placeholder')

    // In real app, we'd check if URL is accessible
    // For demo, we'll simulate successful connection
    serverConnected = true

    if (serverConnected) {
      statusDot.className = 'status-dot online'
      statusText.textContent = 'Connected'

      // Hide placeholder, show iframe
      placeholder.style.display = 'none'
      iframe.style.display = 'block'
      iframe.src = serverUrl

      // Add message to server terminal
      if (serverTerminal) {
        serverTerminal.writeln(`\x1b[32m✓ Connected to ${serverUrl}\x1b[0m`)
        serverTerminal.writeln('Server output will appear here...\n')

        // Simulate server logs
        simulateServerLogs()
      }
    } else {
      statusDot.className = 'status-dot offline'
      statusText.textContent = 'Connection failed'

      if (serverTerminal) {
        serverTerminal.writeln(`\x1b[31m✗ Failed to connect to ${serverUrl}\x1b[0m`)
        serverTerminal.writeln('Make sure your development server is running.\n')
      }
    }
  }, 1500)
}

// Initialize server terminal
function initServerTerminal() {
  const terminalEl = document.getElementById('server-terminal')
  if (!terminalEl || serverTerminal) return

  serverTerminal = new Terminal({
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
    },
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    cursorBlink: true,
  })

  serverFitAddon = new FitAddon.FitAddon()
  serverTerminal.loadAddon(serverFitAddon)

  serverTerminal.open(terminalEl)
  serverFitAddon.fit()

  // Add welcome message
  serverTerminal.writeln('\x1b[36m[Server Terminal]\x1b[0m')
  serverTerminal.writeln('Use this terminal to run your development server')
  serverTerminal.writeln('Example: npm run dev, yarn dev, python app.py\n')
  serverTerminal.write('$ ')

  // Handle input
  let currentLine = ''
  serverTerminal.onData((data) => {
    if (data === '\r') {
      // Enter key
      serverTerminal.write('\r\n')
      handleServerCommand(currentLine)
      currentLine = ''
      setTimeout(() => {
        serverTerminal.write('$ ')
      }, 100)
    } else if (data === '\x7f') {
      // Backspace
      if (currentLine.length > 0) {
        currentLine = currentLine.slice(0, -1)
        serverTerminal.write('\b \b')
      }
    } else if (data >= ' ') {
      // Printable characters
      currentLine += data
      serverTerminal.write(data)
    }
  })
}

// Handle server commands
function handleServerCommand(command) {
  if (!serverTerminal) return

  switch (command.trim()) {
    case 'npm run dev':
    case 'yarn dev':
      serverTerminal.writeln('\n> my-app@1.0.0 dev')
      serverTerminal.writeln('> vite')
      serverTerminal.writeln('')
      serverTerminal.writeln('  \x1b[32mVITE\x1b[0m v4.5.0  ready in 523 ms')
      serverTerminal.writeln('')
      serverTerminal.writeln('  ➜  \x1b[1mLocal\x1b[0m:   \x1b[36mhttp://localhost:3000/\x1b[0m')
      serverTerminal.writeln('  ➜  \x1b[1mNetwork\x1b[0m: \x1b[90muse --host to expose\x1b[0m')

      // Auto-connect after server starts
      setTimeout(() => {
        if (!serverConnected) {
          connectToServer()
        }
      }, 1000)
      break

    case 'python app.py':
      serverTerminal.writeln(' * Running on http://127.0.0.1:5000')
      serverTerminal.writeln(' * Debug mode: on')
      break

    case 'rails server':
      serverTerminal.writeln('=> Booting Puma')
      serverTerminal.writeln('=> Rails 7.0.4 application starting in development')
      serverTerminal.writeln('=> Run `bin/rails server --help` for more startup options')
      serverTerminal.writeln('* Listening on http://127.0.0.1:3000')
      break

    case 'clear':
      serverTerminal.clear()
      break

    case 'exit':
      serverTerminal.writeln('Stopping server...')
      if (serverConnected) {
        const statusEl = document.getElementById('server-status')
        statusEl.querySelector('.status-dot').className = 'status-dot offline'
        statusEl.querySelector('.status-text').textContent = 'Server stopped'
        serverConnected = false

        // Reset iframe
        const iframe = document.getElementById('preview-iframe')
        iframe.src = 'about:blank'
        iframe.style.display = 'none'
        document.getElementById('preview-placeholder').style.display = 'block'
      }
      break

    default:
      if (command.trim()) {
        serverTerminal.writeln(`bash: ${command}: command not found`)
      }
  }
}

// Simulate server logs
function simulateServerLogs() {
  if (!serverTerminal || !serverConnected) return

  const logs = [
    '\x1b[90m[HMR] connected\x1b[0m',
    'GET / 200 15.23ms',
    'GET /assets/main.css 200 2.45ms',
    'GET /assets/main.js 200 3.12ms',
    '\x1b[36m[vite] page reload\x1b[0m',
    'GET /api/agents 200 8.91ms',
    '\x1b[32m✓ Compiled in 145ms\x1b[0m',
    'GET /preview 200 5.67ms',
    '\x1b[33m[warn] Large bundle size detected\x1b[0m',
  ]

  let index = 0
  const interval = setInterval(() => {
    if (!serverConnected || index >= logs.length) {
      clearInterval(interval)
      return
    }

    serverTerminal.writeln(logs[index])
    index++
  }, 2000)
}

// Switch between terminals
function switchTerminal(type) {
  activeTerminalTab = type

  // Update tab states
  document.querySelectorAll('.terminal-tab').forEach((tab) => {
    tab.classList.remove('active')
    if (tab.textContent.toLowerCase().includes(type)) {
      tab.classList.add('active')
    }
  })

  // Show/hide terminal content
  const serverTerminalSection = document.getElementById('server-terminal-section')
  const serverTerminalEl = document.getElementById('server-terminal')
  const workArea = document.getElementById('work-area')

  if (type === 'server') {
    // Show server terminal in the bottom section
    if (serverTerminalSection) {
      serverTerminalEl.style.display = 'block'

      // Initialize if needed
      if (!serverTerminal) {
        initServerTerminal()
      }

      // Resize server terminal
      if (serverFitAddon) {
        setTimeout(() => serverFitAddon.fit(), 100)
      }
    }
  } else {
    // Show agent terminal
    if (serverTerminalEl) {
      serverTerminalEl.style.display = 'none'
    }

    // Ensure terminal container is visible
    const terminalContainer = document.getElementById('terminal-container')
    if (terminalContainer) {
      terminalContainer.style.display = 'block'
    }

    // Resize active agent terminal
    const activeAgent = document.querySelector('.agent-card.selected')?.dataset.agentId
    if (activeAgent && fitAddons[activeAgent]) {
      setTimeout(() => fitAddons[activeAgent].fit(), 100)
    }
  }
}

// Add new terminal tab
function addTerminal() {
  alert('In a real app, this would open a new terminal tab for running additional processes')
}

// Develop view terminal management
let developTerminal = null
let developFitAddon = null
let developTerminalCollapsed = false

// Initialize develop terminal
function initDevelopTerminal() {
  const terminalEl = document.getElementById('develop-terminal')
  if (!terminalEl || developTerminal) return

  developTerminal = new Terminal({
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
    },
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    cursorBlink: true,
  })

  developFitAddon = new FitAddon.FitAddon()
  developTerminal.loadAddon(developFitAddon)

  developTerminal.open(terminalEl)
  developFitAddon.fit()

  // Add welcome message
  developTerminal.writeln('\x1b[36m[Development Server Terminal]\x1b[0m')
  developTerminal.writeln('Run your development server here')
  developTerminal.writeln('Example: npm run dev, yarn dev, python app.py\n')
  developTerminal.write('$ ')

  // Handle input (reuse server terminal logic)
  let currentLine = ''
  developTerminal.onData((data) => {
    if (data === '\r') {
      // Enter key
      developTerminal.write('\r\n')
      handleServerCommand(currentLine)
      currentLine = ''
      setTimeout(() => {
        developTerminal.write('$ ')
      }, 100)
    } else if (data === '\x7f') {
      // Backspace
      if (currentLine.length > 0) {
        currentLine = currentLine.slice(0, -1)
        developTerminal.write('\b \b')
      }
    } else if (data >= ' ') {
      // Printable characters
      currentLine += data
      developTerminal.write(data)
    }
  })

  window.developTerminal = developTerminal
}

// Toggle develop terminal visibility
function toggleDevTerminal() {
  const terminalSection = document.getElementById('develop-terminal-section')
  const toggleIcon = document.querySelector('.toggle-icon')

  if (terminalSection.classList.contains('collapsed')) {
    terminalSection.classList.remove('collapsed')
    toggleIcon.textContent = '▼'
    developTerminalCollapsed = false

    // Resize terminal
    if (developFitAddon) {
      setTimeout(() => developFitAddon.fit(), 300)
    }
  } else {
    terminalSection.classList.add('collapsed')
    toggleIcon.textContent = '▶'
    developTerminalCollapsed = true
  }
}

// Switch between develop terminal tabs
function switchDevTerminal(type) {
  // Update tab states
  document.querySelectorAll('.develop-terminal-section .terminal-tab').forEach((tab) => {
    tab.classList.remove('active')
    if (tab.textContent.toLowerCase().includes(type)) {
      tab.classList.add('active')
    }
  })

  // In real app, would switch terminal content
  console.log(`Switched to ${type} terminal`)
}

// Add new develop terminal
function addDevTerminal() {
  alert('In a real app, this would add a new terminal tab')
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Select first agent
  document.querySelector('.agent-card').click()

  // Resize terminals on window resize
  window.addEventListener('resize', () => {
    Object.values(fitAddons).forEach((addon) => addon.fit())
    if (serverFitAddon) {
      serverFitAddon.fit()
    }
  })
})

// Create new agent configuration - opens modal
document.querySelector('.spawn-agent-btn').addEventListener('click', () => {
  document.getElementById('create-agent-modal').style.display = 'flex'
})

// Modal close button
document.querySelector('.modal-close').addEventListener('click', () => {
  document.getElementById('create-agent-modal').style.display = 'none'
})

// Click outside modal to close
document.getElementById('create-agent-modal').addEventListener('click', (e) => {
  if (e.target.id === 'create-agent-modal') {
    e.target.style.display = 'none'
  }
})

// Create & Spawn button
document.querySelector('.btn-primary').addEventListener('click', () => {
  // Gather form data and build spawn command
  const name = document.querySelector('.modal-content input[type="text"]').value || 'agent1'
  const role = document.querySelector('.modal-content select').value

  // Build command
  const command = `#spawn ${role} ${name}`

  // Close modal
  document.getElementById('create-agent-modal').style.display = 'none'

  // Put command in input
  messageInput.value = command
  messageInput.focus()

  // Show what would happen
  alert(
    `Agent configuration saved.\nCommand ready: ${command}\n\nIn real app, this would also save the system prompt and tool permissions.`
  )
})

// Save as Template button
document.querySelector('.btn-secondary').addEventListener('click', () => {
  alert('Would save this configuration as a reusable template')
})

// Team template button
document.querySelector('.team-template-btn').addEventListener('click', () => {
  alert(
    'Team templates:\n- Prototype Team\n- Backend Team\n- Full Stack Team\n\n(This would open a selection dialog)'
  )
})

// Add to team button - adds existing agent to this project
document.querySelector('.add-agent-btn').addEventListener('click', () => {
  // In real app, this would show a list of all existing agents not in this project
  const existingAgents = [
    'architect1 (architect) - Project Beta',
    'dev2 (dev) - Project Gamma',
    'tester2 (tester) - Available',
    'ux2 (ux) - Available',
  ]
  const selected = prompt(
    'Select an existing agent to add to this project:\n\n' +
      existingAgents.map((a, i) => `${i + 1}. ${a}`).join('\n')
  )
  if (selected) {
    alert(`Would add existing agent to this project's team`)
  }
})

// Settings button (now in nav bar)
document.querySelector('.nav-bar .settings-btn').addEventListener('click', () => {
  alert(
    'Settings would include:\n- API Keys\n- Model Selection\n- Tool Permissions\n- Theme\n- Shortcuts'
  )
})

// Preview functions
let previewContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Preview</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 20px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 40px;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .feature {
            padding: 30px;
            background: #f5f5f5;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { margin: 0 0 20px 0; }
        h3 { color: #333; }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <h1>Welcome to Our App</h1>
            <p>This is a live preview of what the agents are building</p>
        </div>
        <div class="features">
            <div class="feature">
                <h3>Feature One</h3>
                <p>Real-time preview updates as agents write code</p>
            </div>
            <div class="feature">
                <h3>Feature Two</h3>
                <p>Responsive design testing across devices</p>
            </div>
            <div class="feature">
                <h3>Feature Three</h3>
                <p>Hot reload without manual refresh</p>
            </div>
        </div>
    </div>
</body>
</html>
`

function updatePreview() {
  const iframe = document.getElementById('preview-iframe')
  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(previewContent)
  doc.close()

  // Simulate live updates
  simulateLiveUpdate()
}

function refreshPreview() {
  if (serverConnected) {
    const iframe = document.getElementById('preview-iframe')
    iframe.src = iframe.src // Reload iframe

    // Visual feedback
    iframe.style.opacity = '0.5'
    setTimeout(() => {
      iframe.style.opacity = '1'
    }, 200)

    // Log in server terminal
    if (serverTerminal) {
      serverTerminal.writeln('\x1b[36m[refresh] Page reloaded\x1b[0m')
    }
  } else {
    updatePreview()
  }
}

function openPreviewInTab() {
  if (serverConnected) {
    window.open(serverUrl, '_blank')
  } else {
    const blob = new Blob([previewContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }
}

function changePreviewDevice(device) {
  const previewContent = document.querySelector('.preview-content')
  previewContent.className = `preview-content ${device}`
}

// Simulate live updates from agent work
function simulateLiveUpdate() {
  // Simulate an agent making changes
  setTimeout(() => {
    const selectedAgent = document.querySelector('.agent-card.selected')?.dataset.agentId
    if (
      selectedAgent === 'dev1' &&
      document.getElementById('preview-panel').style.display === 'flex'
    ) {
      // Simulate dev1 updating the hero section
      previewContent = previewContent.replace(
        '<h1>Welcome to Our App</h1>',
        '<h1>Welcome to Claude EA</h1>'
      )
      previewContent = previewContent.replace(
        '<p>This is a live preview of what the agents are building</p>',
        '<p>Agent dev1 just updated this text! 🚀</p>'
      )

      updatePreview()

      // Show notification in terminal
      if (terminals['dev1']) {
        terminals['dev1'].writeln('\x1b[32m✓ Updated preview: Hero section\x1b[0m')
      }
    }
  }, 3000)

  // Simulate another update
  setTimeout(() => {
    const selectedAgent = document.querySelector('.agent-card.selected')?.dataset.agentId
    if (
      selectedAgent === 'ux1' &&
      document.getElementById('preview-panel').style.display === 'flex'
    ) {
      // Simulate ux1 updating styles
      previewContent = previewContent.replace(
        'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);',
        'background: linear-gradient(135deg, #4a9eff 0%, #2d7dd2 100%);'
      )

      updatePreview()

      // Show notification in terminal
      if (terminals['ux1']) {
        terminals['ux1'].writeln('\x1b[32m✓ Updated preview: Color scheme\x1b[0m')
      }
    }
  }, 6000)
}
