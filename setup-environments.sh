#!/bin/bash

# SiteSyncOS Cloud Suite - GitHub Environments Setup Script
# This script helps configure GitHub environments for CI/CD deployment

set -e

REPO_OWNER="Mrmuhammad300"
REPO_NAME="sitesyncos-cloud-suite"
GITHUB_API="https://api.github.com"

echo "=========================================="
echo "SiteSyncOS Cloud Suite - Environment Setup"
echo "=========================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI is not installed."
    echo "Please install it from: https://cli.github.com"
    exit 1
fi

echo "✓ GitHub CLI found"
echo ""

# Authenticate with GitHub
echo "Authenticating with GitHub..."
gh auth status > /dev/null 2>&1 || gh auth login

echo ""
echo "Creating GitHub Environments..."
echo ""

# Development Environment
echo "📦 Setting up Development Environment..."
gh api repos/$REPO_OWNER/$REPO_NAME/environments/development -X PUT \
  -f 'deployment_branch_policy[protected_branches_only]=false' \
  2>/dev/null || echo "  (Environment may already exist)"

# Add development variables
echo "  Adding development variables..."
gh secret set DEV_API_URL --body "https://dev-api.sitesyncos.example.com" --env development 2>/dev/null || true
gh secret set DEV_SUPABASE_URL --body "https://dev-project.supabase.co" --env development 2>/dev/null || true

echo "✓ Development environment configured"
echo ""

# Staging Environment
echo "📦 Setting up Staging Environment..."
gh api repos/$REPO_OWNER/$REPO_NAME/environments/staging -X PUT \
  -f 'deployment_branch_policy[protected_branches_only]=true' \
  2>/dev/null || echo "  (Environment may already exist)"

# Add staging variables
echo "  Adding staging variables..."
gh secret set STAGING_API_URL --body "https://staging-api.sitesyncos.example.com" --env staging 2>/dev/null || true
gh secret set STAGING_SUPABASE_URL --body "https://staging-project.supabase.co" --env staging 2>/dev/null || true

echo "✓ Staging environment configured"
echo ""

# Production Environment
echo "📦 Setting up Production Environment..."
gh api repos/$REPO_OWNER/$REPO_NAME/environments/production -X PUT \
  -f 'deployment_branch_policy[protected_branches_only]=true' \
  2>/dev/null || echo "  (Environment may already exist)"

# Add production variables
echo "  Adding production variables..."
gh secret set PROD_API_URL --body "https://api.sitesyncos.example.com" --env production 2>/dev/null || true
gh secret set PROD_SUPABASE_URL --body "https://prod-project.supabase.co" --env production 2>/dev/null || true

echo "✓ Production environment configured"
echo ""
echo "=========================================="
echo "✅ Environment setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Visit: https://github.com/$REPO_OWNER/$REPO_NAME/settings/environments"
echo "2. Update the URLs and secrets with your actual values"
echo "3. Add environment variables (SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)"
echo "4. Configure branch protection rules as needed"
echo ""