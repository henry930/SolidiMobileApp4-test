#!/bin/bash

# Post Issue Test Results to GitHub
# Usage: ./scripts/post_issue_result.sh <issue_number> <status>
# Example: ./scripts/post_issue_result.sh 46 Fixed
# Example: ./scripts/post_issue_result.sh 56 Verified

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Issue number required${NC}"
    echo "Usage: ./scripts/post_issue_result.sh <issue_number> [status]"
    echo "Status options: Fixed, Verified, NeedsWork"
    exit 1
fi

ISSUE_NUM=$1
STATUS=${2:-""}  # Optional status label

COMMENT_FILE="test-results/issue-${ISSUE_NUM}/github_comment.md"
REPORT_FILE="test-results/issue-${ISSUE_NUM}/REPORT.md"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Post Issue #${ISSUE_NUM} Results${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if comment file exists
if [ ! -f "$COMMENT_FILE" ]; then
    echo -e "${RED}Error: Comment file not found: ${COMMENT_FILE}${NC}"
    echo "Did you run: ./scripts/run_issue_test.sh ${ISSUE_NUM} ?"
    exit 1
fi

# Show what will be posted
echo -e "${YELLOW}📝 Comment to be posted:${NC}"
echo ""
cat "$COMMENT_FILE"
echo ""

# Ask for confirmation
read -p "Post this comment to GitHub issue #${ISSUE_NUM}? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

# Post comment
echo -e "${BLUE}📤 Posting to GitHub...${NC}"
gh issue comment "$ISSUE_NUM" --body-file "$COMMENT_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Comment posted successfully!${NC}"
else
    echo -e "${RED}❌ Failed to post comment${NC}"
    exit 1
fi

# Add label if provided
if [ -n "$STATUS" ]; then
    echo ""
    echo -e "${BLUE}🏷️  Adding label: ${STATUS}${NC}"
    gh issue edit "$ISSUE_NUM" --add-label "$STATUS"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Label added successfully!${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to add label (might already exist)${NC}"
    fi
fi

# Show link
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Done! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "View on GitHub:"
echo -e "${BLUE}https://github.com/SolidiFX/SolidiMobileApp4/issues/${ISSUE_NUM}${NC}"
echo ""
