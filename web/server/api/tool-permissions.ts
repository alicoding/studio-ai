/**
 * Tool Permissions API Endpoints
 *
 * SOLID: Single responsibility - Tool permission management endpoints
 * DRY: Reuses services for business logic
 * KISS: Simple REST API design
 */

import { Router } from 'express'
import { UnifiedAgentConfigService } from '../services/UnifiedAgentConfigService.js'
import { ToolPermissionService } from '../services/ToolPermissionService.js'
import type { Request, Response } from 'express'
import type { ToolPermission } from '../../../src/types/tool-permissions.js'

const router = Router()
const agentConfigService = UnifiedAgentConfigService.getInstance()
const toolPermissionService = ToolPermissionService.getInstance()

// GET /api/tool-permissions/presets - Get all available permission presets
router.get('/presets', (_req: Request, res: Response) => {
  try {
    const presets = toolPermissionService.getAllPresets()
    res.json({ presets })
  } catch (error) {
    console.error('Error getting permission presets:', error)
    res.status(500).json({ error: 'Failed to get permission presets' })
  }
})

// GET /api/tool-permissions/agents/:agentId - Get tool permissions for an agent
router.get('/agents/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params
    const config = await agentConfigService.getConfig(agentId)

    if (!config) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const permissions = toolPermissionService.parseTools(config.tools)
    res.json({
      agentId,
      permissions,
      enabledTools: toolPermissionService.getEnabledToolNames(permissions),
    })
  } catch (error) {
    console.error('Error getting agent tool permissions:', error)
    res.status(500).json({ error: 'Failed to get tool permissions' })
  }
})

// PUT /api/tool-permissions/agents/:agentId - Update tool permissions for an agent
router.put('/agents/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params
    const { permissions } = req.body as { permissions: ToolPermission[] }

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'permissions array is required' })
    }

    const updated = await agentConfigService.updateToolPermissions(agentId, permissions)

    if (!updated) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    res.json({
      agentId,
      permissions: toolPermissionService.parseTools(updated.tools),
      enabledTools: toolPermissionService.getEnabledToolNames(
        toolPermissionService.parseTools(updated.tools)
      ),
    })
  } catch (error) {
    console.error('Error updating agent tool permissions:', error)
    res.status(500).json({ error: 'Failed to update tool permissions' })
  }
})

// POST /api/tool-permissions/agents/:agentId/preset - Apply a preset to an agent
router.post('/agents/:agentId/preset', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params
    const { presetName } = req.body as { presetName: string }

    if (!presetName) {
      return res.status(400).json({ error: 'presetName is required' })
    }

    const updated = await agentConfigService.applyPermissionPreset(agentId, presetName)

    if (!updated) {
      return res.status(404).json({ error: 'Agent not found or preset not found' })
    }

    res.json({
      agentId,
      presetName,
      permissions: toolPermissionService.parseTools(updated.tools),
      enabledTools: toolPermissionService.getEnabledToolNames(
        toolPermissionService.parseTools(updated.tools)
      ),
    })
  } catch (error) {
    console.error('Error applying permission preset:', error)
    res.status(500).json({ error: 'Failed to apply permission preset' })
  }
})

// GET /api/tool-permissions/projects/:projectId/agents/:role - Get effective permissions for project agent
router.get('/projects/:projectId/agents/:role', async (req: Request, res: Response) => {
  try {
    const { projectId, role } = req.params

    const permissions = await agentConfigService.getEffectiveToolPermissions(projectId, role)

    if (permissions.length === 0) {
      return res.status(404).json({ error: 'Agent role not found in project' })
    }

    res.json({
      projectId,
      role,
      permissions,
      enabledTools: toolPermissionService.getEnabledToolNames(permissions),
    })
  } catch (error) {
    console.error('Error getting effective tool permissions:', error)
    res.status(500).json({ error: 'Failed to get effective tool permissions' })
  }
})

// POST /api/tool-permissions/validate - Validate tool usage
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { toolName, args, permissions } = req.body as {
      toolName: string
      args: Record<string, unknown>
      permissions: ToolPermission[]
    }

    if (!toolName || !permissions) {
      return res.status(400).json({ error: 'toolName and permissions are required' })
    }

    const validation = toolPermissionService.validateToolUsage(toolName, args || {}, permissions)
    res.json(validation)
  } catch (error) {
    console.error('Error validating tool usage:', error)
    res.status(500).json({ error: 'Failed to validate tool usage' })
  }
})

export default router
