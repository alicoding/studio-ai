// Mock team templates data
const teamTemplates = {
  'prototype-team': {
    name: 'Prototype Team',
    description: 'Quick prototyping and proof of concept development',
    agents: ['orchestrator', 'dev', 'ux'],
  },
  'backend-team': {
    name: 'Backend Team',
    description: 'API development and backend infrastructure',
    agents: ['architect', 'dev-backend', 'dev-database', 'tester'],
  },
  'fullstack-team': {
    name: 'Full Stack Team',
    description: 'Complete web application development',
    agents: ['orchestrator', 'architect', 'dev-frontend', 'dev-backend', 'tester'],
  },
  'mobile-team': {
    name: 'Mobile Team',
    description: 'Mobile app development team',
    agents: ['orchestrator', 'dev-mobile', 'ux-mobile', 'tester-mobile'],
  },
}

// Agent metadata
const agentIcons = {
  orchestrator: '🎯',
  architect: '🏗️',
  dev: '👨‍💻',
  'dev-frontend': '🎨',
  'dev-backend': '⚙️',
  'dev-database': '🗄️',
  'dev-mobile': '📱',
  ux: '🎨',
  'ux-mobile': '🎨',
  tester: '🧪',
  'tester-mobile': '🧪',
  devops: '🚀',
}

// Drag and drop state
let draggedElement = null
let currentTeamAgents = []

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners()
  setupDragAndDrop()
})

// Setup event listeners
function setupEventListeners() {
  // Create team button
  document.querySelector('.create-team-btn').addEventListener('click', openTeamBuilder)

  // Import button
  document.querySelector('.import-btn').addEventListener('click', openImportModal)

  // Template actions
  document.querySelectorAll('.team-template-card').forEach((card) => {
    const teamId = card.dataset.teamId

    card.querySelector('.use').addEventListener('click', () => {
      useTemplate(teamId)
    })

    card.querySelector('.clone').addEventListener('click', () => {
      cloneTemplate(teamId)
    })

    card.querySelector('.export').addEventListener('click', () => {
      exportTemplate(teamId)
    })

    // Edit button for custom teams
    const editBtn = card.querySelector('.edit')
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        editTemplate(teamId)
      })
    }
  })

  // Add team button
  document.querySelector('.add-team-btn').addEventListener('click', openTeamBuilder)

  // Modal handlers
  setupModalHandlers()

  // Import JSON preview
  document.getElementById('import-json').addEventListener('input', previewImport)
}

// Setup modal handlers
function setupModalHandlers() {
  // Team builder modal
  const teamBuilderModal = document.getElementById('team-builder-modal')
  teamBuilderModal.querySelector('.modal-close').addEventListener('click', () => {
    closeModal('team-builder-modal')
  })

  teamBuilderModal.addEventListener('click', (e) => {
    if (e.target.id === 'team-builder-modal') {
      closeModal('team-builder-modal')
    }
  })

  teamBuilderModal.querySelector('.btn-secondary').addEventListener('click', () => {
    closeModal('team-builder-modal')
  })

  document.getElementById('save-team-btn').addEventListener('click', saveTeam)

  // Import modal
  const importModal = document.getElementById('import-modal')
  importModal.querySelector('.modal-close').addEventListener('click', () => {
    closeModal('import-modal')
  })

  importModal.addEventListener('click', (e) => {
    if (e.target.id === 'import-modal') {
      closeModal('import-modal')
    }
  })

  importModal.querySelector('.btn-secondary').addEventListener('click', () => {
    closeModal('import-modal')
  })

  document.getElementById('import-team-btn').addEventListener('click', importTeam)
}

// Setup drag and drop
function setupDragAndDrop() {
  // Available agents
  document.querySelectorAll('.draggable-agent').forEach((agent) => {
    agent.addEventListener('dragstart', handleDragStart)
    agent.addEventListener('dragend', handleDragEnd)
  })

  // Drop zone
  const dropZone = document.getElementById('team-drop-zone')
  dropZone.addEventListener('dragover', handleDragOver)
  dropZone.addEventListener('drop', handleDrop)
  dropZone.addEventListener('dragleave', handleDragLeave)
}

// Drag handlers
function handleDragStart(e) {
  draggedElement = e.target
  e.target.classList.add('dragging')
  e.dataTransfer.effectAllowed = 'copy'
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging')
}

function handleDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
  e.currentTarget.classList.add('drag-over')
}

function handleDragLeave(e) {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove('drag-over')
  }
}

function handleDrop(e) {
  e.preventDefault()
  const dropZone = e.currentTarget
  dropZone.classList.remove('drag-over')

  if (draggedElement) {
    const agentType = draggedElement.dataset.agent

    // Check if agent already in team
    if (!currentTeamAgents.includes(agentType)) {
      currentTeamAgents.push(agentType)
      addAgentToTeam(agentType)
    }
  }
}

