# Maestro Best Practices for Solidi Mobile App

This directory contains practical guides and best practices for writing Maestro E2E tests for the Solidi Mobile App, based on real-world testing experience.

## Available Guides

1. **[Navigation Guide](./navigation-guide.md)** - How to navigate between screens reliably
2. **[Element Selection Guide](./element-selection-guide.md)** - Best practices for finding and interacting with UI elements
3. **[Keyboard Handling Guide](./keyboard-handling-guide.md)** - Strategies for dismissing keyboards
4. **[Common Patterns](./common-patterns.md)** - Reusable patterns and code snippets
5. **[Troubleshooting Guide](./troubleshooting-guide.md)** - Solutions to common issues

## Quick Tips

- **Always use `testID` when possible** - More reliable than text or coordinates
- **Use regex for flexible text matching** - `.*Withdraw.*` instead of `Withdraw`
- **Add fallback strategies** - Combine text selectors with coordinate fallbacks
- **Capture screenshots** - Essential for debugging failed tests
- **Avoid blind coordinate taps** - Only use as last resort with proper documentation

## App-Specific Information

- **App ID**: `co.solidi.mobile.test`
- **Test Device**: iPhone 15 Pro - iOS 17.2
- **Bottom Navigation**: 5 tabs (Home, Assets, Wallet, Transfer, History)
