# Common Patterns

Reusable code patterns for Maestro tests in the Solidi Mobile App.

## Navigation Patterns

### Navigate to Wallet Screen

```yaml
# Robust navigation with fallbacks
- tapOn:
    point: "60%,90%"

- extendedWaitUntil:
    visible: "non_existent_element"
    timeout: 3000
    optional: true

- runFlow:
    when:
        notVisible: ".*Withdraw.*"
    commands:
        - tapOn:
            point: "60%,88%"
        - extendedWaitUntil:
            visible: "non_existent_element"
            timeout: 3000
            optional: true

- runFlow:
    when:
        notVisible: ".*Withdraw.*"
    commands:
        - tapOn: ".*Wallet.*"
```

### Navigate to Any Bottom Tab

```yaml
# Generic pattern - replace X% with tab position
- tapOn:
    point: "X%,90%"  # 20%, 40%, 60%, 80%, or 100%

- extendedWaitUntil:
    visible: "Expected Element"
    timeout: 10000
```

## Form Input Patterns

### Enter Amount with Keyboard Dismissal

```yaml
# Complete pattern for numeric input
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
- extendedWaitUntil:
    visible: "non_existent_element"
    timeout: 2000
    optional: true
```

### Select from Dropdown

```yaml
# Open dropdown
- tapOn: "Select a saved address.*"

# Wait for dropdown to appear
- extendedWaitUntil:
    visible: ".*"
    timeout: 3000

# Select first item (or use specific text)
- tapOn:
    point: "50%,50%"  # Center of dropdown

# Or select by text
- tapOn: "Specific Address Name"
```

## Button Interaction Patterns

### Tap Button with Fallback

```yaml
# Try text selector first
- runFlow:
    when:
        visible: "Withdraw|Send|Confirm"
    commands:
        - tapOn: "Withdraw|Send|Confirm"

# Fallback to coordinate
- runFlow:
    when:
        notVisible: "Withdraw|Send|Confirm"
    commands:
        - tapOn:
            point: "75%,85%"
```

### Tap Button with Retry

```yaml
# Attempt 1
- tapOn: "Submit"

# Verify it worked
- runFlow:
    when:
        notVisible: "Success|Confirmation"
    commands:
        # Retry if didn't work
        - tapOn: "Submit"
```

## Asset Selection Pattern

### Smart BTC Selection

```yaml
# Only select if not already selected
- runFlow:
    when:
        notVisible: "BTC (Bitcoin)"
    commands:
        - tapOn: ".*Asset.*|.*Currency.*"
        - extendedWaitUntil:
            visible: "BTC (Bitcoin)"
            timeout: 5000
        - tapOn: "BTC (Bitcoin)"

# If already visible, tap to confirm
- runFlow:
    when:
        visible: "BTC (Bitcoin)"
    commands:
        - tapOn: "BTC (Bitcoin)"
```

## Waiting Patterns

### Wait for Page Load

```yaml
# Generic wait pattern
- extendedWaitUntil:
    visible: ".*"
    timeout: 10000
```

### Wait for Specific Element

```yaml
- extendedWaitUntil:
    visible: "Expected Element"
    timeout: 15000
```

### Optional Wait (Won't Fail)

```yaml
- extendedWaitUntil:
    visible: "Optional Element"
    timeout: 5000
    optional: true
```

### Blind Wait (Using Dummy Tap)

```yaml
# Wait 3 seconds without checking for element
- runFlow:
    commands:
        - tapOn:
            point: "50%,50%"
- extendedWaitUntil:
    visible: "non_existent_element"
    timeout: 3000
    optional: true
```

## Screenshot Patterns

### Debug with Screenshots

```yaml
- takeScreenshot: 01_initial_state
- tapOn: "Button"
- takeScreenshot: 02_after_button_tap
- inputText: "value"
- takeScreenshot: 03_after_input
```

### Screenshot Before/After Critical Actions

```yaml
- takeScreenshot: before_submit
- tapOn: "Submit"
- extendedWaitUntil:
    visible: "Success"
    timeout: 10000
    optional: true
- takeScreenshot: after_submit
```

## Error Handling Patterns

### Conditional Flow Based on Element Visibility

```yaml
# If element exists, do action A
- runFlow:
    when:
        visible: "Element"
    commands:
        - tapOn: "Element"
        - # ... more actions

# Otherwise, do action B
- runFlow:
    when:
        notVisible: "Element"
    commands:
        - tapOn: "Alternative"
        - # ... more actions
```

### Handle Optional Dialogs

```yaml
# Dismiss dialog if it appears
- runFlow:
    when:
        visible: "OK|Close|Dismiss"
    commands:
        - tapOn: "OK|Close|Dismiss"
```

## Complete Flow Examples

### Login Flow

```yaml
- launchApp
- extendedWaitUntil:
    visible: ".*"
    timeout: 45000

# Handle biometric prompt if appears
- runFlow:
    when:
        visible: "Cancel"
    commands:
        - tapOn: "Cancel"

# Enter credentials
- tapOn: "Email"
- inputText: "user@example.com"
- tapOn: "Password"
- inputText: "password123"
- hideKeyboard

# Submit
- tapOn: "Sign In"
- extendedWaitUntil:
    visible: "Home|Dashboard"
    timeout: 15000
```

### Withdraw Flow

```yaml
# Navigate to Wallet
- tapOn:
    point: "60%,90%"

# Open withdraw form
- tapOn: ".*Withdraw.*"

# Select asset
- tapOn: "BTC (Bitcoin)"

# Enter amount
- tapOn:
    id: "text-input-outline"
- eraseText
- inputText: "0.001"
- hideKeyboard
- tapOn:
    point: "90%,85%"

# Select address
- tapOn: "Select a saved address.*"
- tapOn:
    point: "50%,50%"

# Submit
- tapOn:
    point: "75%,85%"
- extendedWaitUntil:
    visible: "Success"
    timeout: 10000
    optional: true
```

## Reusable Snippets

### App Launch

```yaml
- launchApp
- extendedWaitUntil:
    visible: ".*"
    timeout: 45000
```

### Dismiss Keyboard (Full)

```yaml
- hideKeyboard
- tapOn:
    point: "90%,85%"
- swipe:
    start: 50%, 60%
    end: 50%, 40%
```

### Verify Success

```yaml
- extendedWaitUntil:
    visible: "Success|Done|OK|Confirmed"
    timeout: 10000
    optional: true
- takeScreenshot: final_result
```

## Tips for Creating Patterns

1. **Extract repeated code** into patterns
2. **Document coordinates** with comments
3. **Include fallbacks** for reliability
4. **Add verification** steps
5. **Use descriptive names** for screenshots
6. **Keep patterns simple** and focused
7. **Test patterns** in isolation first
