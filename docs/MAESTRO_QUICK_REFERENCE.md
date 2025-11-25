# Maestro Quick Reference

A quick reference guide for common Maestro commands and YAML syntax.

## Table of Contents

- [Common Commands](#common-commands)
- [YAML Syntax](#yaml-syntax)
- [Selectors](#selectors)
- [Actions](#actions)
- [Assertions](#assertions)
- [Flow Control](#flow-control)
- [Environment Variables](#environment-variables)
- [Tips & Tricks](#tips--tricks)

## Common Commands

### Running Tests

```bash
# Run a single flow
maestro test .maestro/login_flow.yaml

# Run all flows in directory
maestro test .maestro/

# Run with specific device
maestro test --device <device-id> .maestro/login_flow.yaml

# Run with app ID override
maestro test --app-id com.myapp .maestro/login_flow.yaml

# Run with output directory
maestro test --output ./test-results .maestro/

# Run in continuous mode (watch for changes)
maestro test --continuous .maestro/
```

### Recording

```bash
# Record test execution as video
maestro record .maestro/login_flow.yaml

# Record with output file
maestro record --output recording.mp4 .maestro/login_flow.yaml
```

### Interactive Tools

```bash
# Launch Maestro Studio (interactive flow builder)
maestro studio

# Debug mode (verbose logging)
maestro test --debug .maestro/login_flow.yaml
```

### Device Management

```bash
# List connected devices
maestro test --list-devices

# iOS Simulator
xcrun simctl list devices
xcrun simctl boot "iPhone 15 Pro"

# Android Emulator
adb devices
emulator -list-avds
emulator -avd Pixel_5_API_31 &
```

## YAML Syntax

### Basic Flow Structure

```yaml
appId: com.solidimobileapp4test
---
# Your test steps here
- launchApp
- tapOn: "Sign In"
- assertVisible: "Welcome"
```

### Flow with Environment Variables

```yaml
appId: com.solidimobileapp4test
env:
  TEST_EMAIL: user@example.com
  TEST_PASSWORD: password123
---
- launchApp
- inputText: ${TEST_EMAIL}
```

### Flow with Tags

```yaml
appId: com.solidimobileapp4test
tags:
  - auth
  - smoke
---
- launchApp
```

## Selectors

### Text Selector

```yaml
# Exact text match
- tapOn: "Sign In"

# Regex pattern
- tapOn: "Sign In|Login"

# Case-insensitive
- tapOn:
    text: "sign in"
    caseSensitive: false
```

### ID Selector

```yaml
# By accessibility ID (testID in React Native)
- tapOn:
    id: "login-button"
```

### Index Selector

```yaml
# Tap the second button
- tapOn:
    text: "Submit"
    index: 1
```

### Point Selector

```yaml
# Tap at specific coordinates
- tapOn:
    point: "50%,50%"  # Center of screen
```

### Combined Selectors

```yaml
# Multiple conditions
- tapOn:
    text: "Submit"
    enabled: true
    index: 0
```

## Actions

### Navigation

```yaml
# Launch app
- launchApp

# Launch with clear state
- launchApp:
    clearState: true

# Clear app data
- clearState

# Stop app
- stopApp

# Go back
- back

# Scroll
- scroll

# Scroll down
- scrollUntilVisible:
    element:
      text: "Bottom Element"
```

### Input

```yaml
# Tap on element
- tapOn: "Button Text"

# Long press
- longPressOn: "Element"

# Input text
- inputText: "Hello World"

# Input with selector
- tapOn: "Email"
- inputText: "user@example.com"

# Hide keyboard
- hideKeyboard

# Erase text
- eraseText

# Paste text
- pasteText: "Pasted content"
```

### Gestures

```yaml
# Swipe
- swipe:
    direction: UP
    
# Swipe with start point
- swipe:
    start: "50%,80%"
    end: "50%,20%"

# Pinch to zoom
- pinch

# Rotate
- rotate:
    degrees: 90
```

### Screenshots

```yaml
# Take screenshot
- takeScreenshot: screenshot_name

# Take screenshot with path
- takeScreenshot: screenshots/login_screen
```

### Waiting

```yaml
# Wait for element to be visible
- waitUntil:
    visible: "Element Text"

# Extended wait with timeout
- extendedWaitUntil:
    visible: "Element Text"
    timeout: 10000  # milliseconds

# Wait for element to disappear
- waitUntil:
    notVisible: "Loading..."

# Wait for specific time
- waitForAnimationToEnd
```

## Assertions

### Visibility Assertions

```yaml
# Assert element is visible
- assertVisible: "Welcome"

# Assert element is not visible
- assertNotVisible: "Error"

# Assert with selector
- assertVisible:
    text: "Success"
    
# Assert with regex
- assertVisible: "Success|Complete"
```

### Multiple Assertions

```yaml
# Assert any of these is visible
- assertVisible: "Wallet|Transfer|History"

# Assert all are visible
- assertVisible: "Wallet"
- assertVisible: "Transfer"
- assertVisible: "History"
```

## Flow Control

### Conditional Execution

```yaml
# Run if condition is true
- runFlow:
    when:
      visible: "Login Button"
    file: login_flow.yaml
```

### Sub-flows

```yaml
# Run another flow
- runFlow: login_flow.yaml

# Run with environment variables
- runFlow:
    file: login_flow.yaml
    env:
      EMAIL: test@example.com
      PASSWORD: password123
```

### Repeat Actions

```yaml
# Repeat action
- repeat:
    times: 3
    commands:
      - tapOn: "Next"
      - waitForAnimationToEnd
```

### Try-Catch

```yaml
# Try action, continue if it fails
- tryTo:
    - tapOn: "Optional Button"
```

## Environment Variables

### Define in Flow

```yaml
env:
  TEST_EMAIL: user@example.com
  TEST_PASSWORD: password123
---
- inputText: ${TEST_EMAIL}
```

### Pass from Command Line

```bash
# Set environment variable
export TEST_PASSWORD="secret123"

# Or inline
TEST_PASSWORD="secret123" maestro test .maestro/login_flow.yaml
```

### Use in Flow

```yaml
- inputText: ${TEST_EMAIL}
- inputText: ${TEST_PASSWORD}
```

## Tips & Tricks

### 1. Debug with Screenshots

```yaml
- takeScreenshot: 01_before_action
- tapOn: "Button"
- takeScreenshot: 02_after_action
```

### 2. Handle Async Operations

```yaml
# Wait for network request to complete
- extendedWaitUntil:
    visible: "Success Message"
    timeout: 15000
```

### 3. Handle Keyboard

```yaml
- tapOn: "Email"
- inputText: "user@example.com"
- hideKeyboard  # Always hide keyboard after input!
```

### 4. Use Regex for Flexibility

```yaml
# Match multiple possible texts
- assertVisible: "Login|Sign In|Enter"

# Match partial text
- assertVisible: ".*Success.*"
```

### 5. Clear State for Fresh Tests

```yaml
appId: com.solidimobileapp4test
---
- launchApp
- clearState  # Start with clean slate
```

### 6. Handle Permissions

```yaml
# Grant permissions before testing
- launchApp:
    permissions:
      all: true
```

### 7. Test Multiple Scenarios

```yaml
# Scenario 1: Valid login
- runFlow:
    file: login_subflow.yaml
    env:
      EMAIL: valid@example.com
      PASSWORD: validpass

# Scenario 2: Invalid login
- runFlow:
    file: login_subflow.yaml
    env:
      EMAIL: invalid@example.com
      PASSWORD: wrongpass
- assertVisible: "Invalid credentials"
```

### 8. Organize with Comments

```yaml
---
# Setup
- launchApp
- clearState

# Navigate to login
- tapOn: "Sign In"

# Enter credentials
- tapOn: "Email"
- inputText: "user@example.com"
- hideKeyboard

# Submit and verify
- tapOn: "Submit"
- assertVisible: "Welcome"
```

### 9. Handle Flaky Tests

```yaml
# Use extended waits
- extendedWaitUntil:
    visible: "Element"
    timeout: 10000

# Use tryTo for optional elements
- tryTo:
    - tapOn: "Skip Tutorial"
```

### 10. Platform-Specific Flows

```yaml
# iOS-specific flow
appId: com.solidimobileapp4test
---
- runFlow:
    when:
      platform: iOS
    commands:
      - tapOn: "iOS Specific Button"

# Android-specific flow
- runFlow:
    when:
      platform: Android
    commands:
      - tapOn: "Android Specific Button"
```

## Common Patterns

### Login Pattern

```yaml
- launchApp
- extendedWaitUntil:
    visible: "Email Address"
    timeout: 10000
- tapOn: "Email Address"
- inputText: "user@example.com"
- hideKeyboard
- tapOn: "Password"
- inputText: "password123"
- hideKeyboard
- tapOn: "Sign In"
- extendedWaitUntil:
    visible: "Welcome"
    timeout: 15000
```

### Form Fill Pattern

```yaml
- tapOn: "First Name"
- inputText: "John"
- hideKeyboard
- tapOn: "Last Name"
- inputText: "Doe"
- hideKeyboard
- tapOn: "Email"
- inputText: "john@example.com"
- hideKeyboard
- tapOn: "Submit"
```

### Navigation Pattern

```yaml
- tapOn: "Menu"
- waitForAnimationToEnd
- tapOn: "Settings"
- assertVisible: "Settings"
- back
- assertVisible: "Home"
```

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/api-reference/commands)
- [Maestro Examples](https://github.com/mobile-dev-inc/maestro/tree/main/maestro-test)
- [MAESTRO_SETUP.md](file:///Users/henry/Solidi/SolidiMobileApp4/MAESTRO_SETUP.md) - Full setup guide
