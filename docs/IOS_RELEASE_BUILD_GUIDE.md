# iOS App Release Build Guide

This guide walks you through building and submitting the Solidi Mobile App to the App Store.

## Prerequisites

### 1. Apple Developer Account
- Paid Apple Developer Program membership ($99/year)
- Account must be in good standing
- Two-factor authentication enabled

### 2. Development Environment
- macOS with latest Xcode installed (currently 16.2)
- Node.js and npm installed
- CocoaPods installed (`sudo gem install cocoapods`)
- Valid Apple certificates and provisioning profiles

### 3. App Store Connect Setup
- App created in App Store Connect
- Bundle Identifier: `com.solidimobileapp4test` (or your registered ID)
- App icons and screenshots prepared

---

## Step 1: Prepare the Code

### Update Version Number

1. Open `ios/SolidiMobileApp4.xcworkspace` in Xcode
2. Select the **SolidiMobileApp4** project in the navigator
3. Select the **SolidiMobileApp4** target
4. Under **General** tab:
   - **Version**: Update to your release version (e.g., `1.2.3`)
   - **Build**: Increment the build number (e.g., `40`, `41`, etc.)

Alternatively, edit `ios/SolidiMobileApp4.xcodeproj/project.pbxproj`:
```bash
# Update MARKETING_VERSION and CURRENT_PROJECT_VERSION
```

Or update in `android/app/build.gradle` for consistency:
```gradle
versionCode 40
versionName "1.2.3"
```

### Clean Previous Builds

```bash
cd ios
rm -rf build
rm -rf ~/Library/Developer/Xcode/DerivedData/SolidiMobileApp4-*
pod deintegrate
pod install
cd ..
```

---

## Step 2: Configure Signing & Capabilities

### In Xcode:

1. **Select Project** → **SolidiMobileApp4** target
2. **Signing & Capabilities** tab
3. **Team**: Select your Apple Developer team
4. **Bundle Identifier**: Verify it matches App Store Connect
5. **Signing Certificate**: 
   - For Release: `Apple Distribution`
   - Automatically manage signing: ✅ (recommended)
   
### Required Capabilities:
- ✅ Push Notifications
- ✅ Background Modes (remote-notification)
- Any other capabilities your app uses

### Provisioning Profile:
- Xcode will auto-generate: `match AppStore com.solidimobileapp4test`
- Or manually select your Distribution provisioning profile

---

## Step 3: Update App Configuration

### Disable Development Settings

1. **Disable Hermes Debug** (if using):
   ```javascript
   // In ios/Podfile, ensure:
   :hermes_enabled => false
   ```

2. **Production API Endpoints**:
   Check that all API URLs point to production:
   ```javascript
   // src/services/PushNotificationService.js
   const API_BASE_URL = 'https://u4o3rayvl6.execute-api.us-east-1.amazonaws.com/prod';
   ```

3. **Remove Debug Code**:
   - Remove console.logs (optional, but recommended)
   - Disable debug alerts
   - Remove development-only features

### Update Info.plist

Verify required keys in `ios/SolidiMobileApp4/Info.plist`:
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
<key>NSCameraUsageDescription</key>
<string>Allow camera access for document scanning</string>
<!-- Add all required privacy descriptions -->
```

---

## Step 4: Build for Release

### Option A: Using Xcode (Recommended)

1. **Select Device**:
   - At the top of Xcode: **Product** → **Destination** → **Any iOS Device (arm64)**

2. **Select Scheme**:
   - Ensure **SolidiMobileApp4** scheme is selected
   - Click scheme → **Edit Scheme**
   - Under **Run** → **Build Configuration** → Select **Release**

3. **Archive the App**:
   - **Product** → **Archive** (or `Cmd+Shift+B`)
   - Wait for build to complete (5-15 minutes)
   - Xcode Organizer will open automatically

4. **Validate Archive**:
   - In Organizer, select your archive
   - Click **Distribute App**
   - Choose **App Store Connect**
   - Click **Next**
   - Select **Upload** 
   - Click **Next**
   - Xcode will validate the archive
   - Fix any issues and re-archive if needed

### Option B: Using Command Line

```bash
# Clean and build
cd ios

# Archive
xcodebuild archive \
  -workspace SolidiMobileApp4.xcworkspace \
  -scheme SolidiMobileApp4 \
  -configuration Release \
  -archivePath build/SolidiMobileApp4.xcarchive \
  -destination "generic/platform=iOS" \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=YOUR_TEAM_ID

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/SolidiMobileApp4.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist

# Upload to App Store Connect
xcrun altool --upload-app \
  -f build/SolidiMobileApp4.ipa \
  -t ios \
  -u your-apple-id@email.com \
  -p "your-app-specific-password"
