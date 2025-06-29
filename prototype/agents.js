// Mock agent configurations data
const agentConfigs = {
  dev1: {
    name: 'dev1',
    role: 'dev',
    systemPrompt:
      'You are a skilled developer agent focused on clean code and best practices. You have extensive experience with modern web technologies and can handle full-stack development tasks.',
    tools: ['File System', 'Terminal', 'Web Search'],
    model: 'Claude 3 Opus',
    projects: 3,
  },
  architect1: {
    name: 'architect1',
    role: 'architect',
    systemPrompt:
      'You are a system architect focused on scalable designs and clean architecture. You excel at creating robust, maintainable systems.',
    tools: ['File System', 'Web Search'],
    model: 'Claude 3 Sonnet',
    projects: 1,
  },
  ux1: {
    name: 'ux1',
    role: 'ux',
    systemPrompt:
      'You are a UX designer focused on user-centered design and accessibility. You create intuitive interfaces that delight users.',
    tools: ['File System'],
    model: 'Claude 3 Haiku',
    projects: 2,
  },
}

// Predefined role templates
const roleTemplates = {
  dev: {
    role: 'dev',
    systemPrompt:
      'You are a skilled developer agent focused on clean code and best practices. You have extensive experience with modern web technologies and can handle full-stack development tasks. You write efficient, maintainable code and follow industry standards.',
    tools: ['File System', 'Terminal', 'Web Search'],
    model: 'Claude 3 Opus',
  },
  architect: {
    role: 'architect',
    systemPrompt:
      'You are a system architect focused on scalable designs and clean architecture principles. You excel at creating robust, maintainable systems that can grow with business needs. You consider performance, security, and maintainability in all your designs.',
    tools: ['File System', 'Web Search'],
    model: 'Claude 3 Opus',
  },
  ux: {
    role: 'ux',
    systemPrompt:
      'You are a UX designer focused on user-centered design and accessibility. You create intuitive interfaces that delight users while ensuring inclusivity. You have a deep understanding of user psychology and design principles.',
    tools: ['File System'],
    model: 'Claude 3 Haiku',
  },
  tester: {
    role: 'tester',
    systemPrompt:
      'You are a quality assurance specialist focused on comprehensive testing strategies. You excel at finding edge cases, writing test scenarios, and ensuring software quality. You understand various testing methodologies and tools.',
    tools: ['File System', 'Terminal'],
    model: 'Claude 3 Sonnet',
  },
  orchestrator: {
    role: 'orchestrator',
    systemPrompt:
      'You are a team orchestrator focused on coordination and planning. You excel at breaking down complex projects, delegating tasks, and ensuring smooth team collaboration. You keep the big picture in mind while managing details.',
    tools: ['File System'],
    model: 'Claude 3 Opus',
  },
}

// Current editing agent
let editingAgent = null

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners()
  setupSearch()
  setupFilters()
})

// Setup event listeners
function setupEventListeners() {
  // Create agent button in header
  document.querySelector('.create-agent-btn').addEventListener('click', () => {
    openCreateModal()
  })

  // Role template buttons
  document.querySelectorAll('.role-card .btn-secondary').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const role = e.target.closest('.role-card').dataset.role
      createFromTemplate(role)
    })
  })

  // Agent config card actions
  document.querySelectorAll('.agent-config-card').forEach((card) => {
    const agentId = card.dataset.agentId

    card.querySelector('.edit').addEventListener('click', () => {
      editAgent(agentId)
    })

    card.querySelector('.clone').addEventListener('click', () => {
      cloneAgent(agentId)
    })

    card.querySelector('.delete').addEventListener('click', () => {
      deleteAgent(agentId)
    })
  })

  // Add agent card
  document.querySelector('.add-agent-btn').addEventListener('click', () => {
    openCreateModal()
  })

  // Modal close
  document.querySelector('.modal-close').addEventListener('click', () => {
    closeModal()
  })

  // Modal backdrop click
  document.getElementById('edit-agent-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-agent-modal') {
      closeModal()
    }
  })

  // Modal buttons
  document.querySelector('.modal-footer .btn-secondary').addEventListener('click', () => {
    closeModal()
  })

  document.querySelector('.modal-footer .btn-primary').addEventListener('click', () => {
    saveAgent()
  })
}

// Open create modal
function openCreateModal() {
  editingAgent = null
  document.querySelector('.modal-header h2').textContent = 'Create New Agent'
  document.querySelector('.modal-footer .btn-primary').textContent = 'Create Agent'

  // Clear form
  document.getElementById('agent-name').value = ''
  document.getElementById('agent-role').value = 'dev'
  document.getElementById('system-prompt').value = ''
  document.getElementById('agent-model').value = 'opus'

  // Reset checkboxes
  document.querySelectorAll('.checkbox-group input').forEach((cb) => {
    cb.checked = cb.parentElement.textContent.includes('File System')
  })

  document.getElementById('edit-agent-modal').style.display = 'flex'
}

