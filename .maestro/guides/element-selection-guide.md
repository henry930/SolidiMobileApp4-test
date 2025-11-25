# Element Selection Guide

## Priority Order for Element Selection

Use this priority order when selecting elements:

1. **testID** (Most Reliable)
2. **accessibilityLabel**
3. **Text with Regex**
4. **Coordinates** (Last Resort)

## 1. Using testID (Recommended)

### Adding testID to React Native Components

```javascript
// In your component code
<TouchableOpacity 
  testID="wallet-withdraw-button"
  accessibilityLabel="Withdraw"
>
  <Text>Withdraw</Text>
</TouchableOpacity>
```

### Using testID in Maestro

```yaml
- tapOn:
    id: "wallet-withdraw-button"
```

**Benefits**:
- ✅ Most reliable
- ✅ Survives UI changes
- ✅ Works across languages
- ✅ Not affected by styling changes

## 2. Using Text Selectors

### Basic Text Matching

```yaml
# Exact match
- tapOn: "Withdraw"

# Case-insensitive
- tapOn: "withdraw"
```

### Regex for Flexibility

```yaml
# Match text with icons or extra spaces
- tapOn: ".*Withdraw.*"

# Match multiple options
- tapOn: "Withdraw|Send|Confirm"

# Match BTC with full name
- tapOn: "BTC (Bitcoin)"
```

### Common Text Patterns in Solidi App

| Element | Selector | Notes |
|---------|----------|-------|
| Withdraw Button | `.*Withdraw.*` | May have icon prefix |
| BTC Asset | `BTC (Bitcoin)` | Full name in parentheses |
| Address Dropdown | `Select a saved address.*` | Has trailing text |
| Wallet Tab | `.*Wallet.*` | May have icon |

## 3. Using Coordinates

**Only use coordinates when text/ID selectors fail!**

### Documenting Coordinate Taps

Always add comments explaining the coordinate:

```yaml
# Tap Withdraw button (right side, ~32% from top)
# Located next to Deposit button in wallet card
- tapOn:
    point: "75%,32%"
```

### Creating Robust Coordinate Taps

Use "pecking" strategy - try multiple nearby coordinates:

```yaml
# Attempt 1: Center of button
- tapOn:
    point: "75%,32%"

# Attempt 2: Slightly lower
- runFlow:
    when:
        notVisible: "Expected Result"
    commands:
        - tapOn:
            point: "75%,36%"

# Attempt 3: Slightly higher
- runFlow:
    when:
        notVisible: "Expected Result"
    commands:
        - tapOn:
            point: "75%,28%"
```

## 4. Using Index for Lists

When selecting from a list:

```yaml
# Select first item (index 0)
- tapOn:
    index: 0

# Select second item
- tapOn:
    index: 1
```

**Warning**: Index 0 might be a header! Try index 1 if index 0 doesn't work.

## Conditional Element Selection

### Smart Asset Selection Pattern

```yaml
# Only select if not already selected
- runFlow:
    when:
        notVisible: "BTC (Bitcoin)"
    commands:
        - tapOn: ".*Asset.*"  # Open dropdown
        - tapOn: "BTC (Bitcoin)"  # Select BTC

# If already visible, just tap to confirm
- runFlow:
    when:
        visible: "BTC (Bitcoin)"
    commands:
        - tapOn: "BTC (Bitcoin)"
```

## Handling Dynamic Content

### Waiting for Elements

```yaml
# Wait for element to appear
- extendedWaitUntil:
    visible: "BTC (Bitcoin)"
    timeout: 10000

# Optional wait (won't fail if not found)
- extendedWaitUntil:
    visible: "Optional Element"
    timeout: 5000
    optional: true
```

### Verifying Element State

```yaml
# Assert element is visible
- assertVisible: "Withdraw"

# Assert element is NOT visible
- assertNotVisible: "Loading..."
```

## Using Maestro Studio for Discovery

1. **Run Maestro Studio**:
   ```bash
   maestro studio
   ```

2. **Open http://localhost:9999**

3. **Navigate to your screen**

4. **Click elements** - Studio shows you:
   - Text content
   - testID (if available)
   - Accessibility labels
   - Coordinates

5. **Copy the generated command**

## Best Practices

### DO ✅

```yaml
# Use testID when available
- tapOn:
    id: "wallet-withdraw-button"

# Use regex for flexibility
- tapOn: ".*Withdraw.*"

# Add fallbacks
- runFlow:
    when:
        visible: "Withdraw"
    commands:
        - tapOn: "Withdraw"
- runFlow:
    when:
        notVisible: "Withdraw"
    commands:
        - tapOn:
            point: "75%,32%"
```

### DON'T ❌

```yaml
# Don't use bare coordinates without comments
- tapOn:
    point: "75%,32%"

# Don't use exact text that might change
- tapOn: "Withdraw £10.00"  # Amount changes!

# Don't assume index 0 is always the first item
- tapOn:
    index: 0  # Might be a header!
```

## Troubleshooting Element Selection

### Element Not Found

1. **Check spelling and case**
2. **Try regex**: `.*ElementText.*`
3. **Use Maestro Studio** to see actual text
4. **Check if element is in a modal/overlay**
5. **Wait longer**: Increase timeout
6. **Take screenshot** to see current state

### Element Found But Tap Doesn't Work

1. **Element might be covered** by keyboard/modal
2. **Element might be disabled**
3. **Try tapping slightly offset**
4. **Check if you need to scroll** to make it visible
5. **Verify element is actually tappable** (not just text)

## App-Specific Element IDs

Document your app's testIDs here as you add them:

| Element | testID | Location |
|---------|--------|----------|
| Withdraw Button | `wallet-withdraw-button` | Wallet screen |
| Amount Input | `text-input-outline` | Withdraw form |
| (Add more as you create them) | | |