```

---

## Step 5: Upload to App Store Connect

### Via Xcode Organizer:

1. **Distribute App**:
   - Select archive in Organizer
   - Click **Distribute App**
   - Choose **App Store Connect**

2. **Distribution Options**:
   - ✅ Upload
   - ✅ Include bitcode (if applicable)
   - ✅ Upload symbols for crash reporting
   - ✅ Manage version and build number

3. **Re-sign** (if needed):
   - Select appropriate certificate
   - Select provisioning profile

4. **Upload**:
   - Click **Upload**
   - Wait for upload to complete
   - You'll receive confirmation email

---

## Step 6: Submit for Review

### In App Store Connect (https://appstoreconnect.apple.com):

1. **Navigate to Your App**:
   - My Apps → SolidiMobileApp4

2. **Select Version**:
   - Click on version (e.g., 1.2.3)
   - Or create new version if needed

3. **Build Selection**:
   - Under **Build** section
   - Wait for build to appear (5-30 minutes after upload)
   - Select your uploaded build

4. **Fill Required Information**:
   - **What's New in This Version**: Release notes
   - **Keywords**: Search optimization
   - **Support URL**: Your support website
   - **Marketing URL**: (optional)
   - **Privacy Policy URL**: Required

5. **App Review Information**:
   - **Sign-In Required**: ✅ (if applicable)
   - Demo account credentials for review team
   - Contact information
   - Notes for reviewer (optional)

6. **Screenshots & Previews**:
   - Required for all device sizes:
     - 6.7" (iPhone 15 Pro Max)
     - 6.5" (iPhone 14 Plus)
     - 5.5" (iPhone 8 Plus)
     - iPad Pro (12.9")
   - Can use same screenshots scaled

7. **Age Rating**:
   - Complete questionnaire
   - Based on app content

8. **Submit for Review**:
   - Review all information
   - Click **Submit for Review**

---

## Step 7: TestFlight (Optional but Recommended)

Before submitting to App Store, test via TestFlight:

### Enable TestFlight:

1. In App Store Connect → **TestFlight** tab
2. Build appears automatically after processing
3. Add **Internal Testers** (up to 100)
4. Add **External Testers** (requires App Review)

### Internal Testing:

1. **Add Internal Testers**:
   - App Store Connect → TestFlight → Internal Testing
   - Add users (must have iTunes Connect access)

2. **Enable Build**:
   - Select build
   - Toggle ON for testing group

3. **Testers Install**:
   - They receive email invitation
   - Install TestFlight app
   - Install your app via TestFlight

### External Testing:

1. Create **External Group**
2. Add build to group
3. Submit for Beta App Review
4. Once approved, invite testers via email

---

## Step 8: Monitor Review Process

### App Review Timeline:
- **In Review**: 24-48 hours typically
- **Waiting for Review**: Can take 1-3 days
- **Metadata Rejected**: Fix issues, resubmit
- **Binary Rejected**: Need new build

### Common Rejection Reasons:
- Missing privacy descriptions
- Broken links or demo account
- Crashes or bugs
- Missing functionality in screenshots
- Privacy policy violations
- Guideline violations

### Responding to Rejection:
1. Read rejection notes carefully
2. Fix all issues mentioned
3. Update version or build number
4. Resubmit with resolution notes

---

## Step 9: Release

### When Approved:

1. **Manual Release**:
   - App Store Connect → Version → **Release**
   - Appears in App Store within hours

2. **Automatic Release**:
   - Configure in version settings
   - Releases immediately upon approval

3. **Scheduled Release**:
   - Set future date/time
   - Releases automatically at scheduled time

### Phased Release (Recommended):
- Roll out to small percentage first
- Monitor crashes and reviews
- Gradually increase to 100%

---

## Troubleshooting

### Build Issues

**"No signing certificate found"**:
```bash
# Solution: Download certificates from developer.apple.com
# Or let Xcode manage automatically
```

**"Provisioning profile doesn't include signing certificate"**:
- Xcode → Preferences → Accounts → Download Manual Profiles
- Or regenerate profiles in developer.apple.com

**Pod install fails**:
```bash
cd ios
pod repo update
pod deintegrate
pod install
```

### Upload Issues

**"Archive is invalid"**:
- Check bundle identifier matches App Store Connect
- Verify all required Info.plist keys present
- Ensure version/build number not used before

**"Missing compliance"**:
- Add export compliance in Info.plist
- Answer encryption questions in App Store Connect

### Review Issues

**"Missing crash logs"**:
- Ensure symbols uploaded with archive
- Xcode → Window → Organizer → Archives → Upload Symbols

---

## Best Practices

### Before Each Release:

✅ Test thoroughly on physical devices  
✅ Test in production environment  
✅ Verify all API endpoints point to production  
✅ Check for memory leaks and crashes  
✅ Update version numbers  
✅ Prepare release notes  
✅ Update screenshots if UI changed  
✅ Test upgrade path from previous version  
✅ Verify push notifications work  
✅ Check all third-party SDK versions  

### Version Numbering:

- **Major.Minor.Patch** (e.g., 1.2.3)
- **Major**: Breaking changes
- **Minor**: New features
- **Patch**: Bug fixes
- **Build**: Auto-increment for each upload

### Asset Requirements:

- App Icon: 1024x1024px (no transparency)
- Screenshots: Up-to-date, accurate
- Privacy Policy: Required, must be accessible
- App Preview Videos: Optional but recommended

---

## Quick Reference Commands

```bash
# Clean build
cd ios && rm -rf build && pod install && cd ..

# Check certificate
security find-identity -v -p codesigning

# Archive via command line
xcodebuild archive -workspace ios/SolidiMobileApp4.xcworkspace \
  -scheme SolidiMobileApp4 -configuration Release \
  -archivePath build/SolidiMobileApp4.xcarchive

# Validate archive
xcrun altool --validate-app -f build/SolidiMobileApp4.ipa \
  -t ios -u your-email@example.com -p app-specific-password

# Upload to App Store
xcrun altool --upload-app -f build/SolidiMobileApp4.ipa \
  -t ios -u your-email@example.com -p app-specific-password
```

---

## Additional Resources

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [Xcode Archive & Upload Guide](https://help.apple.com/xcode/mac/current/#/dev442d7f2ca)

---

## Support

For issues specific to this app:
- Check existing documentation in `/docs`
- Review push notification setup in `PUSH_NOTIFICATIONS_SETUP_GUIDE.md`
- Verify AWS Lambda functions are deployed correctly

For Apple-specific issues:
- Contact Apple Developer Support
- Check developer forums
- Review App Store Connect resolution center
