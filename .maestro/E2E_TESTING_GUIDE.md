# E2E Testing Guide for Recent Bug Fixes

## Overview
This guide explains how to run E2E tests using Maestro to verify the recent bug fixes in the Solidi Mobile App.

## Recent Fixes Being Tested

Based on recent commits, we're testing:

1. **Address Book Issues** (commit a76b218)
   - Verify address selection in withdraw flow
   - Test saved addresses display correctly

2. **Anonymous User Biometric Disable** (commit a7dfdf7)
   - Test biometric authentication flow
   - Verify anonymous users can disable biometrics

3. **Bank Details Issues** (commit a483d1c)
   - Test fiat currency withdrawals (GBP, USD, EUR)
   - Verify bank details fields display correctly

4. **Dynamic Asset Fetching** (commit 741f7a0)
   - Verify assets load from balance API
   - Test asset display in Assets and Transfer views

## Test Files Created

### 1. Quick Smoke Test (`quick_smoke_test.yaml`)
**Purpose**: Fast verification that core app functionality works  
**Duration**: ~30 seconds  
**Tests**:
- App launches successfully
- All navigation tabs are accessible
- Withdraw dialog opens

**Run**: `maestro test .maestro/quick_smoke_test.yaml`

### 2. Comprehensive Fixes Test (`comprehensive_fixes_test.yaml`)
**Purpose**: Thorough testing of all recent bug fixes  
**Duration**: ~2-3 minutes  
**Tests**:
- Biometric authentication flow
- Dynamic asset fetching from API
- Wallet withdraw with address selection
- Bank details for fiat withdrawal
- Navigation across all tabs

**Run**: `maestro test .maestro/comprehensive_fixes_test.yaml`

### 3. Wallet Withdraw Robust (`wallet_withdraw_robust.yaml`)
**Purpose**: Focused test on wallet withdraw functionality  
**Duration**: ~1 minute  
**Tests**:
- Navigate to wallet
- Open withdraw dialog
- Select BTC
- Select saved address
- Enter amount
- Verify success

**Run**: `maestro test .maestro/wallet_withdraw_robust.yaml`

## Prerequisites

### 1. Install Maestro
```bash
# Install via Homebrew
brew tap mobile-dev-inc/tap
brew install maestro
```

### 2. Prepare Device/Simulator

**For iOS Simulator**:
```bash
# List available simulators
xcrun simctl list devices

# Boot a simulator (e.g., iPhone 14)
xcrun simctl boot "iPhone 14"

# Or use Xcode to start simulator
open -a Simulator
```

**For Android Emulator**:
```bash
# List available emulators
emulator -list-avds

# Start an emulator
emulator -avd <emulator_name> &

# Verify device is connected
adb devices
```

**For Physical Device**:
- iOS: Connect via USB and trust the computer
- Android: Enable USB debugging and connect via USB

### 3. Build and Install App

**For iOS**:
```bash
cd ios
pod install
cd ..
npx react-native run-ios --configuration Debug
```

**For Android**:
```bash
npx react-native run-android --variant=debug
```

## Running Tests

### Option 1: Run Individual Tests

```bash
# Quick smoke test (fastest)
maestro test .maestro/quick_smoke_test.yaml

# Comprehensive test (recommended)
maestro test .maestro/comprehensive_fixes_test.yaml

# Wallet-specific test
maestro test .maestro/wallet_withdraw_robust.yaml

# Biometric test
maestro test .maestro/login_with_biometric_handling.yaml
```

### Option 2: Run All Tests with Script

```bash
# Make script executable (already done)
chmod +x run-e2e-tests.sh

# Run all tests
./run-e2e-tests.sh
```

This will:
- Check for connected devices
- Run all 4 test suites
- Save screenshots to timestamped directories
- Provide a summary of results

### Option 3: Run with Custom Output Directory

```bash
maestro test .maestro/comprehensive_fixes_test.yaml \
  --test-output-dir=./test-results/comprehensive
```

## Interpreting Results

### Success Indicators
- ✅ All tests complete without errors
- 📸 Screenshots show expected UI states
- No crash logs or error messages

### Common Issues

**Test fails at login**:
- Ensure app is installed: `adb shell pm list packages | grep solidi`
- Check app ID matches: `co.solidi.mobile.test`

**Biometric prompt doesn't appear**:
- Simulator: Use `Features > Face ID > Enrolled` in iOS Simulator
- Android: Use `adb emu finger touch 1`

**Elements not found**:
- Use Maestro Studio to inspect: `maestro studio`
- Update coordinates or selectors in YAML files

**Timeout errors**:
- Increase timeout values in YAML files
- Check network connectivity for API calls

## Viewing Screenshots

After running tests, screenshots are saved in:
```
maestro-test-results-<timestamp>/
├── smoke-test/
│   ├── 01_launched.png
│   ├── 02_login_state.png
│   └── ...
├── comprehensive-test/
│   ├── 01_app_launched.png
│   ├── 04_assets_page.png
│   └── ...
└── wallet-test/
    └── ...
```

Open these to visually verify each step of the test.

## Interactive Testing with Maestro Studio

For debugging or exploring the app:

```bash
maestro studio
```

This opens an interactive session where you can:
- View the element hierarchy
- Test selectors in real-time
- Record new flows
- Debug existing tests

## Test Maintenance

### Updating Tests

If UI changes, update the test files:

1. Use Maestro Studio to find new element selectors
2. Update coordinates if buttons moved
3. Adjust timeouts if API calls are slower
4. Add new test cases for new features

### Adding New Tests

Create new test files in `.maestro/`:

```yaml
appId: co.solidi.mobile.test
---
# Your test name

- launchApp
- extendedWaitUntil:
    visible: ".*"
    timeout: 45000

# Your test steps...
```

## CI/CD Integration

To run tests in CI/CD:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    maestro test .maestro/comprehensive_fixes_test.yaml \
      --test-output-dir=./test-results
    
- name: Upload Screenshots
  uses: actions/upload-artifact@v3
  with:
    name: test-screenshots
    path: ./test-results
```

## Troubleshooting

### Maestro not found
```bash
brew install maestro
```

### Device not detected
```bash
# iOS
xcrun simctl list devices | grep Booted

# Android
adb devices
```

### App not launching
```bash
# Check app is installed
adb shell pm list packages | grep solidi

# Reinstall if needed
npx react-native run-android
```

### Tests are flaky
- Increase timeout values
- Add more `extendedWaitUntil` steps
- Use coordinates instead of text selectors
- Check network stability

## Next Steps

1. **Run the quick smoke test** to verify basic functionality
2. **Run comprehensive test** to verify all fixes
3. **Review screenshots** to confirm UI states
4. **Report any failures** with screenshots and logs
5. **Update tests** as needed for your specific environment

## Support

For issues or questions:
- Check Maestro docs: https://maestro.mobile.dev
- Review test screenshots for visual debugging
- Use Maestro Studio for interactive debugging
