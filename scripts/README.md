# Testing Scripts

## Quick Reference

### 1. Run Test & Generate Report
```bash
./scripts/run_issue_test.sh <issue_number>
```

### 2. Post Results to GitHub
```bash
./scripts/post_issue_result.sh <issue_number> [status]
```

---

## Complete Workflow Example

### Test Issue #46
```bash
# Step 1: Run test
./scripts/run_issue_test.sh 46

# Step 2: Fill in the report
code test-results/issue-46/REPORT.md
# Edit [TODO] sections

# Step 3: Post to GitHub
./scripts/post_issue_result.sh 46 Fixed
# or
./scripts/post_issue_result.sh 46 Verified
```

---

## Script 1: `run_issue_test.sh`

### What It Does Automatically ✅
1. Runs Maestro test
2. Captures pass/fail status
3. Generates report template
4. Copies screenshots
5. Creates GitHub comment template
6. Shows next steps

### Usage
```bash
./scripts/run_issue_test.sh <issue_number>

# Examples:
./scripts/run_issue_test.sh 56
./scripts/run_issue_test.sh 46
./scripts/run_issue_test.sh 86
```

### Output Files
- `test-results/issue-XX/REPORT.md` - Full report template
- `test-results/issue-XX/github_comment.md` - GitHub comment
- `test-results/issue-XX/*.png` - Screenshots

---

## Script 2: `post_issue_result.sh`

### What It Does ✅
1. Shows you what will be posted
2. Asks for confirmation
3. Posts comment to GitHub
4. Adds status label (Fixed/Verified)
5. Shows GitHub link

### Usage
```bash
./scripts/post_issue_result.sh <issue_number> [status]

# Examples:
./scripts/post_issue_result.sh 46 Fixed
./scripts/post_issue_result.sh 56 Verified
./scripts/post_issue_result.sh 86 Fixed
```

### Status Options
- `Fixed` - Issue has been fixed
- `Verified` - Issue verified as working
- `NeedsWork` - Issue needs more work
- (Leave empty to post without label)

---

## Manual Commands (If You Prefer)

### Post Comment Only
```bash
gh issue comment 46 --body-file test-results/issue-46/github_comment.md
```

### Add Label Only
```bash
gh issue edit 46 --add-label "Fixed"
```

### View Issue
```bash
gh issue view 46
```

---

## Full Example Workflow

```bash
# 1. Run test
./scripts/run_issue_test.sh 46

# Output:
# ========================================
#   Issue #46 Test Runner
# ========================================
# 
# 🚀 Running Maestro test...
# ❌ Test FAILED
# 
# 📝 Generating report template...
# ✅ Report template created: test-results/issue-46/REPORT.md

# 2. Review test artifacts
open /Users/henry/.maestro/tests/2025-12-02_081449

# 3. Fill in the report
code test-results/issue-46/REPORT.md

# Edit these sections:
# - [TODO: Describe what this issue is about]
# - [TODO: Identify which step failed]
# - [TODO: Describe the error]
# - [TODO: Analyze why the test failed]

# 4. Post to GitHub
./scripts/post_issue_result.sh 46 Fixed

# Output:
# ========================================
#   Post Issue #46 Results
# ========================================
# 
# 📝 Comment to be posted:
# 
# ## ❌ Issue #46 FAILED
# ...
# 
# Post this comment to GitHub issue #46? (y/n) y
# 
# 📤 Posting to GitHub...
# ✅ Comment posted successfully!
# 🏷️  Adding label: Fixed
# ✅ Label added successfully!
# 
# View on GitHub:
# https://github.com/SolidiFX/SolidiMobileApp4/issues/46
```

---

## Tips

### Quick One-Liner
```bash
# Run test, edit report, and post (manual edit in between)
./scripts/run_issue_test.sh 46 && \
  code test-results/issue-46/REPORT.md && \
  ./scripts/post_issue_result.sh 46 Fixed
```

### Batch Testing
```bash
# Test multiple issues
for issue in 46 56 86; do
  ./scripts/run_issue_test.sh $issue
done
```

### View All Test Results
```bash
ls -la test-results/
```

---

## Troubleshooting

### "Comment file not found"
```
Error: Comment file not found: test-results/issue-46/github_comment.md
```
**Solution:** Run `./scripts/run_issue_test.sh 46` first

### "gh: command not found"
```
gh: command not found
```
**Solution:** Install GitHub CLI: `brew install gh && gh auth login`

### "Test file not found"
```
Error: Test file not found: .maestro/issue_46_test.yaml
```
**Solution:** Create the test file in `.maestro/` first

---

## Comparison: Before vs After

| Task | Before (Manual) | After (Scripts) |
|------|----------------|-----------------|
| Run test | `maestro test .maestro/issue_46_test.yaml` | `./scripts/run_issue_test.sh 46` |
| Find results | Search `~/.maestro/tests/` | Auto-shown |
| Create report | Write from scratch | Template generated |
| Copy screenshots | Manual copy | Auto-copied |
| Post to GitHub | Write + `gh issue comment` | `./scripts/post_issue_result.sh 46 Fixed` |
| Add label | `gh issue edit 46 --add-label "Fixed"` | Included in post script |
| **Total time** | ~30 minutes | **~5 minutes** |
| **Commands** | 10+ commands | **2 commands** |

---

## Next Steps

1. Try it on an existing issue:
   ```bash
   ./scripts/run_issue_test.sh 56
   ```

2. Fill in the report:
   ```bash
   code test-results/issue-56/REPORT.md
   ```

3. Post it:
   ```bash
   ./scripts/post_issue_result.sh 56 Verified
   ```

**That's it! No AI needed.** 🎉
