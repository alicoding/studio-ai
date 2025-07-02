# Setting Up Private Repository for Claude Studio

## 1. Create Private Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `claude-studio`
3. Description: "AI-powered collaborative development environment"
4. **Select: Private** ✓
5. Do NOT initialize with README (we already have code)
6. Click "Create repository"

## 2. Connect Local Repository

After creating the repo, run these commands:

```bash
# Add the remote
git remote add origin git@github.com:alicoding/claude-studio.git

# Push the develop branch
git push -u origin develop

# Push the main branch
git checkout main
git push -u origin main

# Return to develop branch
git checkout develop
```

## 3. Branch Protection Rules

After pushing, go to:
- Settings → Branches → Add rule
- Branch name pattern: `main`
- Enable:
  - ✓ Require a pull request before merging
  - ✓ Require approvals (1)
  - ✓ Dismiss stale pull request approvals when new commits are pushed
  - ✓ Require status checks to pass before merging
  - ✓ Require branches to be up to date before merging
  - ✓ Include administrators (optional, but recommended)

## 4. Development Workflow

1. **main branch**: Production-ready, protected
2. **develop branch**: Active development, testing
3. **feature branches**: Individual features off develop

### Workflow:
- All development happens on `develop` or feature branches
- Test thoroughly on `develop`
- When ready for release, create PR from `develop` to `main`
- Tag releases on `main` branch

## 5. GitFlow Commands

```bash
# Start new feature
git checkout develop
git checkout -b feature/your-feature-name

# Finish feature
git checkout develop
git merge --no-ff feature/your-feature-name
git branch -d feature/your-feature-name

# Release to main (when ready)
git checkout main
git merge --no-ff develop
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags
```