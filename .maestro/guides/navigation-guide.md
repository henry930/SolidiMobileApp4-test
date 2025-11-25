# Navigation Guide

## Bottom Navigation Bar

The Solidi app has 5 tabs in the bottom navigation bar:

| Position | Tab Name | Coordinate | Usage |
|----------|----------|------------|-------|
| 1st | Home | 20%, 96% | Home screen |
| 2nd | Assets | 40%, 96% | Asset list |
| 3rd | **Wallet** | **60%, 90%** | Wallet/Portfolio |
| 4th | Transfer | 80%, 96% | Transfer funds |
| 5th | History | 100%, 96% | Transaction history |

### Critical Discovery: iPhone Home Indicator Issue

**Problem**: On iPhone 15 Pro, tapping at 96% height hits the home indicator area and fails to switch tabs.

**Solution**: Tap slightly higher at **90% height** for the Wallet tab.

```yaml
# ✅ CORRECT - Tap at 90% height
- tapOn:
    point: "60%,90%"
```

```yaml
# ❌ INCORRECT - Tap at 96% height (hits home indicator)
- tapOn:
    point: "60%,96%"
```

## Robust Navigation Pattern

Use multiple fallback attempts to ensure navigation succeeds:

```yaml
# Attempt 1: Primary coordinate (90% height)
- tapOn:
    point: "60%,90%"

# Wait for page load
- extendedWaitUntil:
    visible: "non_existent_element"
    timeout: 3000
    optional: true

# Attempt 2: Slightly higher if needed (88%)
- runFlow:
    when:
        notVisible: ".*Withdraw.*"  # Check for expected element
    commands:
        - tapOn:
            point: "60%,88%"
        - extendedWaitUntil:
            visible: "non_existent_element"
            timeout: 3000
            optional: true

# Attempt 3: Text-based selector as final fallback
- runFlow:
    when:
        notVisible: ".*Withdraw.*"
    commands:
        - tapOn: ".*Wallet.*"
        - extendedWaitUntil:
            visible: "non_existent_element"
            timeout: 3000
            optional: true
```

## Verifying Navigation Success

Always verify you've reached the correct screen:

```yaml
# Wait for a unique element on the target screen
- extendedWaitUntil:
    visible: ".*Withdraw.*"  # Unique to Wallet screen
    timeout: 15000

# Or use assertVisible
- assertVisible: "Your Wallet"
```

## Modal/Dialog Navigation

**Important**: When tapping outside a modal to dismiss it, be careful not to tap areas that might close the entire screen.

**Safe Areas for Dismissing Modals**:
- ❌ Top corners (10%, 10%) - Often closes the entire screen
- ❌ Top center (50%, 10-15%) - May close the screen
- ✅ Modal overlay (outside the modal content)
- ✅ "Close" or "Cancel" buttons when available

## Best Practices

1. **Use Text Selectors When Possible**
   ```yaml
   - tapOn: ".*Wallet.*"  # More maintainable than coordinates
   ```

2. **Add testID to Navigation Elements**
   ```javascript
   // In your React Native code
   <TouchableOpacity testID="wallet-tab">
   ```

3. **Always Include Verification**
   ```yaml
   - tapOn: "60%,90%"
   - assertVisible: "Expected Screen Element"
   ```

4. **Use Regex for Flexibility**
   ```yaml
   # Handles icons or extra spaces
   - tapOn: ".*Wallet.*"
   ```

5. **Document Coordinate-Based Navigation**
   ```yaml
   # Tap Wallet tab (3rd icon, 60% horizontal, 90% vertical)
   # Note: 90% instead of 96% to avoid iPhone home indicator
   - tapOn:
       point: "60%,90%"
   ```
