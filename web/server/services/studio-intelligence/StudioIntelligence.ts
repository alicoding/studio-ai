/**
 * StudioIntelligence - Hook management for Claude Code integration
 *
 * KISS: Simple hook installation and management
 * DRY: Single place for all hook configuration
 * SOLID: Focused on hook functionality only
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'

interface ClaudeHook {
  type: 'command'
  command: string
}

interface ClaudeHookGroup {
  matcher: string
  hooks: ClaudeHook[]
}

interface ClaudeSettings {
  hooks?: {
    PreToolUse?: ClaudeHookGroup[]
    PostToolUse?: ClaudeHookGroup[]
    Notification?: ClaudeHookGroup[]
    Stop?: ClaudeHookGroup[]
  }
  // Other Claude settings preserved
  [key: string]: unknown
}

export class StudioIntelligence {
  private claudeSettingsPath = join(homedir(), '.claude', 'settings.json')
  private studioScriptsPath = join(homedir(), '.claude-studio', 'scripts')

  constructor() {
    // Ensure directories exist
    this.ensureDirectories()
  }

  /**
   * Ensure Studio Intelligence default hooks exist
   * Called on Studio startup - only adds defaults if hooks section is empty
   */
  async ensureDefaultHooks(): Promise<void> {
    // Load existing settings
    let existingSettings: ClaudeSettings = {}

    if (existsSync(this.claudeSettingsPath)) {
      try {
        existingSettings = JSON.parse(readFileSync(this.claudeSettingsPath, 'utf-8'))
      } catch (error) {
        console.warn('Failed to parse existing Claude settings:', error)
      }
    }

    // Only add our defaults if hooks section is empty or missing
    if (!existingSettings.hooks || Object.keys(existingSettings.hooks).length === 0) {
      console.log('🎯 Installing Studio Intelligence default hooks...')

      // Create the hook scripts
      await this.createDefaultHookScripts()

      // Get default hooks
      const defaultHooks = this.getDefaultHooks()

      // Save to Claude settings
      await this.saveToClaudeSettings(defaultHooks)

      console.log('✅ Studio Intelligence defaults installed!')
    } else {
      console.log('📌 Existing hooks found, preserving user configuration')
    }
  }

  /**
   * Get default Studio Intelligence hooks
   * These are the smart defaults that work for most projects
   */
  private getDefaultHooks(): ClaudeSettings {
    return {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write|Edit|MultiEdit',
            hooks: [
              {
                type: 'command',
                command: `node "${join(this.studioScriptsPath, 'check-typescript.js')}"`,
              },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: 'Write|Edit|MultiEdit',
            hooks: [
              {
                type: 'command',
                command: `node "${join(this.studioScriptsPath, 'check-file-lock.js')}"`,
              },
            ],
          },
        ],
        Stop: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: `node "${join(this.studioScriptsPath, 'check-mentions.js')}"`,
              },
            ],
          },
        ],
        Notification: [],
      },
      // Add metadata to identify Studio defaults
      _studioIntelligence: {
        version: '1.0',
        installed: new Date().toISOString(),
      },
    }
  }

  /**
   * Create default hook scripts that work intelligently for any project
   */
  private async createDefaultHookScripts(): Promise<void> {
    // TypeScript checker script - intelligent detection
    const tsScript = `#!/usr/bin/env node
// Studio Intelligence: TypeScript Checker
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse the JSON input from stdin
let input;
try {
  const inputData = fs.readFileSync(0, 'utf-8');
  input = JSON.parse(inputData);
} catch (error) {
  // If no valid JSON input, exit silently
  process.exit(0);
}

// Get the file path from tool input
const filePath = input.tool_input?.file_path;
if (!filePath) {
  process.exit(0);
}

// Only run on TypeScript files
if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
  process.exit(0);
}

// Get project path from environment or current directory
const projectPath = process.env.PROJECT_PATH || process.cwd();

// Check if project uses TypeScript
const hasTypeScript = fs.existsSync(path.join(projectPath, 'tsconfig.json'));
if (!hasTypeScript) {
  process.exit(0);
}

try {
  // Try to typecheck just this specific file
  const commands = [
    \`npx tsc --noEmit \${filePath}\`,
    \`npx tsc --noEmit --skipLibCheck \${filePath}\`,
    'npx tsc --noEmit', // fallback to full project check
    'npm run typecheck',
    'yarn tsc --noEmit'
  ];
  
  let output = '';
  let success = false;
  
  for (const cmd of commands) {
    try {
      output = execSync(cmd, { 
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      success = true;
      break;
    } catch (error) {
      // Try next command
      if (error.stdout) output = error.stdout;
    }
  }
  
  // Parse errors specific to this file
  const lines = output.split('\\n');
  const fileErrors = lines.filter(line => line.includes(filePath) && line.includes('error TS'));
  
  if (fileErrors.length > 0) {
    console.error(\`TypeScript errors in \${path.basename(filePath)}:\`);
    fileErrors.forEach(error => console.error(error));
    
    // Exit code 2 to show errors to Claude
    process.exit(2);
  }
} catch (error) {
  // If the file has TypeScript errors, show them
  if (error.stdout && error.stdout.includes(filePath)) {
    const lines = error.stdout.split('\\n');
    const fileErrors = lines.filter(line => line.includes(filePath));
    if (fileErrors.length > 0) {
      console.error(\`TypeScript errors in \${path.basename(filePath)}:\`);
      fileErrors.forEach(error => console.error(error));
      process.exit(2);
    }
  }
  // Otherwise silently continue
  process.exit(0);
}
`
    writeFileSync(join(this.studioScriptsPath, 'check-typescript.js'), tsScript, { mode: 0o755 })

    // File lock checker script
    const lockScript = `#!/usr/bin/env node
// Studio Intelligence: File Lock Checker
const fs = require('fs');
const path = require('path');

const filePath = process.env.FILE_PATH;
const agentId = process.env.AGENT_ID || 'unknown';
const locksDir = path.join(require('os').homedir(), '.claude-studio', 'locks');

if (!filePath) process.exit(0);

// Ensure locks directory exists
if (!fs.existsSync(locksDir)) {
  fs.mkdirSync(locksDir, { recursive: true });
}

// Create lock file name from file path
const lockFile = path.join(locksDir, Buffer.from(filePath).toString('base64'));

// Check if file is locked by another agent
if (fs.existsSync(lockFile)) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
    const age = Date.now() - lock.timestamp;
    
    // Auto-expire after 5 minutes
    if (age > 5 * 60 * 1000) {
      fs.unlinkSync(lockFile);
    } else if (lock.agentId !== agentId) {
      console.warn(\`⚠️  File is being edited by \${lock.agentName || lock.agentId}\`);
      // Don't block, just warn
    }
  } catch (e) {
    // Invalid lock file, remove it
    fs.unlinkSync(lockFile);
  }
}

// Create/update our lock
fs.writeFileSync(lockFile, JSON.stringify({
  agentId,
  agentName: process.env.AGENT_NAME || agentId,
  timestamp: Date.now(),
  file: filePath
}));
`
    writeFileSync(join(this.studioScriptsPath, 'check-file-lock.js'), lockScript, { mode: 0o755 })

    // @mention checker script
    const mentionScript = `#!/usr/bin/env node
// Studio Intelligence: @mention Router
const fs = require('fs');
const path = require('path');

const message = process.env.MESSAGE || '';
const agentId = process.env.AGENT_ID || 'unknown';

// Check for @mentions
const mentionMatch = message.match(/@(\\w+)/);
if (mentionMatch) {
  const targetAgent = mentionMatch[1];
  const mentionsDir = path.join(require('os').homedir(), '.claude-studio', 'mentions');
  
  // Ensure mentions directory exists
  if (!fs.existsSync(mentionsDir)) {
    fs.mkdirSync(mentionsDir, { recursive: true });
  }
  
  // Write mention file for target agent
  const mentionFile = path.join(mentionsDir, \`\${targetAgent}.json\`);
  fs.writeFileSync(mentionFile, JSON.stringify({
    from: agentId,
    to: targetAgent,
    message: message,
    timestamp: Date.now()
  }));
  
  // Return decision to block and show routing message
  console.log(JSON.stringify({
    decision: "block",
    message: \`Routing message to @\${targetAgent}...\`
  }));
}
`
    writeFileSync(join(this.studioScriptsPath, 'check-mentions.js'), mentionScript, { mode: 0o755 })
  }

  /**
   * Save hooks to Claude Code settings
   */
  private async saveToClaudeSettings(newHooks: ClaudeSettings): Promise<void> {
    let existingSettings: ClaudeSettings = {}

    // Load existing settings
    if (existsSync(this.claudeSettingsPath)) {
      try {
        existingSettings = JSON.parse(readFileSync(this.claudeSettingsPath, 'utf-8'))
      } catch (error) {
        console.warn('Failed to parse existing Claude settings:', error)
      }
    }

    // Merge hooks intelligently
    const mergedSettings = { ...existingSettings }

    // Initialize hooks if not present
    if (!mergedSettings.hooks) {
      mergedSettings.hooks = {}
    }

    // Merge each hook type
    const hookTypes = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop'] as const

    for (const hookType of hookTypes) {
      if (newHooks.hooks?.[hookType]) {
        // Add Studio Intelligence hooks while preserving existing ones
        const existing = mergedSettings.hooks[hookType] || []
        const studioHooks = newHooks.hooks[hookType]!

        // Remove old Studio Intelligence hooks (identified by our scripts path)
        const filtered = existing.filter(
          (group: ClaudeHookGroup) =>
            !group.hooks.some((h) => h.command.includes('.claude-studio/scripts'))
        )

        // Add new Studio Intelligence hooks
        mergedSettings.hooks[hookType] = [...filtered, ...studioHooks]
      }
    }

    // Save merged settings
    writeFileSync(this.claudeSettingsPath, JSON.stringify(mergedSettings, null, 2))

    console.log('✅ Studio Intelligence hooks saved to Claude Code settings')
    console.log('   These will work immediately in your Claude Code session!')
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      dirname(this.claudeSettingsPath),
      this.studioScriptsPath,
      join(homedir(), '.claude-studio', 'locks'),
      join(homedir(), '.claude-studio', 'mentions'),
    ]

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }
  }

  /**
   * Get current Studio Intelligence status
   */
  getStatus(): {
    scriptsInstalled: boolean
    hooksConfigured: boolean
    activeHooks: string[]
  } {
    const scriptsInstalled = existsSync(join(this.studioScriptsPath, 'check-file-lock.js'))

    let hooksConfigured = false
    let activeHooks: string[] = []

    if (existsSync(this.claudeSettingsPath)) {
      try {
        const settings = JSON.parse(readFileSync(this.claudeSettingsPath, 'utf-8'))
        if (settings.hooks) {
          hooksConfigured = true

          // Count active Studio Intelligence hooks
          const allHooks = [
            ...(settings.hooks.PreToolUse || []),
            ...(settings.hooks.PostToolUse || []),
            ...(settings.hooks.Stop || []),
          ]

          for (const group of allHooks) {
            for (const hook of group.hooks) {
              if (hook.command.includes('.claude-studio/scripts')) {
                const scriptName = hook.command.match(/scripts\/([^"]+\.js)/)?.[1]
                if (scriptName) activeHooks.push(scriptName)
              }
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    return { scriptsInstalled, hooksConfigured, activeHooks }
  }
}
