#!/bin/bash

# Setup Branch Protection Script
# This script helps configure branch protection rules on GitHub

echo "🔒 Studio AI Branch Protection Setup"
echo "======================================="
echo ""
echo "This script will guide you through setting up branch protection rules."
echo ""
echo "Prerequisites:"
echo "- GitHub CLI (gh) installed and authenticated"
echo "- Repository pushed to GitHub"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

if [ -z "$REPO" ]; then
    echo "❌ Not in a GitHub repository or repository not found."
    echo "Make sure you're in the repository directory and it's pushed to GitHub."
    exit 1
fi

echo "📍 Repository: $REPO"
echo ""

# Function to set branch protection
set_branch_protection() {
    local branch=$1
    local strict=$2
    local require_pr=$3
    
    echo "Setting protection for branch: $branch"
    
    if [ "$branch" == "main" ]; then
        gh api repos/$REPO/branches/$branch/protection \
            --method PUT \
            --field required_status_checks='{"strict":true,"contexts":["TypeScript Check","ESLint Check","Run Tests","Build Check"]}' \
            --field enforce_admins=false \
            --field required_pull_request_reviews='{"dismissal_restrictions":{},"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":1}' \
            --field restrictions=null \
            --field allow_force_pushes=false \
            --field allow_deletions=false \
            --field required_conversation_resolution=true \
            --field lock_branch=false \
            --field allow_fork_syncing=true
    else
        gh api repos/$REPO/branches/$branch/protection \
            --method PUT \
            --field required_status_checks='{"strict":true,"contexts":["TypeScript Check","ESLint Check"]}' \
            --field enforce_admins=false \
            --field restrictions=null \
            --field allow_force_pushes=false \
            --field allow_deletions=false \
            --field required_conversation_resolution=false \
            --field lock_branch=false \
            --field allow_fork_syncing=true
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ Protection set for $branch"
    else
        echo "❌ Failed to set protection for $branch"
    fi
}

# Check if branches exist
echo "Checking branches..."
MAIN_EXISTS=$(git branch -r | grep -c "origin/main")
DEVELOP_EXISTS=$(git branch -r | grep -c "origin/develop")

if [ $MAIN_EXISTS -eq 0 ]; then
    echo "⚠️  Main branch not found on remote. Push it first."
else
    echo "Would you like to set protection for main branch? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        set_branch_protection "main" true true
    fi
fi

if [ $DEVELOP_EXISTS -eq 0 ]; then
    echo "⚠️  Develop branch not found on remote. Create and push it first."
else
    echo "Would you like to set protection for develop branch? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        set_branch_protection "develop" true false
    fi
fi

echo ""
echo "🎉 Branch protection setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify protection rules at: https://github.com/$REPO/settings/branches"
echo "2. Ensure all team members are aware of the new workflow"
echo "3. Review CONTRIBUTING.md for development guidelines"