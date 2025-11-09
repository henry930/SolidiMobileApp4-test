# SolidiLoadingScreen Component

A reusable, branded loading component that displays the Solidi logo with smooth animations. This component should be used for **all loading states** throughout the application to maintain a consistent user experience.

## Location
`src/components/shared/SolidiLoadingScreen.js`

## Features
- ✨ Animated Solidi logo with pulse effect
- 🔄 Smooth spinning loader ring
- 💬 Customizable loading messages
- 📐 Multiple size options (small, medium, large)
- 🖼️ Full-screen or inline display modes
- 🎨 Customizable background colors

## Basic Usage

### Full-Screen Loading (Default)
```javascript
import { SolidiLoadingScreen } from 'src/components/shared';

// Simple full-screen loading
<SolidiLoadingScreen />

// With custom message
<SolidiLoadingScreen message="Loading your wallet..." />
```

### Inline Loading
```javascript
// Inline loading for smaller areas
<SolidiLoadingScreen 
  fullScreen={false}
  message="Fetching data..."
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fullScreen` | boolean | `true` | If true, covers entire screen with flex: 1 |
| `message` | string | `'Loading...'` | Text message displayed below the logo |
| `size` | string | `'medium'` | Logo size: `'small'`, `'medium'`, or `'large'` |
| `backgroundColor` | string | `'white'` | Background color of the loading screen |

## Size Reference

- **small**: Logo 60px height, Spinner 30px, Font 12px
- **medium**: Logo 100px height, Spinner 40px, Font 14px (recommended)
- **large**: Logo 150px height, Spinner 50px, Font 16px

## Common Use Cases

### 1. Page Initialization Loading
Use when loading data before rendering a page:

```javascript
import { SolidiLoadingScreen } from 'src/components/shared';

const MyPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  if (isLoading) {
    return (
      <SolidiLoadingScreen 
        message="Loading page data..."
        size="medium"
      />
    );
  }
  
  return <View>{/* Page content */}</View>;
}
```

**Example**: `Wallet.js`, `Transfer.js`

### 2. Authentication/Login Flow
Use for sign-in processes:

```javascript
<Portal>
  <View style={{
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  }}>
    <SolidiLoadingScreen 
      fullScreen={false}
      message="Signing you in..."
      size="large"
      backgroundColor="transparent"
    />
  </View>
</Portal>
```

**Example**: `Login.js` auto-login overlay

### 3. Section/Component Loading
Use for loading specific sections without blocking entire page:

```javascript
<View style={{ padding: 20 }}>
  {isLoadingSection ? (
    <SolidiLoadingScreen 
      fullScreen={false}
      size="small"
      message="Fetching transactions..."
    />
  ) : (
    <TransactionList />
  )}
</View>
```

### 4. Replacing Legacy Spinner
The old `Spinner` component has been updated to use `SolidiLoadingScreen`:

```javascript
// OLD (still works, now uses SolidiLoadingScreen internally)
import { Spinner } from 'src/components/atomic';
<Spinner />

// NEW (recommended for more control)
import { SolidiLoadingScreen } from 'src/components/shared';
<SolidiLoadingScreen fullScreen={false} size="medium" />
```

**Example**: `History.js`, `BankAccounts.js`

### 5. Modal/Overlay Loading
For loading overlays on top of existing content:

```javascript
{isProcessing && (
  <Portal>
    <View style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <SolidiLoadingScreen 
        fullScreen={false}
        message="Processing transaction..."
        size="large"
      />
    </View>
  </Portal>
)}
```

## Implementation Examples

### Example 1: Wallet Loading
```javascript
// File: Wallet.js
import { SolidiLoadingScreen } from 'src/components/shared';

if (isLoading) {
  return (
    <SolidiLoadingScreen 
      message="Loading your wallet..."
      size="medium"
    />
  );
}
```

### Example 2: Transfer Page Initialization
```javascript
// File: Transfer.js
import { SolidiLoadingScreen } from 'src/components/shared';

if (isInitializing) {
  return (
    <SolidiLoadingScreen 
      message="Preparing transfer..."
      size="medium"
    />
  );
}
```

### Example 3: Login Auto-Login Overlay
```javascript
// File: Login.js
import { SolidiLoadingScreen } from 'src/components/shared';

{appState.user.isAutoLoginInProgress && (
  <Portal>
    <View style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <SolidiLoadingScreen 
        fullScreen={false}
        message="Signing you in..."
        size="large"
        backgroundColor="transparent"
      />
    </View>
  </Portal>
)}
```

## Migration Guide

### Replace ActivityIndicator
**Before:**
```javascript
<ActivityIndicator size="large" color="#10b981" />
```

**After:**
```javascript
<SolidiLoadingScreen 
  fullScreen={false}
  size="medium"
  message=""
/>
```

### Replace Custom Loading Views
**Before:**
```javascript
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  <ActivityIndicator size="large" />
  <Text>Loading...</Text>
</View>
```

**After:**
```javascript
<SolidiLoadingScreen message="Loading..." />
```

### Replace Spinner Component
**Before:**
```javascript
import { Spinner } from 'src/components/atomic';
{ isLoading && <Spinner/> }
```

**After (Spinner now uses SolidiLoadingScreen internally):**
```javascript
import { Spinner } from 'src/components/atomic';
{ isLoading && <Spinner/> }
// OR for more control:
import { SolidiLoadingScreen } from 'src/components/shared';
{ isLoading && <SolidiLoadingScreen fullScreen={false} size="medium" /> }
```

## Best Practices

1. **Consistent Sizing**
   - Use `medium` for most full-page loads
   - Use `small` for inline/section loads
   - Use `large` for important overlays (e.g., authentication)

2. **Clear Messages**
   - Use descriptive messages: "Loading wallet...", "Processing payment..."
   - Keep messages short and action-oriented
   - Use empty string `""` if no message needed

3. **Appropriate Backgrounds**
   - Use `white` (default) for full-page loads
   - Use `transparent` for overlays
   - Match your page's color scheme for inline loads

4. **Performance**
   - The component is lightweight with optimized animations
   - Use `fullScreen={false}` when possible to reduce rendering overhead
   - Only show when actually loading (check loading state)

## Animation Details

The component includes three animations:
1. **Fade In**: 300ms smooth opacity transition on mount
2. **Logo Pulse**: 2s loop, scales logo 1.0 → 1.05 → 1.0
3. **Spinner Rotation**: 2s continuous rotation of the loader ring

All animations use `useNativeDriver: true` for optimal performance.

## Accessibility

- Uses semantic View structures for screen readers
- Text messages are announced by screen readers
- Sufficient color contrast for visibility

## Files Updated

The following files have been updated to use `SolidiLoadingScreen`:

1. ✅ `src/components/atomic/Spinner.js` - Now uses SolidiLoadingScreen
2. ✅ `src/application/SolidiMobileApp/components/MainPanel/components/Wallet/Wallet.js`
3. ✅ `src/application/SolidiMobileApp/components/MainPanel/components/Login/Login.js`
4. ✅ `src/application/SolidiMobileApp/components/MainPanel/components/Transfer/Transfer.js`

## Future Enhancements

Potential improvements:
- [ ] Add success/error states with checkmark/error animations
- [ ] Support custom logo images via props
- [ ] Add progress percentage display option
- [ ] Theme-aware color schemes
- [ ] Skippable loading for long operations

## Support

For questions or issues, contact the development team or file an issue in the project repository.
