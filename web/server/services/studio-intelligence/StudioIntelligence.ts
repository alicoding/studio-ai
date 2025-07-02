/**
 * StudioIntelligence - Built-in behaviors that make Studio smart
 *
 * KISS: Direct integration with Claude Code hooks
 * DRY: Single place for all built-in intelligence
 * SOLID: Each behavior is a simple method
 */

import { ProjectDetector, ProjectConfig } from './ProjectDetector'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
// import { execSync } from 'child_process'

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
  [key: string]: any
}

export class StudioIntelligence {
  private projectDetector = new ProjectDetector()
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
   * Initialize Studio Intelligence for a specific project
   * This adds project-specific hooks based on detected configuration
   * @deprecated Use ensureDefaultHooks() instead - Studio Intelligence is now system-wide defaults
   */
  async initializeForProject(_projectPath: string): Promise<void> {
    // For backward compatibility, just ensure defaults exist
    await this.ensureDefaultHooks()
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
   * Generate Claude Code hooks based on project configuration
   * @deprecated Use getDefaultHooks() instead
   */
  private generateHooksForProject(config: ProjectConfig, projectPath: string): ClaudeSettings {
    const hooks: ClaudeSettings = {
      hooks: {
        PostToolUse: [],
        PreToolUse: [],
        Stop: [],
      },
    }

    // TypeScript checking hook
    if (config.hasTypeScript) {
      hooks.hooks!.PostToolUse!.push({
        matcher: 'Write|Edit|MultiEdit',
        hooks: [
          {
            type: 'command',
            command: `node "${join(this.studioScriptsPath, 'check-typescript.js')}" "${projectPath}"`,
          },
        ],
      })
    }

    // ESLint checking hook
    if (config.hasESLint) {
      hooks.hooks!.PostToolUse!.push({
        matcher: 'Write|Edit|MultiEdit',
        hooks: [
          {
            type: 'command',
            command: `node "${join(this.studioScriptsPath, 'check-eslint.js')}" "${projectPath}"`,
          },
        ],
      })
    }

    // File lock checking (always enabled)
    hooks.hooks!.PreToolUse!.push({
      matcher: 'Write|Edit|MultiEdit',
      hooks: [
        {
          type: 'command',
          command: `node "${join(this.studioScriptsPath, 'check-file-lock.js')}"`,
        },
      ],
    })

    // @mention routing (always enabled)
    hooks.hooks!.Stop!.push({
      matcher: '*',
      hooks: [
        {
          type: 'command',
          command: `node "${join(this.studioScriptsPath, 'check-mentions.js')}"`,
        },
      ],
    })

    return hooks
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

// Get project path from environment or current directory
const projectPath = process.env.PROJECT_PATH || process.cwd();
const file = process.env.FILE_PATH;

// Only run if TypeScript is available
if (!file || !file.endsWith('.ts') && !file.endsWith('.tsx')) {
  process.exit(0);
}

// Check if project uses TypeScript
const hasTypeScript = fs.existsSync(path.join(projectPath, 'tsconfig.json'));
if (!hasTypeScript) {
  process.exit(0);
}

try {
  // Try different TypeScript commands
  const commands = [
    'npx tsc --noEmit',
    'npm run typecheck',
    'npm run tsc',
    'yarn tsc --noEmit',
    'yarn typecheck'
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
  
  // Parse errors and warnings
  const errorCount = (output.match(/error TS/g) || []).length;
  
  if (errorCount > 0) {
    console.error(\`TypeScript: \${errorCount} errors found\`);
    // In future, we'll update agent card here
  }
} catch (error) {
  // Silently fail if TypeScript check doesn't work
  process.exit(0);
}
`
    writeFileSync(join(this.studioScriptsPath, 'check-typescript.js'), tsScript, { mode: 0o755 })

    // ESLint checker script - intelligent detection
    const eslintScript = `#!/usr/bin/env node
// Studio Intelligence: ESLint Checker
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectPath = process.env.PROJECT_PATH || process.cwd();
const file = process.env.FILE_PATH;

if (!file || !file.match(/\.(js|jsx|ts|tsx)$/)) {
  process.exit(0);
}

// Check if project uses ESLint
const hasESLint = fs.existsSync(path.join(projectPath, '.eslintrc.js')) ||
                  fs.existsSync(path.join(projectPath, '.eslintrc.json')) ||
                  fs.existsSync(path.join(projectPath, '.eslintrc.yml'));
                  
if (!hasESLint) {
  process.exit(0);
}

try {
  const output = execSync(\`npx eslint "\${file}"\`, {
    cwd: projectPath,
    encoding: 'utf-8',
    stdio: 'pipe'
  });
} catch (error) {
  if (error.stdout) {
    const output = error.stdout.toString();
    const errorCount = (output.match(/\d+ errors?/g) || [])[0];
    if (errorCount) {
      console.error(\`ESLint: \${errorCount}\`);
    }
  }
}
`
    writeFileSync(join(this.studioScriptsPath, 'check-eslint.js'), eslintScript, { mode: 0o755 })

    // Keep existing file lock and mention scripts
    await this.createHookScripts({ hasTypeScript: true, hasESLint: true } as ProjectConfig, '')
  }

  /**
   * Create the actual hook scripts
   * @deprecated Use createDefaultHookScripts() instead
   */
  private async createHookScripts(config: ProjectConfig, _projectPath: string): Promise<void> {
    // TypeScript checker script
    if (config.hasTypeScript) {
      const tsScript = `#!/usr/bin/env node
// Studio Intelligence: TypeScript Checker
const { execSync } = require('child_process');
const path = require('path');

const projectPath = process.argv[2] || process.cwd();
const file = process.env.FILE_PATH;

try {
  // Run TypeScript check
  const cmd = '${config.typeCheckCommand || 'npx tsc --noEmit'}';
  const output = execSync(cmd, { 
    cwd: projectPath,
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  
  // Parse errors and warnings
  const lines = output.split('\\n');
  const errors = lines.filter(line => line.includes('error TS'));
  
  if (errors.length > 0) {
    console.error(\`TypeScript: \${errors.length} errors found\`);
    // In future, we'll update agent card here
  }
} catch (error) {
  // TypeScript errors return non-zero exit code
  const output = error.stdout || error.message;
  const errorCount = (output.match(/error TS/g) || []).length;
  if (errorCount > 0) {
    console.error(\`TypeScript: \${errorCount} errors found\`);
  }
}
`
      writeFileSync(join(this.studioScriptsPath, 'check-typescript.js'), tsScript, { mode: 0o755 })
    }

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
