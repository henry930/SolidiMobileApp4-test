#!/bin/bash

# Script to update all verified issues on GitHub
# Requires gh CLI to be installed and authenticated

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

echo "Starting batch update of issues..."

# Issue 77
echo -e "${GREEN}Processing Issue 77...${NC}"
./scripts/post_report_to_github.sh 77 test-results/issue-77/REPORT.md

# Issue 79
echo -e "${GREEN}Processing Issue 79...${NC}"
./scripts/post_report_to_github.sh 79 test-results/issue-79/REPORT.md

# Issue 84
echo -e "${GREEN}Processing Issue 84...${NC}"
./scripts/post_report_to_github.sh 84 test-results/issue-84/REPORT.md

# Issue 86
echo -e "${GREEN}Processing Issue 86...${NC}"
./scripts/post_report_to_github.sh 86 test-results/issue-86/REPORT.md

echo -e "${GREEN}Batch update complete!${NC}"
