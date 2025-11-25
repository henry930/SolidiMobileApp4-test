# Troubleshooting Guide

Common issues and solutions when writing Maestro tests for the Solidi Mobile App.

## Navigation Issues

### Issue: Tab Not Switching

**Symptoms**:
- Tap on bottom navigation tab doesn't switch screens
- Test continues but on wrong screen

**Causes**:
1. Tapping at 96% height hits iPhone home indicator
2. Coordinate is slightly off
3. Tab is disabled or loading

**Solutions**:

```yaml
# ✅ Solution 1: Tap higher (90% instead of 96%)
- tapOn:
    point: "60%,90%"  # Instead of 96%

# ✅ Solution 2: Use multiple attempts
- tapOn:
    point: "60%,90%"
- runFlow:
    when:
        notVisible: "Expected Element"
    commands:
        - tapOn:
            point: "60%,88%"

# ✅ Solution 3: Use text selector
- tapOn: ".*Wallet.*"
```

### Issue: Modal Closes Instead of Keyboard

**Symptoms**:
- After entering text, tapping to dismiss keyboard closes entire screen
- "Element not found" errors after keyboard dismissal

**Cause**: Tapping outside the modal area (especially top corners) closes the modal.

**Solution**:

```yaml
# ❌ WRONG - Closes modal
- inputText: "0.001"
- hideKeyboard
- tapOn:
    point: "10%,10%"  # DON'T tap top corners!

# ✅ CORRECT - Only dismisses keyboard
- inputText: "0.001"
- hideKeyboard
- tapOn:
    point: "90%,85%"  # Tap return key instead
```

## Element Selection Issues

### Issue: "Element not found" Error

**Symptoms**:
- Test fails with "Element not found: Text matching regex: ..."
- Element is visible in screenshot but not found

**Debugging Steps**:

1. **Check actual text with Maestro Studio**
   ```bash
   maestro studio
   # Navigate to screen and click element
   # Copy the exact text shown
   ```

2. **Try regex pattern**
   ```yaml
   # Instead of exact match
   - tapOn: "Withdraw"
   
   # Use regex
   - tapOn: ".*Withdraw.*"
   ```

3. **Check for special characters**
   ```yaml
   # Text might have icons or Unicode
   - tapOn: ".*Withdraw.*"  # Handles any prefix/suffix
   ```

4. **Wait longer**
   ```yaml
   - extendedWaitUntil:
       visible: "Element"
       timeout: 15000  # Increase timeout
   ```

5. **Take screenshot**
   ```yaml
   - takeScreenshot: debug_screen
   # Check if element is actually visible
   ```

### Issue: Element Found But Tap Doesn't Work

**Causes**:
1. Element is covered by keyboard
2. Element is disabled
3. Element is in a scrollable area (not visible)
4. Wrong element matched (multiple matches)

**Solutions**:

```yaml
# Solution 1: Dismiss keyboard first
- hideKeyboard
- tapOn: "Element"

# Solution 2: Scroll to element
- scroll:
    until:
        visible: "Element"
- tapOn: "Element"

# Solution 3: Use more specific selector
- tapOn: "Exact Element Text"  # Instead of regex

# Solution 4: Use testID
- tapOn:
    id: "unique-test-id"
```

## Keyboard Issues

### Issue: Keyboard Won't Dismiss

**Symptoms**:
- `hideKeyboard` doesn't work
- Keyboard blocks UI elements
- Can't tap elements below keyboard

**Solution**:

```yaml
# Use multi-method approach
- hideKeyboard
- tapOn:
    point: "90%,85%"  # Tap return key
- swipe:
    start: 50%, 60%
    end: 50%, 40%
- extendedWaitUntil:
    visible: "non_existent_element"
    timeout: 2000
    optional: true
```

See [Keyboard Handling Guide](./keyboard-handling-guide.md) for details.

### Issue: Can't Find Return/Done Key

**Symptoms**:
- Tapping 90%, 85% doesn't dismiss keyboard
- Different keyboard type than expected

**Solution**:

```yaml
# Try different keyboard key locations
- tapOn:
    point: "90%,85%"  # Numeric keyboard

# If that doesn't work, try
- tapOn:
    point: "85%,88%"  # Text keyboard

# Or take screenshot to see keyboard
- takeScreenshot: keyboard_visible
```

## Form Input Issues

### Issue: Text Not Clearing Before Input

**Symptoms**:
- New text appends to existing text
- Wrong amount entered

**Solution**:

```yaml
# Always erase before inputting
- tapOn:
    id: "text-input-outline"
- eraseText  # Clear existing text
- inputText: "0.001"
```

### Issue: Dropdown Not Opening

**Symptoms**:
- Tap on dropdown field doesn't open options
- "Element not found" for dropdown items

**Causes**:
1. Keyboard is covering the dropdown
2. Tapping wrong element
3. Dropdown is disabled

