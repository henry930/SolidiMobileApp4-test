#!/bin/bash

# Semi-Automated Issue Testing Script
# Usage: ./scripts/run_issue_test.sh <issue_number>
# Example: ./scripts/run_issue_test.sh 56

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if issue number provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Issue number required${NC}"
    echo "Usage: ./scripts/run_issue_test.sh <issue_number>"
    exit 1
fi

ISSUE_NUM=$1
YAML_FILE=".maestro/issue_${ISSUE_NUM}_test.yaml"
REPORT_DIR="test-results/issue-${ISSUE_NUM}"
REPORT_FILE="${REPORT_DIR}/REPORT.md"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Issue #${ISSUE_NUM} Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if YAML file exists
if [ ! -f "$YAML_FILE" ]; then
    echo -e "${RED}Error: Test file not found: ${YAML_FILE}${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Test file: ${YAML_FILE}${NC}"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# Run Maestro test
echo -e "${BLUE}🚀 Running Maestro test...${NC}"
echo ""

if maestro test "$YAML_FILE"; then
    TEST_STATUS="PASSED"
    STATUS_EMOJI="✅"
    STATUS_COLOR=$GREEN
else
    TEST_STATUS="FAILED"
    STATUS_EMOJI="❌"
    STATUS_COLOR=$RED
fi

echo ""
echo -e "${STATUS_COLOR}${STATUS_EMOJI} Test ${TEST_STATUS}${NC}"
echo ""

# Find latest test results
LATEST_TEST=$(ls -t ~/.maestro/tests/ | head -n 1)
TEST_PATH="$HOME/.maestro/tests/$LATEST_TEST"

echo -e "${YELLOW}📁 Test artifacts: ${TEST_PATH}${NC}"
echo ""

# Generate report template
echo -e "${BLUE}📝 Generating report template...${NC}"

cat > "$REPORT_FILE" << EOF
# Issue #${ISSUE_NUM}: [TITLE] - ${TEST_STATUS} ${STATUS_EMOJI}

**Test Date:** $(date +"%B %d, %Y")  
**Status:** ${STATUS_EMOJI} ${TEST_STATUS}  
**App Version:** SolidiMobileApp4  
**Platform:** iOS Simulator

## Issue Summary

[TODO: Describe what this issue is about]

## Test Execution

**Test File:** \`${YAML_FILE}\`  
**Test Results:** \`${TEST_PATH}\`

### Test Steps
[TODO: List the key test steps]

1. 
2. 
3. 

### Test Results

**Status:** ${TEST_STATUS}

EOF

if [ "$TEST_STATUS" = "PASSED" ]; then
    cat >> "$REPORT_FILE" << EOF
✅ All test steps passed successfully

## Verification Result

**Status:** ✅ **VERIFIED**

- ✅ [TODO: List what was verified]
- ✅ 
- ✅ 

EOF
else
    cat >> "$REPORT_FILE" << EOF
❌ Test failed at: [TODO: Identify which step failed]

**Error:** [TODO: Describe the error]

## Investigation Findings

[TODO: Analyze why the test failed]

### Root Cause

[TODO: Describe the root cause if known]

### Recommended Fix

[TODO: Suggest how to fix the issue]

EOF
fi

cat >> "$REPORT_FILE" << EOF
## Screenshots

[TODO: Add relevant screenshots from test artifacts]

![Screenshot]($TEST_PATH/[screenshot-name].png)

## Files Analyzed

- \`[TODO: List files you reviewed]\`

## GitHub

- Issue: #${ISSUE_NUM}
- Status: [TODO: VERIFIED/FIXED/NEEDS_WORK]
EOF

echo -e "${GREEN}✅ Report template created: ${REPORT_FILE}${NC}"
echo ""

# Copy screenshots to report directory
if [ -d "$TEST_PATH" ]; then
    echo -e "${BLUE}📸 Copying screenshots...${NC}"
    cp "$TEST_PATH"/*.png "$REPORT_DIR/" 2>/dev/null || echo -e "${YELLOW}⚠️  No screenshots found${NC}"
    echo ""
fi

# Generate GitHub comment template
COMMENT_FILE="${REPORT_DIR}/github_comment.md"
cat > "$COMMENT_FILE" << EOF
## ${STATUS_EMOJI} Issue #${ISSUE_NUM} ${TEST_STATUS}

**Test Complete:** [TODO: Brief summary]

**Findings:**
- [TODO: Key finding 1]
- [TODO: Key finding 2]
- [TODO: Key finding 3]

**Status:** ${TEST_STATUS}

Full report: [REPORT.md](https://github.com/SolidiFX/SolidiMobileApp4/blob/main/test-results/issue-${ISSUE_NUM}/REPORT.md)
EOF

echo -e "${GREEN}✅ GitHub comment template created: ${COMMENT_FILE}${NC}"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Next Steps${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "1. ${YELLOW}Review test artifacts:${NC}"
echo -e "   open ${TEST_PATH}"
echo ""
echo -e "2. ${YELLOW}Edit the report:${NC}"
echo -e "   code ${REPORT_FILE}"
echo ""
echo -e "3. ${YELLOW}Post to GitHub:${NC}"
echo -e "   gh issue comment ${ISSUE_NUM} --body-file ${COMMENT_FILE}"
echo ""
echo -e "4. ${YELLOW}Add label (if fixed):${NC}"
echo -e "   gh issue edit ${ISSUE_NUM} --add-label \"Fixed\""
echo ""
echo -e "${GREEN}Done! 🎉${NC}"