// Create from template
function createFromTemplate(role) {
  const template = roleTemplates[role]
  editingAgent = null

  document.querySelector('.modal-header h2').textContent = 'Create Agent from Template'
  document.querySelector('.modal-footer .btn-primary').textContent = 'Create Agent'

  // Fill form with template
  document.getElementById('agent-name').value = ''
  document.getElementById('agent-role').value = template.role
  document.getElementById('system-prompt').value = template.systemPrompt
  document.getElementById('agent-model').value =
    template.model === 'Claude 3 Opus'
      ? 'opus'
      : template.model === 'Claude 3 Sonnet'
        ? 'sonnet'
        : 'haiku'

  // Set tools
  document.querySelectorAll('.checkbox-group input').forEach((cb) => {
    const toolName = cb.parentElement.textContent.trim()
    cb.checked = template.tools.some((tool) => toolName.includes(tool))
  })

  document.getElementById('edit-agent-modal').style.display = 'flex'
}

// Edit agent
function editAgent(agentId) {
  const agent = agentConfigs[agentId]
  editingAgent = agentId

  document.querySelector('.modal-header h2').textContent = 'Edit Agent Configuration'
  document.querySelector('.modal-footer .btn-primary').textContent = 'Save Changes'

  // Fill form
  document.getElementById('agent-name').value = agent.name
  document.getElementById('agent-role').value = agent.role
  document.getElementById('system-prompt').value = agent.systemPrompt
  document.getElementById('agent-model').value =
    agent.model === 'Claude 3 Opus'
      ? 'opus'
      : agent.model === 'Claude 3 Sonnet'
        ? 'sonnet'
        : 'haiku'

  // Set tools
  document.querySelectorAll('.checkbox-group input').forEach((cb) => {
    const toolName = cb.parentElement.textContent.trim()
    cb.checked = agent.tools.some((tool) => toolName.includes(tool))
  })

  document.getElementById('edit-agent-modal').style.display = 'flex'
}

// Clone agent
function cloneAgent(agentId) {
  const agent = agentConfigs[agentId]
  editingAgent = null

  document.querySelector('.modal-header h2').textContent = 'Clone Agent Configuration'
  document.querySelector('.modal-footer .btn-primary').textContent = 'Create Clone'

  // Fill form with agent data
  document.getElementById('agent-name').value = agent.name + '_clone'
  document.getElementById('agent-role').value = agent.role
  document.getElementById('system-prompt').value = agent.systemPrompt
  document.getElementById('agent-model').value =
    agent.model === 'Claude 3 Opus'
      ? 'opus'
      : agent.model === 'Claude 3 Sonnet'
        ? 'sonnet'
        : 'haiku'

  // Set tools
  document.querySelectorAll('.checkbox-group input').forEach((cb) => {
    const toolName = cb.parentElement.textContent.trim()
    cb.checked = agent.tools.some((tool) => toolName.includes(tool))
  })

  document.getElementById('edit-agent-modal').style.display = 'flex'
}

// Delete agent
function deleteAgent(agentId) {
  const agent = agentConfigs[agentId]
  if (
    confirm(
      `Are you sure you want to delete "${agentId}"?\n\nThis agent is used in ${agent.projects} project(s).`
    )
  ) {
    // In real app, would make API call
    alert(`Agent "${agentId}" deleted successfully.`)
    document.querySelector(`[data-agent-id="${agentId}"]`).remove()
  }
}

// Save agent
function saveAgent() {
  const name = document.getElementById('agent-name').value.trim()
  const role = document.getElementById('agent-role').value
  const systemPrompt = document.getElementById('system-prompt').value.trim()
  const model = document.getElementById('agent-model').value

  if (!name) {
    alert('Please enter an agent name')
    return
  }

  if (!systemPrompt) {
    alert('Please enter a system prompt')
    return
  }

  // Get selected tools
  const tools = []
  document.querySelectorAll('.checkbox-group input:checked').forEach((cb) => {
    const toolText = cb.parentElement.textContent.trim()
    if (toolText.includes('File System')) tools.push('File System')
    else if (toolText.includes('Terminal')) tools.push('Terminal')
    else if (toolText.includes('Web Search')) tools.push('Web Search')
    else if (toolText.includes('Database')) tools.push('Database')
    else if (toolText.includes('Production')) tools.push('Production Deploy')
  })

  // In real app, would make API call
  if (editingAgent) {
    alert(`Agent "${editingAgent}" updated successfully.`)
  } else {
    alert(
      `Agent "${name}" created successfully.\n\nRole: ${role}\nModel: ${model}\nTools: ${tools.join(', ')}`
    )
  }

  closeModal()
}

// Close modal
function closeModal() {
  document.getElementById('edit-agent-modal').style.display = 'none'
  editingAgent = null
}

// Setup search
function setupSearch() {
  const searchInput = document.querySelector('.search-input')
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase()

    document.querySelectorAll('.agent-config-card').forEach((card) => {
      const name = card.querySelector('h3').textContent.toLowerCase()
      const prompt = card.querySelector('.system-prompt').textContent.toLowerCase()
      const role = card.querySelector('.role-badge').textContent.toLowerCase()

      const matches = name.includes(query) || prompt.includes(query) || role.includes(query)
      card.style.display = matches ? 'block' : 'none'
    })
  })
}

// Setup filters
function setupFilters() {
  const filterSelect = document.querySelector('.filter-select')
  filterSelect.addEventListener('change', (e) => {
    const filterRole = e.target.value

    document.querySelectorAll('.agent-config-card').forEach((card) => {
      if (!filterRole) {
        card.style.display = 'block'
      } else {
        const role = card.querySelector('.role-badge').textContent
        card.style.display = role === filterRole ? 'block' : 'none'
      }
    })
  })
}
