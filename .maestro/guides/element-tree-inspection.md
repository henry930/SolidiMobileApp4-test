# Element Tree & Hierarchy Inspection Guide

Maestro provides multiple ways to inspect the UI element tree/hierarchy, similar to other E2E testing tools.

## Method 1: Maestro Studio (Recommended)

**Maestro Studio** is the most powerful way to inspect the element tree visually.

### Starting Maestro Studio

```bash
maestro studio
```

Then open **http://localhost:9999** in your browser.

### Features

1. **Visual Element Tree**
   - See the complete UI hierarchy in a tree structure
   - Expand/collapse nodes to navigate the tree
   - See parent-child relationships

2. **Element Properties Inspector**
   - Click any element to see:
     - `text` - The visible text
     - `resource-id` / `testID` - Unique identifier
     - `accessibility-label` - Accessibility text
     - `bounds` - Position and size `[x, y, width, height]`
     - `class` - Component type (Button, Text, View, etc.)
     - `enabled` - Whether element is interactive
     - `visible` - Whether element is visible

3. **Interactive Highlighting**
   - Hover over elements in the tree to highlight them on the device
   - Click elements on the device to find them in the tree

4. **Command Generation**
   - Click an element to automatically generate the Maestro command
   - Copy the command to your test file

### Example Workflow

1. Run `maestro studio`
2. Navigate to your screen in the app
3. Click on the "Withdraw" button in the device view
4. Studio shows you:
   ```
   Text: "Withdraw"
   TestID: "wallet-withdraw-button"
   Bounds: [280, 380, 100, 44]
   Class: TouchableOpacity
   ```
5. Studio generates:
   ```yaml
   - tapOn:
       id: "wallet-withdraw-button"
   ```

## Method 2: Maestro Hierarchy Command

You can programmatically access the hierarchy in your tests (limited support):

```yaml
# Attempt to log hierarchy (may not work in all versions)
- evalScript: ${console.log(maestro.hierarchy())}
```

**Note**: This feature availability depends on your Maestro version.

## Method 3: Using Maestro's Debug Output

When a test fails, Maestro automatically captures the UI hierarchy in the debug output.

### Accessing Debug Output

```bash
# After running a test
cd ~/.maestro/tests/

# Find the latest test run
ls -lt | head -5

# Open the test folder
open 2025-11-23_HHMMSS/
```

### What's Included

- **Screenshots** - Visual representation of the UI
- **Logs** - Test execution logs
- **Hierarchy snapshots** - UI tree at failure point (in some versions)

## Method 4: Maestro CLI Hierarchy Dump

Some Maestro versions support dumping the hierarchy directly:

```bash
# Connect to device
maestro test --help

# Look for hierarchy-related commands
maestro hierarchy  # (if available)
```

## Method 5: Using assertVisible with Debugging

You can use assertions to explore what elements exist:

```yaml
# This will fail and show you what elements ARE visible
- assertVisible: "NonExistentElement"

# Maestro's error message will list similar elements it found
```

## Practical Example: Finding Elements

### Scenario: You need to find the "Withdraw" button

**Step 1: Run Maestro Studio**
```bash
maestro studio
```

**Step 2: Navigate to the Wallet screen**
- Manually tap through the app to reach the Wallet screen

**Step 3: Inspect the Element Tree**
- In Studio's element tree, expand nodes until you find the button
- You might see:
  ```
  View
    ├─ ScrollView
    │   ├─ View (wallet-card)
    │   │   ├─ Text ("Your Wallet")
    │   │   ├─ Text ("£261.89")
    │   │   ├─ View (button-container)
    │   │   │   ├─ TouchableOpacity (testID: "wallet-deposit-button")
    │   │   │   │   └─ Text ("+ Deposit")
    │   │   │   └─ TouchableOpacity (testID: "wallet-withdraw-button")
    │   │   │       └─ Text ("- Withdraw")
  ```

**Step 4: Click the Element**
- Click on the "Withdraw" button in the tree
- Studio shows all its properties

**Step 5: Generate Command**
- Studio generates:
  ```yaml
  - tapOn:
      id: "wallet-withdraw-button"
  ```

## Comparing to Other E2E Tools