**Solutions**:

```yaml
# Solution 1: Dismiss keyboard first
- hideKeyboard
- tapOn:
    point: "90%,85%"
- tapOn: "Select a saved address.*"

# Solution 2: Wait for dropdown to be ready
- extendedWaitUntil:
    visible: "Select a saved address.*"
    timeout: 5000
- tapOn: "Select a saved address.*"

# Solution 3: Use coordinate tap
- tapOn:
    point: "50%,45%"  # Approximate dropdown location
```

## Timing Issues

### Issue: Test Runs Too Fast

**Symptoms**:
- Elements not found because page hasn't loaded
- Actions happen before previous action completes

**Solution**:

```yaml
# Add explicit waits
- tapOn: "Button"
- extendedWaitUntil:
    visible: "Next Screen Element"
    timeout: 10000

# Or use blind wait
- extendedWaitUntil:
    visible: "non_existent_element"
    timeout: 3000
    optional: true
```

### Issue: Test Times Out

**Symptoms**:
- "Assertion timed out" errors
- Test hangs on wait commands

**Solutions**:

```yaml
# Make waits optional
- extendedWaitUntil:
    visible: "Element"
    timeout: 10000
    optional: true  # Won't fail if not found

# Or reduce timeout
- extendedWaitUntil:
    visible: "Element"
    timeout: 5000  # Shorter timeout
```

## App-Specific Issues

### Issue: Biometric Prompt Blocks Test

**Symptoms**:
- Test hangs on app launch
- Face ID / Touch ID prompt appears

**Solution**:

```yaml
- launchApp
- extendedWaitUntil:
    visible: ".*"
    timeout: 45000

# Dismiss biometric prompt if it appears
- runFlow:
    when:
        visible: "Cancel"
    commands:
        - tapOn: "Cancel"
```

### Issue: Withdraw Form Disappears

**Symptoms**:
- After entering amount, entire withdraw screen closes
- "Element not found" for submit button

**Cause**: Tapping outside modal to dismiss keyboard closes the modal.

**Solution**: See [Keyboard Handling Guide](./keyboard-handling-guide.md).

## Debugging Techniques

### Technique 1: Screenshot Everything

```yaml
- takeScreenshot: 01_start
- tapOn: "Button"
- takeScreenshot: 02_after_button
- inputText: "text"
- takeScreenshot: 03_after_input
# etc.
```

### Technique 2: Use Maestro Studio

1. Run `maestro studio`
2. Manually perform the action
3. See what command Studio generates
4. Copy that command to your test

### Technique 3: Simplify the Test

```yaml
# Instead of full flow, test one step at a time
- launchApp
- tapOn:
    point: "60%,90%"
- takeScreenshot: wallet_screen
# Stop here and verify navigation works
```

### Technique 4: Check Test Output Folder

```bash
# Open the latest test results
open ~/.maestro/tests/$(ls -t ~/.maestro/tests/ | head -1)
```

Review:
- Screenshots
- Logs
- Error messages

## Common Error Messages

### "Element not found"

**Meaning**: Maestro couldn't find the element with the given selector.

**Fix**: 
- Check spelling
- Use regex
- Increase timeout
- Take screenshot to see actual state

### "Assertion is false"

**Meaning**: The condition you're checking is not true.

**Fix**:
- Make assertion optional
- Increase timeout
- Check if element actually appears

### "Unknown Property"

**Meaning**: YAML syntax error.

**Fix**:
- Check indentation
- Check property names
- Refer to Maestro documentation

## Best Practices to Avoid Issues

1. **Always verify navigation succeeded**
   ```yaml
   - tapOn: "Tab"
   - assertVisible: "Expected Screen Element"
   ```

2. **Use multiple fallback strategies**
   ```yaml
   - runFlow:
       when:
           visible: "Element"
       commands:
           - tapOn: "Element"
   - runFlow:
       when:
           notVisible: "Element"
       commands:
           - tapOn:
               point: "X%,Y%"
   ```

3. **Take screenshots at critical points**
   ```yaml
   - takeScreenshot: before_critical_action
   - tapOn: "Critical Button"
   - takeScreenshot: after_critical_action
   ```

4. **Document coordinate taps**
   ```yaml
   # Tap Withdraw button (right side, 32% from top)
   - tapOn:
       point: "75%,32%"
   ```

5. **Use testID when possible**
   ```yaml
   - tapOn:
       id: "unique-test-id"
   ```

## Getting Help

1. **Check Maestro Documentation**: https://maestro.mobile.dev/
2. **Use Maestro Studio**: `maestro studio`
3. **Review these guides**: All guides in `.maestro/guides/`
4. **Check test screenshots**: `~/.maestro/tests/`
5. **Ask in Maestro Discord**: https://discord.gg/maestro
