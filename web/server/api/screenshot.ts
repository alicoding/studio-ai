import { Router } from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'

const router = Router()
const execAsync = promisify(exec)

// POST /api/screenshot - Take a screenshot using native OS tools or save base64 data
router.post('/', async (req, res) => {
  try {
    const {
      path: screenshotPath,
      interactive = false,
      captureArea = false,
      base64Data,
      width,
      height,
    } = req.body

    if (!screenshotPath || !screenshotPath.startsWith('/tmp/')) {
      return res.status(400).json({ error: 'Invalid screenshot path' })
    }

    // If base64 data is provided, save it directly
    if (base64Data) {
      const fs = (await import('fs')).default
      try {
        const buffer = Buffer.from(base64Data, 'base64')
        await fs.promises.writeFile(screenshotPath, buffer)
        return res.json({ success: true, path: screenshotPath, width, height })
      } catch (_error) {
        console.error('Failed to save base64 screenshot:', error)
        return res.status(500).json({ error: 'Failed to save screenshot' })
      }
    }

    const platform = process.platform

    if (platform === 'darwin') {
      // macOS: Use screencapture command
      let command
      if (interactive) {
        command = `screencapture -i "${screenshotPath}"` // -i for interactive selection
      } else if (captureArea) {
        // Capture the entire screen without any interaction
        command = `screencapture -x "${screenshotPath}"` // -x no sounds
      } else {
        command = `screencapture "${screenshotPath}"`
      }

      try {
        await execAsync(command)
        res.json({ success: true, path: screenshotPath })
      } catch (_error) {
        console.error('Screenshot command failed:', error)
        res.status(500).json({ error: 'Failed to take screenshot' })
      }
    } else if (platform === 'linux') {
      // Linux: Try various screenshot tools
      const commands = [
        `gnome-screenshot -f "${screenshotPath}"`,
        `import "${screenshotPath}"`, // ImageMagick
        `scrot "${screenshotPath}"`,
      ]

      let success = false
      for (const command of commands) {
        try {
          await execAsync(command)
          success = true
          break
        } catch (_error) {
          // Try next command
        }
      }

      if (success) {
        res.json({ success: true, path: screenshotPath })
      } else {
        res.status(500).json({ error: 'No screenshot tool available' })
      }
    } else if (platform === 'win32') {
      // Windows: Use PowerShell
      const command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{PRTSC}')"`

      try {
        await execAsync(command)
        res.json({
          success: true,
          path: screenshotPath,
          note: 'Screenshot in clipboard, please save manually',
        })
      } catch (_error) {
        res.status(500).json({ error: 'Failed to take screenshot' })
      }
    } else {
      res.status(400).json({ error: 'Unsupported platform' })
    }
  } catch (_error) {
    console.error('Screenshot API error:', error)
    res.status(500).json({ error: 'Failed to process screenshot request' })
  }
})

export default router
