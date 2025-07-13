# Contributing to Claude Studio

## Development Workflow

### Branches

- `main` - Production-ready code, protected branch
- `develop` - Integration branch for features
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches
- `docs/*` - Documentation updates

### Workflow

1. Create a feature branch from `develop`

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
   - Write clean, well-documented code
   - Follow existing patterns and conventions
   - Add tests for new functionality

3. Before committing

   ```bash
   # Run type checking
   npm run typecheck

   # Run linting
   npm run lint

   # Run tests
   npm test

   # Build to ensure no build errors
   npm run build
   ```

4. Commit your changes

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. Push to your branch

   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a Pull Request
   - Target branch: `develop`
   - Fill out the PR template
   - Ensure all checks pass

### Commit Message Convention

Follow conventional commits format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Test changes
- `chore:` - Build process or auxiliary tool changes

### Code Quality Standards

- No TypeScript `any` types without explicit justification
- All functions should have proper types
- Components should use proper TypeScript interfaces
- Follow DRY, SOLID, and KISS principles
- Use existing libraries before creating new utilities

### Pre-commit Checks

The project uses husky for pre-commit hooks that will:

1. Run TypeScript type checking
2. Run ESLint
3. Ensure no build errors

### Review Process

1. All PRs require at least one review
2. All CI checks must pass
3. No direct pushes to `main` or `develop`
4. Squash and merge for clean history
