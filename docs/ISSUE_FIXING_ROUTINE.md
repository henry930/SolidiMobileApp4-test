# Issue Fixing Routine

## Standard Workflow for Fixing GitHub Issues

### 1. Get Issue Requirements
- Go to GitHub Issues to get all requirements and comments for that issue
- Read through all discussion and comments thoroughly
- Understand the complete scope and any edge cases mentioned

### 2. Create Issue Branch
- **Unless explicit requirement/comments state otherwise:**
- Create an issue branch from the `release` branch for the fixing/coding
- Branch naming convention: `issue-{number}` (e.g., `issue-109`)
- Command: `git checkout release && git checkout -b issue-{number}`

### 3. Add "Processing" Label
- Add the `processing` label to the GitHub issue
- This signals to the project manager that work has started
- The project manager will review and provide comments in the meantime

### 4. Implement the Fix
- Make all necessary code changes
- Test the changes thoroughly
- Ensure code follows project standards
- Commit changes with clear, descriptive messages

### 5. Create Pull Request
- After the fix is complete, change the `processing` label to `Fixed (not in release)`
- Create a Pull Request (PR) from your issue branch to `release`
- PR title should reference the issue: "Fix #109: [Brief description]"
- PR description should include:
  - What was fixed
  - How it was fixed
  - Any testing performed
  - Screenshots/recordings if applicable

### 6. Project Manager Review
- The project manager will review the PR
- They may provide comments or further instructions
- Address any feedback promptly
- Make additional commits if changes are requested

### 7. After PR Merge
- Once the PR is merged to `release`:
- Change the label from `Fixed (not in release)` to `Fixed (in release)`
- Close the issue if not automatically closed
- Delete the issue branch if no longer needed

## Quick Reference Commands

```bash
# 1. Checkout release and create issue branch
git checkout release
git pull origin release
git checkout -b issue-{number}

# 2. After fixing, commit changes
git add .
git commit -m "Fix #{number}: Description of fix"
git push origin issue-{number}

# 3. Create PR via GitHub web interface or CLI
gh pr create --base release --head issue-{number} --title "Fix #{number}: Description"

# 4. After PR is merged
git checkout release
git pull origin release
git branch -d issue-{number}
```

## Labels Used

- **processing** - Work in progress
- **Fixed (not in release)** - Fix completed, PR created, awaiting merge
- **Fixed (in release)** - PR merged to release branch

## Notes

- Always work from the `release` branch unless told otherwise
- Keep commits atomic and well-described
- Test thoroughly before creating PR
- Communicate with project manager if requirements are unclear