// Add agent to team
function addAgentToTeam(agentType) {
  const dropZone = document.getElementById('team-drop-zone')

  // Remove hint if first agent
  const hint = dropZone.querySelector('.drop-hint')
  if (hint) {
    hint.style.display = 'none'
  }

  // Create agent element
  const agentEl = document.createElement('div')
  agentEl.className = 'draggable-agent'
  agentEl.dataset.agent = agentType
  agentEl.innerHTML = `
        <span class="agent-icon">${agentIcons[agentType] || '👤'}</span>
        <span>${agentType}</span>
    `

  // Add remove handler
  agentEl.addEventListener('click', (e) => {
    if (e.offsetX > agentEl.offsetWidth - 20) {
      removeAgentFromTeam(agentType)
      agentEl.remove()
    }
  })

  dropZone.appendChild(agentEl)
}

// Remove agent from team
function removeAgentFromTeam(agentType) {
  currentTeamAgents = currentTeamAgents.filter((a) => a !== agentType)

  // Show hint if no agents
  if (currentTeamAgents.length === 0) {
    const dropZone = document.getElementById('team-drop-zone')
    const hint = dropZone.querySelector('.drop-hint')
    if (hint) {
      hint.style.display = 'block'
    }
  }
}

// Open team builder
function openTeamBuilder() {
  currentTeamAgents = []
  document.getElementById('team-name').value = ''
  document.getElementById('team-description').value = ''

  const dropZone = document.getElementById('team-drop-zone')
  dropZone.innerHTML = '<div class="drop-hint">Drag agents here to build your team</div>'

  document.getElementById('team-builder-modal').style.display = 'flex'
}

// Use template
function useTemplate(teamId) {
  const template = teamTemplates[teamId]
  const command = `#spawn-team ${teamId}`

  alert(
    `Using template: ${template.name}\n\nThis would spawn:\n${template.agents.join(', ')}\n\nCommand: ${command}`
  )
}

// Clone template
function cloneTemplate(teamId) {
  const template = teamTemplates[teamId]
  currentTeamAgents = [...template.agents]

  document.getElementById('team-name').value = template.name + ' (Copy)'
  document.getElementById('team-description').value = template.description

  const dropZone = document.getElementById('team-drop-zone')
  dropZone.innerHTML = ''

  // Add agents to drop zone
  template.agents.forEach((agent) => {
    addAgentToTeam(agent)
  })

  document.getElementById('team-builder-modal').style.display = 'flex'
}

// Edit template
function editTemplate(teamId) {
  const template = teamTemplates[teamId]
  currentTeamAgents = [...template.agents]

  document.getElementById('team-name').value = template.name
  document.getElementById('team-description').value = template.description

  const dropZone = document.getElementById('team-drop-zone')
  dropZone.innerHTML = ''

  // Add agents to drop zone
  template.agents.forEach((agent) => {
    addAgentToTeam(agent)
  })

  document.getElementById('team-builder-modal').style.display = 'flex'
}

// Export template
function exportTemplate(teamId) {
  const template = teamTemplates[teamId]
  const exportData = {
    name: template.name,
    description: template.description,
    agents: template.agents,
    version: '1.0',
    created: new Date().toISOString(),
  }

  const json = JSON.stringify(exportData, null, 2)

  // In real app, would download file
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${teamId}.json`
  a.click()

  alert(`Team template exported: ${template.name}`)
}

// Save team
function saveTeam() {
  const name = document.getElementById('team-name').value.trim()
  const description = document.getElementById('team-description').value.trim()

  if (!name) {
    alert('Please enter a team name')
    return
  }

  if (currentTeamAgents.length === 0) {
    alert('Please add at least one agent to the team')
    return
  }

  // In real app, would save to backend
  alert(`Team template saved!\n\nName: ${name}\nAgents: ${currentTeamAgents.join(', ')}`)

  closeModal('team-builder-modal')
}

// Open import modal
function openImportModal() {
  document.getElementById('import-json').value = ''
  document.getElementById('import-preview').style.display = 'none'
  document.getElementById('import-modal').style.display = 'flex'
}

// Preview import
function previewImport() {
  const jsonText = document.getElementById('import-json').value.trim()
  const preview = document.getElementById('import-preview')
  const previewContent = preview.querySelector('.preview-content')

  if (!jsonText) {
    preview.style.display = 'none'
    return
  }

  try {
    const data = JSON.parse(jsonText)

    if (data.name && data.agents && Array.isArray(data.agents)) {
      previewContent.innerHTML = `
                <strong>Name:</strong> ${data.name}<br>
                <strong>Description:</strong> ${data.description || 'N/A'}<br>
                <strong>Agents:</strong> ${data.agents.join(', ')}<br>
                <strong>Version:</strong> ${data.version || '1.0'}
            `
      preview.style.display = 'block'
    } else {
      previewContent.innerHTML = '<span style="color: #ef4444">Invalid team format</span>'
      preview.style.display = 'block'
    }
  } catch (e) {
    previewContent.innerHTML = '<span style="color: #ef4444">Invalid JSON</span>'
    preview.style.display = 'block'
  }
}

// Import team
function importTeam() {
  const jsonText = document.getElementById('import-json').value.trim()

  try {
    const data = JSON.parse(jsonText)

    if (!data.name || !data.agents || !Array.isArray(data.agents)) {
      alert('Invalid team template format')
      return
    }

    alert(
      `Team template imported successfully!\n\nName: ${data.name}\nAgents: ${data.agents.join(', ')}`
    )

    closeModal('import-modal')
  } catch (e) {
    alert('Invalid JSON format')
  }
}

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none'
}