### Appium Inspector
- **Appium**: Separate inspector app, shows element tree
- **Maestro**: Built into Maestro Studio, same functionality

### Detox Element Inspector  
- **Detox**: `detox test --inspect` shows element tree
- **Maestro**: `maestro studio` shows element tree

### Selenium DevTools
- **Selenium**: Browser DevTools for element inspection
- **Maestro**: Maestro Studio for mobile element inspection

**Maestro Studio is equivalent to these tools!**

## Best Practices for Element Tree Inspection

### 1. Start with Maestro Studio

Always use Maestro Studio first when:
- Writing a new test
- Debugging a failing test
- Finding the right selector for an element
- Understanding the UI structure

### 2. Document What You Find

```yaml
# Document the element tree structure in comments
# Element Tree:
#   View (wallet-card)
#   ├─ Text ("Your Wallet")
#   ├─ TouchableOpacity (testID: "wallet-withdraw-button")
#   │   └─ Text ("Withdraw")
#
- tapOn:
    id: "wallet-withdraw-button"
```

### 3. Use testID When Available

If you see a `testID` in the element tree, use it!

```yaml
# ✅ BEST - Using testID from element tree
- tapOn:
    id: "wallet-withdraw-button"

# ⚠️ OK - Using text (less reliable)
- tapOn: "Withdraw"

# ❌ LAST RESORT - Using coordinates
- tapOn:
    point: "75%,32%"
```

### 4. Add testID to Elements Without Them

If an element doesn't have a `testID` in the tree:

```javascript
// Add it to your React Native code
<TouchableOpacity 
  testID="wallet-withdraw-button"  // Add this!
  onPress={handleWithdraw}
>
  <Text>Withdraw</Text>
</TouchableOpacity>
```

Then rebuild and the element will appear in the tree with the ID.

## Troubleshooting Element Tree Issues

### Issue: Can't See Element in Tree

**Possible Causes**:
1. Element is not rendered yet (still loading)
2. Element is in a different screen/modal
3. Element is hidden (visibility: hidden)

**Solutions**:
- Wait for the screen to fully load
- Navigate to the correct screen
- Check if element is conditionally rendered

### Issue: Element Has No testID

**Solution**: Add testID to the component code:

```javascript
<Button testID="my-button" />
```

### Issue: Multiple Elements with Same Text

**Solution**: Use the element tree to find unique properties:
- Different testIDs
- Different parent containers
- Different positions in the tree

Use index or more specific selectors:

```yaml
# Use index to select specific instance
- tapOn:
    text: "Submit"
    index: 1  # Second "Submit" button

# Or use parent context
- tapOn:
    text: "Submit"
    below: "Form Title"
```

## Advanced: Programmatic Hierarchy Access

If you need to access the hierarchy programmatically (for custom logic):

```yaml
# Store hierarchy in a variable (if supported)
- runScript: |
    const hierarchy = maestro.hierarchy();
    // Process hierarchy
    // Find elements programmatically
```

**Note**: This is advanced usage and may not be supported in all Maestro versions.

## Quick Reference

| Task | Method |
|------|--------|
| Visual element tree | `maestro studio` → http://localhost:9999 |
| Find element properties | Click element in Studio |
| Generate command | Click element in Studio, copy command |
| Debug failed test | Check `~/.maestro/tests/latest/` |
| Add testID | Edit React Native component code |
| Inspect live app | `maestro studio` while app is running |

## Resources

- **Maestro Studio Docs**: https://maestro.mobile.dev/cli/studio
- **Element Selectors**: https://maestro.mobile.dev/api-reference/commands/tapOn
- **Debugging**: https://maestro.mobile.dev/getting-started/debugging

## Summary

**Yes, Maestro has full element tree/hierarchy inspection!**

The main tool is **Maestro Studio**, which provides:
- ✅ Visual element tree browser
- ✅ Element property inspector  
- ✅ Interactive highlighting
- ✅ Automatic command generation
- ✅ Real-time inspection

It's equivalent to Appium Inspector, Detox's inspector, or Selenium DevTools, but specifically designed for mobile testing with Maestro.

**Start using it now:**
```bash
maestro studio
# Open http://localhost:9999
```
