# Maestro E2E Testing Setup Guide

## Overview

Maestro is a simple and effective mobile UI testing framework that allows you to write E2E tests in YAML format. This guide covers installation, configuration, and running tests for the SolidiMobileApp4 project.

## Table of Contents

- [Installation](#installation)
- [iOS Setup](#ios-setup)
- [Android Setup](#android-setup)
- [Running Tests](#running-tests)
- [Physical Device Testing](#physical-device-testing)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Installation

### Prerequisites

- macOS (for iOS testing)
- Node.js >= 18
- Xcode (for iOS)
- Android Studio (for Android)
- Java JDK 11 or higher

### Install Maestro

```bash
# Install Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
export PATH="$PATH:$HOME/.maestro/bin"

# Verify installation
maestro --version
```

## iOS Setup

### 1. Install iOS Simulator

Ensure you have Xcode installed with iOS simulators:

```bash
# List available simulators
xcrun simctl list devices

# Boot a simulator (example: iPhone 15 Pro)
xcrun simctl boot "iPhone 15 Pro"
```

### 2. Build the iOS App

```bash
# Build for simulator
npx react-native run-ios --simulator="iPhone 15 Pro"

# Or use the npm script
npm run ios
```

### 3. Run Maestro Tests on iOS

```bash
# Run a specific flow
maestro test .maestro/accurate_login_flow.yaml

# Run all flows in the directory
maestro test .maestro/

# Run with specific app ID
maestro test --app-id com.solidimobileapp4test .maestro/accurate_login_flow.yaml
```

## Android Setup

### 1. Set Up Android Emulator

```bash
# List available AVDs
emulator -list-avds

# Start an emulator
emulator -avd Pixel_5_API_31 &

# Or use Android Studio AVD Manager
```

### 2. Build the Android App

```bash
# Build and install on emulator/device
npx react-native run-android

# Or use the npm script
npm run android
```

### 3. Run Maestro Tests on Android

```bash
# Run a specific flow
maestro test .maestro/accurate_login_flow.yaml

# Run all flows
maestro test .maestro/

# Run with specific app ID
maestro test --app-id com.solidimobileapp4test .maestro/accurate_login_flow.yaml
```

## Physical Device Testing

### iOS Physical Device

> [!WARNING]
> iOS physical device testing with Maestro requires additional setup and may have limitations.

1. **Connect your iPhone via USB**
2. **Trust the computer** on your device
3. **Build for device** (requires proper code signing)
4. **Run Maestro tests**:

```bash
maestro test --device <device-id> .maestro/accurate_login_flow.yaml
```

### Android Physical Device

See [ANDROID_DEVICE_SETUP.md](file:///Users/henry/Solidi/SolidiMobileApp4/ANDROID_DEVICE_SETUP.md) for detailed instructions.

**Quick steps:**

1. **Enable Developer Options** on your Android phone
2. **Enable USB Debugging**
3. **Connect via USB**
4. **Verify connection**:

```bash
adb devices
```

5. **Build and install the app**:

```bash
npm run android
```

6. **Run Maestro tests**:

```bash
maestro test .maestro/accurate_login_flow.yaml
```

Maestro will automatically detect your connected Android device.

## Running Tests

### Run Specific Test Flow

```bash
# Run login flow
maestro test .maestro/accurate_login_flow.yaml

# Run with screenshots
maestro test .maestro/accurate_login_flow.yaml --format junit --output report.xml
```

### Run All Tests

```bash
# Run all flows in .maestro directory
maestro test .maestro/

# Run with continuous mode (watches for changes)
maestro test --continuous .maestro/
```

### Run Tests with npm Scripts

```bash
# Run all Maestro tests
npm run maestro:test

# Run iOS-specific tests
npm run maestro:test:ios

# Run Android-specific tests
npm run maestro:test:android

# Run specific flow
npm run maestro:test:flow -- accurate_login_flow.yaml
```

### View Test Results

Maestro automatically captures:
- **Screenshots** - Saved in the current directory or specified output folder
- **Logs** - Console output with detailed step information
- **Videos** - Optional screen recordings

```bash
# Run with video recording
maestro record .maestro/accurate_login_flow.yaml

# Specify output directory for artifacts
maestro test --output ./test-results .maestro/
```

## Troubleshooting

### Common Issues

#### 1. App Not Found

**Error**: `App with id com.solidimobileapp4test not found`

**Solution**:
- Ensure the app is installed on the simulator/emulator
- Verify the app ID matches in your flow YAML
- Rebuild and reinstall the app

```bash
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

#### 2. Element Not Found

**Error**: `Element with text "Sign In" not found`

**Solution**:
- Take a screenshot to see current UI state
- Check if element text matches exactly (case-sensitive)
- Add `extendedWaitUntil` with longer timeout
- Use regex patterns for flexible matching

```yaml
# Example with extended wait
- extendedWaitUntil:
    visible: "Sign In"
    timeout: 10000
```

#### 3. Simulator/Emulator Not Running

**Error**: `No devices found`

**Solution**:

```bash
# iOS - Boot simulator
xcrun simctl boot "iPhone 15 Pro"
open -a Simulator

# Android - Start emulator
emulator -avd Pixel_5_API_31 &
```

#### 4. Maestro Command Not Found

**Error**: `maestro: command not found`

**Solution**:
- Ensure Maestro is installed
- Add to PATH in `~/.zshrc`:

```bash
export PATH="$PATH:$HOME/.maestro/bin"
source ~/.zshrc
```

#### 5. Tests Flaky or Timing Out

**Solution**:
- Increase timeouts in your flows
- Add explicit waits before interactions
- Use `extendedWaitUntil` instead of `waitUntil`
- Add `hideKeyboard` after text input

```yaml
# Better approach
- tapOn:
    text: "Email Address"
- inputText: "user@example.com"
- hideKeyboard
- extendedWaitUntil:
    visible: "Password"
    timeout: 5000
```

### Debug Mode

Run Maestro in debug mode for more verbose output:

```bash
# Enable debug logging
maestro test --debug .maestro/accurate_login_flow.yaml

# Use Maestro Studio for interactive debugging
maestro studio
```

### Maestro Studio

Maestro Studio is an interactive tool for building and debugging flows:

```bash
# Launch Maestro Studio
maestro studio

# Then interact with your app and Maestro will generate YAML
```

## Best Practices

### 1. Use Descriptive Flow Names

```yaml
# Good
.maestro/accurate_login_flow.yaml
.maestro/bitcoin_trade_complete.yaml

# Avoid
.maestro/test1.yaml
.maestro/flow.yaml
```

### 2. Add Screenshots at Key Points

```yaml
- takeScreenshot: 01_login_screen
- tapOn:
    text: "Sign In"
- takeScreenshot: 02_after_signin
```

### 3. Use Extended Waits for Async Operations

```yaml
# Wait for API response or navigation
- extendedWaitUntil:
    visible: "Wallet|Transfer|History"
    timeout: 15000
```

### 4. Hide Keyboard After Input

```yaml
- tapOn:
    text: "Email Address"
- inputText: "user@example.com"
- hideKeyboard  # Important!
```

### 5. Use Regex for Flexible Matching

```yaml
# Match any of these elements
- extendedWaitUntil:
    visible: "Wallet|Transfer|History"
    timeout: 10000
```

### 6. Clear State Between Tests

```yaml
appId: com.solidimobileapp4test
---
- launchApp
- clearState  # Clear app data for fresh start
```

### 7. Organize Tests by Feature

```
.maestro/
├── auth/
│   ├── login_flow.yaml
│   ├── logout_flow.yaml
│   └── register_flow.yaml
├── transactions/
│   ├── bitcoin_trade_flow.yaml
│   └── gbp_withdraw_flow.yaml
└── settings/
    └── biometric_settings.yaml
```

### 8. Use Environment Variables

```yaml
# Define in flow
env:
  TEST_EMAIL: henry930@gmail.com
  TEST_PASSWORD: ${TEST_PASSWORD}  # From environment

---
- inputText: ${TEST_EMAIL}
```

### 9. Create Reusable Sub-flows

```yaml
# login_subflow.yaml
appId: com.solidimobileapp4test
---
- tapOn:
    text: "Email Address"
- inputText: ${EMAIL}
- hideKeyboard
- tapOn:
    text: "Password"
- inputText: ${PASSWORD}
- hideKeyboard
- tapOn:
    text: "Sign In"

# main_flow.yaml
---
- runFlow:
    file: login_subflow.yaml
    env:
      EMAIL: test@example.com
      PASSWORD: password123
```

### 10. Add Assertions

```yaml
# Verify expected elements are visible
- assertVisible: "Wallet"
- assertNotVisible: "Error"

# Verify text content
- assertVisible:
    text: "Login Successful"
```

## Next Steps

- See [MAESTRO_QUICK_REFERENCE.md](file:///Users/henry/Solidi/SolidiMobileApp4/MAESTRO_QUICK_REFERENCE.md) for command reference
- See [MAESTRO_CI_CD.md](file:///Users/henry/Solidi/SolidiMobileApp4/MAESTRO_CI_CD.md) for CI/CD integration
- See [.maestro/README.md](file:///Users/henry/Solidi/SolidiMobileApp4/.maestro/README.md) for test suite documentation

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro GitHub](https://github.com/mobile-dev-inc/maestro)
- [Maestro Discord Community](https://discord.gg/maestro)
