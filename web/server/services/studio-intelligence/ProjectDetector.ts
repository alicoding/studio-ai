/**
 * ProjectDetector - Auto-detect project type and configuration
 *
 * KISS: Simple file checks, no complex parsing
 * DRY: Single source of project type detection
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export type ProjectType = 'node' | 'python' | 'rust' | 'go' | 'ruby' | 'java' | 'unknown'

export interface ProjectConfig {
  type: ProjectType
  hasTypeScript: boolean
  hasESLint: boolean
  hasPrettier: boolean
  testCommand?: string
  lintCommand?: string
  formatCommand?: string
  typeCheckCommand?: string
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun'
}

export class ProjectDetector {
  detectProject(projectPath: string): ProjectConfig {
    const config: ProjectConfig = {
      type: 'unknown',
      hasTypeScript: false,
      hasESLint: false,
      hasPrettier: false,
    }

    // Detect Node.js project
    if (existsSync(join(projectPath, 'package.json'))) {
      config.type = 'node'

      try {
        const packageJson = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf-8'))

        // Detect package manager
        if (existsSync(join(projectPath, 'bun.lockb'))) {
          config.packageManager = 'bun'
        } else if (existsSync(join(projectPath, 'yarn.lock'))) {
          config.packageManager = 'yarn'
        } else if (existsSync(join(projectPath, 'pnpm-lock.yaml'))) {
          config.packageManager = 'pnpm'
        } else {
          config.packageManager = 'npm'
        }

        // Detect TypeScript
        if (
          packageJson.devDependencies?.typescript ||
          packageJson.dependencies?.typescript ||
          existsSync(join(projectPath, 'tsconfig.json'))
        ) {
          config.hasTypeScript = true
          config.typeCheckCommand = `${config.packageManager} run tsc --noEmit`
        }

        // Detect ESLint
        if (
          packageJson.devDependencies?.eslint ||
          existsSync(join(projectPath, '.eslintrc.js')) ||
          existsSync(join(projectPath, '.eslintrc.json'))
        ) {
          config.hasESLint = true
          config.lintCommand = packageJson.scripts?.lint || `${config.packageManager} run eslint .`
        }

        // Detect Prettier
        if (packageJson.devDependencies?.prettier || existsSync(join(projectPath, '.prettierrc'))) {
          config.hasPrettier = true
          config.formatCommand =
            packageJson.scripts?.format || `${config.packageManager} run prettier --write .`
        }

        // Detect test command
        if (packageJson.scripts?.test) {
          config.testCommand = `${config.packageManager} run test`
        }
      } catch (error) {
        console.warn('Failed to parse package.json:', error)
      }
    }

    // Detect Python project
    else if (
      existsSync(join(projectPath, 'requirements.txt')) ||
      existsSync(join(projectPath, 'pyproject.toml')) ||
      existsSync(join(projectPath, 'setup.py'))
    ) {
      config.type = 'python'

      // Check for common Python tools
      if (existsSync(join(projectPath, '.flake8')) || existsSync(join(projectPath, 'setup.cfg'))) {
        config.lintCommand = 'flake8 .'
      }

      if (
        existsSync(join(projectPath, '.black')) ||
        existsSync(join(projectPath, 'pyproject.toml'))
      ) {
        config.formatCommand = 'black .'
      }

      if (existsSync(join(projectPath, 'pytest.ini'))) {
        config.testCommand = 'pytest'
      }
    }

    // Detect Rust project
    else if (existsSync(join(projectPath, 'Cargo.toml'))) {
      config.type = 'rust'
      config.lintCommand = 'cargo clippy'
      config.formatCommand = 'cargo fmt'
      config.testCommand = 'cargo test'
      config.typeCheckCommand = 'cargo check'
    }

    // Detect Go project
    else if (existsSync(join(projectPath, 'go.mod'))) {
      config.type = 'go'
      config.lintCommand = 'go vet ./...'
      config.formatCommand = 'go fmt ./...'
      config.testCommand = 'go test ./...'
    }

    return config
  }

  /**
   * Get suggested hooks based on project configuration
   */
  getSuggestedHooks(config: ProjectConfig): string[] {
    const hooks: string[] = []

    if (config.hasTypeScript) {
      hooks.push('typescript-check')
    }

    if (config.hasESLint) {
      hooks.push('eslint-check')
    }

    if (config.hasPrettier) {
      hooks.push('auto-format')
    }

    if (config.testCommand) {
      hooks.push('test-on-commit')
    }

    return hooks
  }
}
