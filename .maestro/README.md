# Maestro Test Suite

This directory contains E2E tests for SolidiMobileApp4 using Maestro.

## Overview

Maestro is a simple, effective mobile UI testing framework. Tests are written in YAML and can run on both iOS and Android without code changes.

## Test Structure

```
.maestro/
├── README.md (this file)
├── accurate_login_flow.yaml        # ✅ Primary login test
├── bitcoin_trade_complete.yaml     # ✅ Complete Bitcoin trade flow
├── bitcoin_trade_flow.yaml         # ✅ Bitcoin trade flow (variant)
├── check_biometric_setting.yaml    # ✅ Biometric settings check
├── complete_login_flow.yaml        # 🔄 Login with biometric handling
├── final_login_flow.yaml           # 🔄 Alternative login flow
├── login_flow.yaml                 # 🔄 Basic login flow
├── login_flow_v2.yaml              # 🔄 Login flow v2
├── logout_flow.yaml                # ✅ Logout test
├── register_flow.yaml              # ✅ User registration
├── screenshot_test.yaml            # 🔧 Debug/screenshot utility
├── simple_login_flow.yaml          # 🔄 Simple login variant
├── verify_biometric_default.yaml   # ✅ Biometric default verification
├── android_flow.yaml               # 🔧 Android-specific test
└── flow.yaml                       # 🔧 Basic flow template
```

**Legend:**
- ✅ **Active** - Primary test flows in use
- 🔄 **Variant** - Alternative implementations (consider consolidating)
- 🔧 **Utility** - Debug/helper flows

## Running Tests

### Run All Tests

```bash
# Run all flows
maestro test .maestro/

# Run with npm script
npm run maestro:test
```

### Run Specific Test

```bash
# Run login test
maestro test .maestro/accurate_login_flow.yaml

# Run Bitcoin trade test
maestro test .maestro/bitcoin_trade_complete.yaml

# Run with npm script
npm run maestro:test:flow -- accurate_login_flow.yaml
```

### Run by Category

```bash
# Authentication tests
maestro test .maestro/accurate_login_flow.yaml
maestro test .maestro/logout_flow.yaml
maestro test .maestro/register_flow.yaml

# Transaction tests
maestro test .maestro/bitcoin_trade_complete.yaml

# Settings tests
maestro test .maestro/check_biometric_setting.yaml
maestro test .maestro/verify_biometric_default.yaml
```

### Platform-Specific

```bash
# iOS
npm run maestro:test:ios

# Android
npm run maestro:test:android
```

## Test Naming Conventions

Follow these conventions when creating new tests:

### File Naming

- Use `snake_case` for file names
- Include the feature/flow name
- Add `_flow` suffix for complete flows
- Examples:
  - `login_flow.yaml`
  - `bitcoin_trade_flow.yaml`
  - `user_profile_settings_flow.yaml`

### Screenshot Naming

Use numbered prefixes to maintain order:

```yaml
- takeScreenshot: 01_login_screen
- takeScreenshot: 02_email_entered
- takeScreenshot: 03_password_entered
- takeScreenshot: 04_logged_in
```

## Writing New Tests

### Basic Template

```yaml
appId: com.solidimobileapp4test
---
# Test description
- launchApp
- clearState

# Your test steps here
- extendedWaitUntil:
    visible: "Expected Element"
    timeout: 10000

- takeScreenshot: 01_initial_state

# Add assertions
- assertVisible: "Success Message"
```

### Best Practices

1. **Always use `extendedWaitUntil`** instead of `waitUntil` for better reliability
2. **Hide keyboard** after text input with `hideKeyboard`
3. **Take screenshots** at key points for debugging
4. **Use `clearState`** at the start for fresh test runs
5. **Add timeouts** appropriate for network operations (10-15 seconds)
6. **Use regex** for flexible text matching: `"Wallet|Transfer|History"`

### Example: New Feature Test

```yaml
appId: com.solidimobileapp4test
---
# Test: User can view transaction history

# Setup
- launchApp
- clearState

# Login first (or use runFlow to reuse login)
- runFlow: accurate_login_flow.yaml

# Navigate to history
- extendedWaitUntil:
    visible: "History"
    timeout: 10000
- tapOn: "History"
- takeScreenshot: 01_history_screen

# Verify history loads
- extendedWaitUntil:
    visible: "Transaction|No transactions"
    timeout: 15000
- takeScreenshot: 02_history_loaded

# Assertions
- assertVisible: "History"
```

## Test Organization Recommendations

### Current State

You have **multiple login flow variants**. Consider consolidating:

