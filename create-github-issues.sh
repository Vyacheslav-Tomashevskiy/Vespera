#!/bin/bash

# Script to create GitHub issues from markdown files
# Checks for existing issues to avoid duplicates

set -o pipefail

ISSUES_DIR="./issues"

# Function to extract title from markdown file
get_title() {
    local file="$1"
    grep -m 1 "^# " "$file" | sed 's/^# //'
}

# Function to extract priority from markdown file
get_priority() {
    local file="$1"
    local priority_line=$(grep "^\*\*Priority:\*\*" "$file" || echo "")
    
    if echo "$priority_line" | grep -q "CRITICAL"; then
        echo "priority:critical"
    elif echo "$priority_line" | grep -q "HIGH"; then
        echo "priority:high"
    elif echo "$priority_line" | grep -q "MEDIUM"; then
        echo "priority:medium"
    else
        echo "priority:low"
    fi
}

# Function to extract category and convert to labels
get_category_labels() {
    local file="$1"
    local category_line=$(grep "^\*\*Category:\*\*" "$file" || echo "")
    
    if echo "$category_line" | grep -qi "Security"; then
        echo "security"
    elif echo "$category_line" | grep -qi "Smart Contract"; then
        echo "contract,blockchain"
    elif echo "$category_line" | grep -qi "Frontend"; then
        echo "frontend,ui"
    elif echo "$category_line" | grep -qi "Backend"; then
        echo "backend"
    elif echo "$category_line" | grep -qi "Code Quality"; then
        echo "code-quality"
    else
        echo ""
    fi
}

# Function to check if issue already exists
issue_exists() {
    local title="$1"
    gh issue list --limit 500 --json title --jq '.[].title' | grep -Fxq "$title" 2>/dev/null
    return $?
}

# Counter for created issues
created_count=0
skipped_count=0

echo "Starting GitHub issue creation..."
echo "================================"
echo ""

# Process each markdown file
for file in "$ISSUES_DIR"/*.md; do
    # Skip README
    if [[ "$file" == *"README.md" ]]; then
        continue
    fi
    
    # Extract issue details
    title=$(get_title "$file")
    priority=$(get_priority "$file")
    category_labels=$(get_category_labels "$file")
    
    # Combine labels
    labels="$priority"
    if [ -n "$category_labels" ]; then
        labels="$labels,$category_labels"
    fi
    
    # Check if issue already exists
    if issue_exists "$title"; then
        echo "⏭️  SKIPPED: $title (already exists)"
        ((skipped_count++))
        continue
    fi
    
    # Create the issue
    echo "📝 Creating: $title"
    echo "   Labels: $labels"
    
    gh issue create \
        --title "$title" \
        --body-file "$file" \
        --label "$labels"
    
    if [ $? -eq 0 ]; then
        echo "✅ Created successfully"
        ((created_count++))
    else
        echo "❌ Failed to create"
    fi
    
    echo ""
    
    # Small delay to avoid rate limiting
    sleep 1
done

echo "================================"
echo "Summary:"
echo "  Created: $created_count issues"
echo "  Skipped: $skipped_count issues (already exist)"
echo "================================"
