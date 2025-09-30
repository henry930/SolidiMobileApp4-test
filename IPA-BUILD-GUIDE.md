# Building IPA and Uploading to TestFlight - Complete Guide

## Prerequisites

### 1. Apple Developer Account
- Active Apple Developer Program membership ($99/year)
- Access to App Store Connect
- Team ID and certificates configured

### 2. Development Environment
- macOS with Xcode installed
- React Native development environment
- Valid code signing certificates
- Provisioning profiles

### 3. App Store Connect Setup
- App created in App Store Connect
- Bundle ID matches your project
- App icons and metadata configured

## Method 1: Using the Automated Script

### Quick Start
```bash
cd /Users/henry/Documents/SolidiMobileApp4
./build-ipa.sh
```

The script will:
1. ✅ Check environment prerequisites
2. ✅ Install dependencies (Node.js, CocoaPods)
3. ✅ Clean previous builds
4. ✅ Create archive
5. ✅ Export IPA
6. ✅ Upload to TestFlight

## Method 2: Manual Process

### Step 1: Prepare Environment
```bash
# Navigate to project
cd /Users/henry/Documents/SolidiMobileApp4

# Setup Node (if using NVM)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install dependencies
npm install

# Install iOS dependencies
cd ios
pod install
cd ..
```

### Step 2: Clean Build Environment
```bash
# Clean React Native
npx react-native clean

# Clean iOS builds
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/SolidiMobileApp4*
```

### Step 3: Configure Code Signing

#### Option A: Automatic Code Signing (Recommended)
1. Open `ios/SolidiMobileApp4.xcworkspace` in Xcode
2. Select your project in navigator
3. Go to "Signing & Capabilities" tab
4. Enable "Automatically manage signing"
5. Select your Team
6. Ensure Bundle Identifier matches App Store Connect

#### Option B: Manual Code Signing
1. Create Distribution Certificate in Apple Developer portal
2. Create App Store Provisioning Profile
3. Download and install certificates
4. Configure in Xcode project settings

### Step 4: Build Archive
```bash
cd ios

xcodebuild archive \
  -workspace SolidiMobileApp4.xcworkspace \
  -scheme SolidiMobileApp4 \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath build/SolidiMobileApp4.xcarchive \
  CODE_SIGN_STYLE=Automatic
```

### Step 5: Export IPA

#### Create Export Options
```bash
cat > ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
EOF
```

#### Export Archive
```bash
xcodebuild -exportArchive \
  -archivePath build/SolidiMobileApp4.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist ExportOptions.plist
```

### Step 6: Upload to TestFlight

#### Option A: Command Line (xcrun altool)
```bash
xcrun altool --upload-app \
  --type ios \
  --file "build/ipa/SolidiMobileApp4.ipa" \
  --username "your-apple-id@email.com" \
  --password "your-app-specific-password"
```

#### Option B: Xcode Organizer
1. Open Xcode
2. Window → Organizer
3. Select your archive
4. Click "Distribute App"
5. Choose "App Store Connect"
6. Follow the upload wizard

#### Option C: Transporter App
1. Download Transporter from Mac App Store
2. Sign in with Apple ID
3. Drag and drop IPA file
4. Click "Deliver"

## Method 3: Using Xcode GUI (Easiest for Beginners)

### Step 1: Open Project
```bash
cd /Users/henry/Documents/SolidiMobileApp4
open ios/SolidiMobileApp4.xcworkspace
```

### Step 2: Configure for Archive
1. Select "Any iOS Device (arm64)" as destination
2. Ensure scheme is set to "SolidiMobileApp4"
3. Set build configuration to "Release"

### Step 3: Create Archive
1. Product → Archive
2. Wait for build to complete
3. Organizer window will open automatically

### Step 4: Distribute
1. Click "Distribute App"
2. Select "App Store Connect"
3. Choose "Upload"
4. Select Distribution Certificate
5. Review and Upload

## Troubleshooting Common Issues

### Code Signing Errors
```bash
# Check certificates
security find-identity -v -p codesigning

# Check provisioning profiles
ls ~/Library/MobileDevice/Provisioning\ Profiles/
```

### Build Failures
```bash
# Clean everything
cd ios
xcodebuild clean
rm -rf build
rm -rf ~/Library/Developer/Xcode/DerivedData/*
pod install --repo-update
```

### Upload Failures
- Verify Bundle ID matches App Store Connect
- Check app version and build number
- Ensure all required app icons are present
- Verify provisioning profile validity

## TestFlight Configuration

### After Upload Success:

1. **App Store Connect Dashboard**
   - Log into App Store Connect
   - Navigate to your app
   - Go to TestFlight tab

2. **Internal Testing**
   - Add internal testers (up to 100)
   - Testers get immediate access
   - No review required

3. **External Testing**
   - Add external testers (up to 10,000)
   - Requires App Review approval
   - Can take 24-48 hours

4. **Test Information**
   - Add test notes
   - Specify test instructions
   - Set feedback email

## Automation with GitHub Actions

Create `.github/workflows/ios-testflight.yml`:

```yaml
name: iOS TestFlight Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: macos-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Install CocoaPods
      run: |
        cd ios
        pod install
        
    - name: Build and upload to TestFlight
      env:
        APPLE_ID: ${{ secrets.APPLE_ID }}
        APP_PASSWORD: ${{ secrets.APP_PASSWORD }}
      run: |
        cd ios
        xcodebuild archive \
          -workspace SolidiMobileApp4.xcworkspace \
          -scheme SolidiMobileApp4 \
          -configuration Release \
          -destination "generic/platform=iOS" \
          -archivePath build/app.xcarchive
        
        xcodebuild -exportArchive \
          -archivePath build/app.xcarchive \
          -exportPath build \
          -exportOptionsPlist ExportOptions.plist
          
        xcrun altool --upload-app \
          --type ios \
          --file "build/SolidiMobileApp4.ipa" \
          --username "$APPLE_ID" \
          --password "$APP_PASSWORD"
```

## Quick Reference Commands

```bash
# Full automated build and upload
./build-ipa.sh

# Manual archive
cd ios && xcodebuild archive -workspace SolidiMobileApp4.xcworkspace -scheme SolidiMobileApp4 -configuration Release -destination "generic/platform=iOS" -archivePath build/app.xcarchive

# Manual export
xcodebuild -exportArchive -archivePath build/app.xcarchive -exportPath build -exportOptionsPlist ExportOptions.plist

# Manual upload
xcrun altool --upload-app --type ios --file "build/SolidiMobileApp4.ipa" --username "your-apple-id" --password "app-password"
```

## Success Checklist

- [ ] ✅ Apple Developer account active
- [ ] ✅ App created in App Store Connect
- [ ] ✅ Code signing certificates installed
- [ ] ✅ Provisioning profiles configured
- [ ] ✅ Bundle ID matches App Store Connect
- [ ] ✅ App icons present and correct sizes
- [ ] ✅ Version and build numbers incremented
- [ ] ✅ Archive builds successfully
- [ ] ✅ IPA exports without errors
- [ ] ✅ Upload to TestFlight completes
- [ ] ✅ Processing completes in App Store Connect
- [ ] ✅ TestFlight testing configured

Your IPA is now ready for TestFlight distribution! 🚀