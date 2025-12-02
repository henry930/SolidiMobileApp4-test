#!/bin/bash

# Usage: ./scripts/post_report_to_github.sh <ISSUE_NUMBER> <REPORT_PATH>
# Example: ./scripts/post_report_to_github.sh 84 test-results/issue-84/REPORT.md

ISSUE_NUMBER=$1
REPORT_PATH=$2

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check arguments
if [ -z "$ISSUE_NUMBER" ] || [ -z "$REPORT_PATH" ]; then
    echo -e "${RED}Error: Missing arguments.${NC}"
    echo "Usage: $0 <ISSUE_NUMBER> <REPORT_PATH>"
    exit 1
fi

# Check if file exists
if [ ! -f "$REPORT_PATH" ]; then
    echo -e "${RED}Error: Report file not found at $REPORT_PATH${NC}"
    exit 1
fi

# Check for GitHub CLI
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it using: brew install gh"
    echo "Then authenticate using: gh auth login"
    exit 1
fi

# Get Repo Info
REPO_URL=$(gh repo view --json url -q .url)
# Convert https://github.com/OWNER/REPO to raw URL base
# Raw: https://raw.githubusercontent.com/OWNER/REPO/BRANCH/PATH
# We need OWNER/REPO
REPO_PATH=${REPO_URL#*github.com/}
REPO_PATH=${REPO_PATH%.git}

CURRENT_BRANCH=$(git branch --show-current)

echo "Detected Repo: $REPO_PATH on branch $CURRENT_BRANCH"

# Create a temporary report file
TEMP_REPORT="temp_report_${ISSUE_NUMBER}.md"
cp "$REPORT_PATH" "$TEMP_REPORT"

echo "Processing images..."

# Find all image links: ![Alt](Path)
# We assume standard markdown image syntax
# We use grep to find lines with images, then extract path
# This is a simple extraction, might need refinement for multiple images per line
# But for our reports, usually one per line.

# Extract image paths relative to the report file
# We need to resolve them relative to repo root for git add
REPORT_DIR=$(dirname "$REPORT_PATH")

# Read the report line by line to find images
# We will use a temporary file for the sed replacements to avoid issues
sed_script=""

while IFS= read -r line; do
    if [[ "$line" =~ \!\[.*\]\((.*)\) ]]; then
        IMG_REL_PATH="${BASH_REMATCH[1]}"
        
        # Resolve path
        # If it starts with ./, remove it
        CLEAN_REL_PATH=${IMG_REL_PATH#./}
        
        # Full path from repo root
        FULL_PATH="$REPORT_DIR/$CLEAN_REL_PATH"
        
        # Check if file exists
        if [ -f "$FULL_PATH" ]; then
            echo "Found image: $FULL_PATH"
            
            # Git add the image
            git add "$FULL_PATH"
            
            # Construct Raw URL
            # https://raw.githubusercontent.com/OWNER/REPO/BRANCH/PATH
            RAW_URL="https://raw.githubusercontent.com/$REPO_PATH/$CURRENT_BRANCH/$FULL_PATH"
            
            # Escape slashes for sed
            ESCAPED_IMG_PATH=$(echo "$IMG_REL_PATH" | sed 's/\//\\\//g')
            ESCAPED_RAW_URL=$(echo "$RAW_URL" | sed 's/\//\\\//g')
            
            # Add to sed script
            sed_script+="s/($ESCAPED_IMG_PATH)/($ESCAPED_RAW_URL)/g;"
        else
            echo -e "${RED}Warning: Image not found at $FULL_PATH${NC}"
        fi
    fi
done < "$REPORT_PATH"

# Apply replacements
if [ ! -z "$sed_script" ]; then
    sed -i '' "$sed_script" "$TEMP_REPORT"
    echo "Replaced image paths with GitHub URLs."
    
    # Commit images
    echo "Committing images to repository..."
    git commit -m "Add test screenshots for Issue #$ISSUE_NUMBER"
    
    # Push changes
    echo "Pushing changes to remote..."
    git push
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to push images. The links in the report might be broken.${NC}"
        # We continue anyway? Or exit?
        # Let's continue but warn.
    fi
else
    echo "No images found to process."
fi

echo "Posting report to Issue #$ISSUE_NUMBER..."

# Post the report as a comment
gh issue comment "$ISSUE_NUMBER" --body-file "$TEMP_REPORT"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully posted report to Issue #$ISSUE_NUMBER${NC}"
    rm "$TEMP_REPORT"
else
    echo -e "${RED}Failed to post report.${NC}"
    rm "$TEMP_REPORT"
    exit 1
fi

echo "Tagging Issue #$ISSUE_NUMBER as FIXED..."

# Add FIXED label
gh issue edit "$ISSUE_NUMBER" --add-label "FIXED"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully labeled Issue #$ISSUE_NUMBER as FIXED${NC}"
else
    echo -e "${RED}Failed to label issue.${NC}"
    exit 1
fi

echo -e "${GREEN}Done!${NC}"
