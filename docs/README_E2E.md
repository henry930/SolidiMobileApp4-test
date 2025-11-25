# E2E Testing with Maestro

This project uses **Maestro** as the primary E2E testing framework for mobile app testing.

## Why Maestro?

Maestro provides:
- ✅ **Simple YAML syntax** - Easy to read and write tests
- ✅ **Cross-platform** - Same tests work on iOS and Android
- ✅ **No code changes needed** - Works without adding testIDs
- ✅ **Fast setup** - No complex build configurations
- ✅ **Physical device support** - Easy testing on real devices
- ✅ **Built-in screenshots** - Automatic visual debugging

## Quick Start

### 1. Install Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
```

### 2. Start Your App

```bash
# iOS
npm run ios

# Android
npm run android
```

### 3. Run Tests

```bash
# Run all tests
npm run maestro:test

# Run iOS tests
npm run maestro:test:ios

# Run Android tests
npm run maestro:test:android

# Run specific flow
npm run maestro:test:flow -- accurate_login_flow.yaml
```

## Test Structure

Tests are located in `.maestro/` directory:

```
.maestro/
├── README.md                       # Test suite documentation
├── accurate_login_flow.yaml        # Primary login test
├── bitcoin_trade_complete.yaml     # Bitcoin trading flow
├── logout_flow.yaml                # Logout test
├── register_flow.yaml              # User registration
└── ... (more test flows)
```

## Documentation

- **[MAESTRO_SETUP.md](MAESTRO_SETUP.md)** - Complete setup and installation guide
- **[MAESTRO_QUICK_REFERENCE.md](MAESTRO_QUICK_REFERENCE.md)** - Command reference and syntax
- **[MAESTRO_CI_CD.md](MAESTRO_CI_CD.md)** - CI/CD integration guide
- **[.maestro/README.md](.maestro/README.md)** - Test suite documentation

## Running Tests

### Using npm Scripts

```bash
# Run all tests (auto-detect platform)
npm run maestro:test

# Run on specific platform
npm run maestro:test:ios
npm run maestro:test:android

# Run specific flow
npm run maestro:test:flow -- login_flow.yaml
```

### Using Maestro CLI Directly

```bash
# Run all flows
maestro test .maestro/

# Run specific flow
maestro test .maestro/accurate_login_flow.yaml

# Run with output directory
maestro test --output ./test-results .maestro/

# Interactive debugging
maestro studio
```

## Writing Tests

Create a new test in `.maestro/` directory:

```yaml
appId: com.solidimobileapp4test
---
# Test description
- launchApp
- clearState

# Your test steps
- extendedWaitUntil:
    visible: "Sign In"
    timeout: 10000
- tapOn: "Sign In"
- takeScreenshot: 01_signin_screen

# Assertions
- assertVisible: "Welcome"
```

See [.maestro/README.md](.maestro/README.md) for detailed test writing guide.

## CI/CD Integration

GitHub Actions workflow is configured in `.github/workflows/maestro-e2e.yml` to run tests automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Manual workflow dispatch

See [MAESTRO_CI_CD.md](MAESTRO_CI_CD.md) for details.

## Troubleshooting

### App Not Found

Ensure the app is installed:
```bash
# iOS
npm run ios

# Android
npm run android
```

### Element Not Found

Take a screenshot to debug:
```yaml
- takeScreenshot: debug_screen
```

### Tests Timing Out

Increase timeouts in your flows:
```yaml
- extendedWaitUntil:
    visible: "Element"
    timeout: 15000  # 15 seconds
```

See [MAESTRO_SETUP.md](MAESTRO_SETUP.md#troubleshooting) for more troubleshooting tips.

## Migrating from Detox

> [!NOTE]
> **Previous Detox Setup**
> 
> This project previously used Detox for E2E testing. The Detox configuration and tests have been archived to `backup/detox/` for reference. Maestro is now the primary E2E testing framework.
> 
> If you need to reference the old Detox setup, see:
> - `backup/detox/.detoxrc.js`
> - `backup/detox/e2e/`
> - `backup/detox/DETOX_SETUP.md`

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro GitHub](https://github.com/mobile-dev-inc/maestro)
- [Maestro Discord Community](https://discord.gg/maestro)
