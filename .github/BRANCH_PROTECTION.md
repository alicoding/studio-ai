# Branch Protection Rules

This document outlines the recommended branch protection rules for the Claude Studio repository.

## Main Branch Protection

### Settings for `main` branch:

1. **Require a pull request before merging**
   - ✅ Require approvals: 1
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require review from CODEOWNERS

2. **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - Required status checks:
     - `lint`
     - `typecheck`
     - `test`
     - `build`
     - `playwright`

3. **Require conversation resolution before merging**
   - ✅ All conversations must be resolved

4. **Require signed commits**
   - ✅ All commits must be signed with GPG

5. **Require linear history**
   - ✅ Prevent merge commits

6. **Include administrators**
   - ⬜ Do not include administrators (they should follow the same rules)

## Staging Branch Protection

### Settings for `staging` branch:

1. **Require a pull request before merging**
   - ✅ Require approvals: 1

2. **Require status checks to pass before merging**
   - Required status checks:
     - `lint`
     - `typecheck`
     - `test`

## How to Configure

1. Go to Settings → Branches in your GitHub repository
2. Click "Add rule" or edit existing rules
3. Apply the settings listed above for each branch
4. Save changes

## Additional Recommendations

- Enable "Require deployments to succeed before merge" once deployment workflows are set up
- Consider enabling "Automatically delete head branches" for cleaner repository management
- Set up CODEOWNERS file to automatically assign reviewers
- Enable dependency review for security scanning
