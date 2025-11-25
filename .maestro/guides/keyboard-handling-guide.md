# Keyboard Handling Guide

## The Keyboard Problem

When entering text in forms, the iOS keyboard appears and can:
- **Block UI elements** below it
- **Prevent tapping** on covered elements
- **Not dismiss** with simple `hideKeyboard` command
- **Close entire modals** if you tap in the wrong area to dismiss it

## Keyboard Dismissal Strategies

### Strategy 1: Multiple Dismissal Methods (Recommended)

Use a combination of methods to ensure the keyboard dismisses:

```yaml
# After entering text
- inputText: "0.001"

# Method 1: hideKeyboard command
- hideKeyboard

# Method 2: Tap the return/done key (bottom right of numeric keyboard)
- tapOn:
    point: "90%,85%"

# Method 3: Swipe down
- swipe:
    start: 50%, 60%
    end: 50%, 40%

# Wait for keyboard to dismiss
- extendedWaitUntil:
    visible: "non_existent_element"
    timeout: 2000
    optional: true
```

### Strategy 2: Tap Return Key Only

If you know where the return/done key is:

```yaml
- inputText: "0.001"

# Tap the return/done key on keyboard
# For numeric keyboard: bottom right corner
- tapOn:
    point: "90%,85%"

# For text keyboard: bottom right, might be different
- tapOn:
    point: "85%,88%"
```

### Strategy 3: Just hideKeyboard (Simplest, Sometimes Works)

```yaml
- inputText: "0.001"
- hideKeyboard

# Wait briefly
- extendedWaitUntil:
    visible: "non_existent_element"
    timeout: 1000
    optional: true
```

## ⚠️ What NOT to Do

### DON'T Tap Random Areas to Dismiss Keyboard

```yaml
# ❌ WRONG - This might close the entire modal/screen!
- inputText: "0.001"
- hideKeyboard
- tapOn:
    point: "10%,10%"  # Tapping top left can close modals!
```

**Why it fails**: In the Solidi app, tapping outside the form area (especially at the top) dismisses the entire withdraw modal, not just the keyboard.

### DON'T Assume hideKeyboard Always Works

```yaml
# ❌ RISKY - hideKeyboard alone often doesn't work
- inputText: "0.001"
- hideKeyboard
- tapOn: "Next Button"  # Might fail if keyboard still visible
```

## Keyboard Types and Return Keys

Different keyboard types have different return key locations:

| Keyboard Type | Return Key Location | Use Case |
|---------------|---------------------|----------|
| Numeric | 90%, 85% | Amount fields |
| Email | 85%, 88% | Email input |
| Default | 85%, 88% | General text |
| Phone | 90%, 85% | Phone numbers |

## Complete Example: Form with Keyboard

```yaml
# 1. Tap input field
- tapOn:
    id: "amount-input"

# 2. Clear existing text
- eraseText

# 3. Enter new text
- inputText: "0.001"

# 4. Dismiss keyboard (multi-method approach)
- hideKeyboard
- tapOn:
    point: "90%,85%"  # Tap return key
- swipe:
    start: 50%, 60%
    end: 50%, 40%

# 5. Wait for keyboard to fully dismiss
- extendedWaitUntil:
    visible: "non_existent_element"
    timeout: 2000
    optional: true

# 6. Now safe to tap other elements
- tapOn: "Select a saved address.*"
```

## Debugging Keyboard Issues

### Take Screenshots to See Keyboard State

```yaml
- inputText: "0.001"
- takeScreenshot: 01_keyboard_visible

- hideKeyboard
- takeScreenshot: 02_after_hideKeyboard

- tapOn:
    point: "90%,85%"
- takeScreenshot: 03_after_return_key

- swipe:
    start: 50%, 60%
    end: 50%, 40%
- takeScreenshot: 04_after_swipe
```

### Check if Element is Blocked by Keyboard

```yaml
# Try to tap element
- runFlow:
    when:
        visible: "Next Button"
    commands:
        - tapOn: "Next Button"

# If not visible, keyboard might be blocking it
- runFlow:
    when:
        notVisible: "Next Button"
    commands:
        # Try dismissing keyboard again
        - hideKeyboard
        - tapOn:
            point: "90%,85%"
        # Then retry
        - tapOn: "Next Button"
```

## App-Specific Keyboard Behavior

### Solidi Withdraw Form

**Observed Behavior**:
- `hideKeyboard` alone does NOT reliably dismiss the keyboard
- Tapping at top of screen (10%, 10%) closes the entire withdraw modal
- **Working solution**: `hideKeyboard` + tap return key (90%, 85%) + swipe down

```yaml
# ✅ WORKING pattern for Solidi withdraw form
- tapOn:
    id: "text-input-outline"
- eraseText
- inputText: "0.001"
- hideKeyboard
- tapOn:
    point: "90%,85%"
- swipe:
    start: 50%, 60%
    end: 50%, 40%
```

## Best Practices

1. **Always use multiple dismissal methods** for critical flows
2. **Never tap random areas** to dismiss keyboard
3. **Wait after dismissal** before tapping other elements
4. **Take screenshots** when debugging keyboard issues
5. **Document keyboard behavior** for each form in your app
6. **Test on real devices** - keyboard behavior varies

## Quick Reference

### Numeric Keyboard Return Key
```yaml
- tapOn:
    point: "90%,85%"
```

### Text Keyboard Return Key
```yaml
- tapOn:
    point: "85%,88%"
```

### Swipe to Dismiss
```yaml
- swipe:
    start: 50%, 60%
    end: 50%, 40%
```

### Full Dismissal Combo
```yaml
- hideKeyboard
- tapOn:
    point: "90%,85%"
- swipe:
    start: 50%, 60%
    end: 50%, 40%
- extendedWaitUntil:
    visible: "non_existent_element"
    timeout: 2000
    optional: true
```