**Keep:**
- `accurate_login_flow.yaml` - Primary login test
- `complete_login_flow.yaml` - Login with biometric handling

**Archive/Remove:**
- `login_flow.yaml`
- `login_flow_v2.yaml`
- `simple_login_flow.yaml`
- `final_login_flow.yaml`

### Suggested Structure

```
.maestro/
├── auth/
│   ├── login_flow.yaml
│   ├── login_with_biometric.yaml
│   ├── logout_flow.yaml
│   └── register_flow.yaml
├── transactions/
│   ├── bitcoin_trade_flow.yaml
│   ├── gbp_withdraw_flow.yaml
│   └── transaction_history_flow.yaml
├── settings/
│   ├── biometric_settings.yaml
│   └── profile_settings.yaml
└── utils/
    ├── screenshot_test.yaml
    └── flow_template.yaml
```

## Reusing Flows

### Create Sub-flows

Extract common operations into reusable flows:

**login_subflow.yaml:**
```yaml
appId: com.solidimobileapp4test
env:
  EMAIL: ${EMAIL}
  PASSWORD: ${PASSWORD}
---
- extendedWaitUntil:
    visible: "Email Address"
    timeout: 10000
- tapOn: "Email Address"
- inputText: ${EMAIL}
- hideKeyboard
- tapOn: "Password"
- inputText: ${PASSWORD}
- hideKeyboard
- tapOn: "Sign In"
- extendedWaitUntil:
    visible: "Wallet|Transfer|History"
    timeout: 15000
```

**Use in other flows:**
```yaml
appId: com.solidimobileapp4test
---
- launchApp
- clearState

# Reuse login flow
- runFlow:
    file: login_subflow.yaml
    env:
      EMAIL: henry930@gmail.com
      PASSWORD: DazzPow/930

# Continue with your test
- tapOn: "Settings"
```

## Environment Variables

### Define Test Credentials

Create `.maestro/env.yaml`:

```yaml
TEST_EMAIL: henry930@gmail.com
TEST_PASSWORD: DazzPow/930
```

> [!WARNING]
> **Never commit real credentials!** Use environment variables or CI secrets for sensitive data.

### Use in Flows

```yaml
appId: com.solidimobileapp4test
env:
  EMAIL: ${TEST_EMAIL}
  PASSWORD: ${TEST_PASSWORD}
---
- inputText: ${EMAIL}
- inputText: ${PASSWORD}
```

## Debugging Tests

### Take Screenshots

```yaml
- takeScreenshot: debug_current_state
```

### Use Maestro Studio

```bash
maestro studio
```

Interactive tool to build and debug flows visually.

### Verbose Output

```bash
maestro test --debug .maestro/accurate_login_flow.yaml
```

### Check Current UI

```yaml
# Add to your flow to see what's on screen
- takeScreenshot: current_ui_state
- assertVisible: ".*"  # This will show all visible elements in logs
```

## CI/CD Integration

See [MAESTRO_CI_CD.md](file:///Users/henry/Solidi/SolidiMobileApp4/MAESTRO_CI_CD.md) for GitHub Actions and other CI platform integration.

## Common Issues

### Element Not Found

**Problem:** `Element with text "Sign In" not found`

**Solutions:**
1. Take a screenshot to see current state
2. Check for typos (case-sensitive!)
3. Increase timeout
4. Use regex for flexibility: `"Sign In|Login"`

### Keyboard Blocking Elements

**Problem:** Can't tap on elements below keyboard

**Solution:**
```yaml
- inputText: "text"
- hideKeyboard  # Always hide keyboard!
```

### Flaky Tests

**Problem:** Tests pass sometimes, fail other times

**Solutions:**
1. Use `extendedWaitUntil` with longer timeouts
2. Add waits before assertions
3. Use `waitForAnimationToEnd`
4. Handle optional elements with `tryTo`

## Resources

- [MAESTRO_SETUP.md](file:///Users/henry/Solidi/SolidiMobileApp4/MAESTRO_SETUP.md) - Setup guide
- [MAESTRO_QUICK_REFERENCE.md](file:///Users/henry/Solidi/SolidiMobileApp4/MAESTRO_QUICK_REFERENCE.md) - Command reference
- [MAESTRO_CI_CD.md](file:///Users/henry/Solidi/SolidiMobileApp4/MAESTRO_CI_CD.md) - CI/CD integration
- [Maestro Documentation](https://maestro.mobile.dev/)

## Contributing

When adding new tests:

1. Follow naming conventions
2. Add screenshots at key points
3. Use appropriate timeouts
4. Document the test purpose in comments
5. Update this README with new test descriptions
