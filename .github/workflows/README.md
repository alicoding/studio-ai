# GitHub Workflows

This directory contains GitHub Actions workflows for Studio AI.

## Workflows

### PR Checks (`pr-checks.yml`)

Runs on all pull requests to `main` and `develop` branches.

**Jobs:**

- **TypeScript Check**: Ensures no TypeScript errors
- **ESLint Check**: Ensures code follows linting rules
- **Run Tests**: Executes test suite
- **Build Check**: Verifies the project builds successfully

### Main Branch Protection (`main-protection.yml`)

Prevents direct pushes to the main branch (except for merge commits).

## Branch Protection Rules

### Main Branch

- Requires PR with at least 1 approval
- All status checks must pass
- Dismisses stale reviews on new commits
- Requires conversation resolution
- No force pushes or deletions allowed

### Develop Branch

- Requires status checks to pass
- No force pushes or deletions allowed
- Direct commits allowed (no PR required)

## Setting Up Branch Protection

Run the setup script after pushing to GitHub:

```bash
./scripts/setup-branch-protection.sh
```

Or manually configure in GitHub Settings > Branches.
