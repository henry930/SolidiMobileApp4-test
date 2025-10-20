# Device Connection Help

## Problem
The app was built and installed on iPhone device but it's still trying to connect to localhost:8081 instead of 192.168.0.65:8081.

## Solutions

### Method 1: Developer Menu (Recommended)
1. **Shake your iPhone** to bring up the React Native developer menu
2. Tap on **"Configure Bundler"** or **"Dev Settings"**
3. Set the **Debug server host & port for device** to: `192.168.0.65:8081`
4. Tap **"Reload"**

### Method 2: Manual Rebuild (Currently Running)
The app is being rebuilt in Debug mode which should allow it to connect to the Metro server dynamically.

### Method 3: Check Network Configuration
Ensure both devices are on the same WiFi network:
- **Mac IP**: 192.168.0.65
- **iPhone**: Should be on same 192.168.0.x network
- **Metro Server**: Running on 192.168.0.65:8081

## Current Status
- ✅ Metro server is running on 192.168.0.65:8081
- ✅ App is installed on device
- 🔄 Rebuilding app in Debug mode
- ❌ App still connects to localhost (needs configuration)

## Test Metro Server Accessibility
From your iPhone's Safari browser, try opening:
`http://192.168.0.65:8081`

You should see the Metro welcome screen if the connection is working.