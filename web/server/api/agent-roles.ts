import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

interface AgentRoleAssignment {
  agentId: string
  roleId: string
  customTools?: string[]
  assignedAt: string
  updatedAt: string
}

// Storage
const ROLES_FILE = path.join(__dirname, '../../../data/agents/role-assignments.json')

async function loadAssignments(): Promise<Record<string, AgentRoleAssignment>> {
  try {
    const data = await fs.readFile(ROLES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

async function saveAssignments(assignments: Record<string, AgentRoleAssignment>): Promise<void> {
  await fs.mkdir(path.dirname(ROLES_FILE), { recursive: true })
  await fs.writeFile(ROLES_FILE, JSON.stringify(assignments, null, 2), 'utf-8')
}

// GET /api/agent-roles/:agentId
router.get('/:agentId', async (req, res) => {
  try {
    const assignments = await loadAssignments()
    const assignment = assignments[req.params.agentId]
    
    if (!assignment) {
      // Return empty result instead of 404 to avoid console errors
      return res.json(null)
    }
    
    res.json(assignment)
  } catch {
    res.status(500).json({ error: 'Failed to load assignment' })
  }
})

// PUT /api/agent-roles/:agentId
router.put('/:agentId', async (req, res) => {
  try {
    const { roleId, customTools } = req.body
    
    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' })
    }
    
    const assignments = await loadAssignments()
    const now = new Date().toISOString()
    
    assignments[req.params.agentId] = {
      agentId: req.params.agentId,
      roleId,
      customTools,
      assignedAt: assignments[req.params.agentId]?.assignedAt || now,
      updatedAt: now,
    }
    
    await saveAssignments(assignments)
    res.json(assignments[req.params.agentId])
  } catch {
    res.status(500).json({ error: 'Failed to save assignment' })
  }
})

// DELETE /api/agent-roles/:agentId
router.delete('/:agentId', async (req, res) => {
  try {
    const assignments = await loadAssignments()
    delete assignments[req.params.agentId]
    await saveAssignments(assignments)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete assignment' })
  }
})

export default router