# GitHub Actions iOS Build Automation Setup Guide

This guide provides complete step-by-step instructions for setting up automated iOS builds and TestFlight uploads using GitHub Actions.

## Overview

Once configured, GitHub Actions will automatically:
- Build your iOS app in Release mode
- Sign it with your Apple Distribution certificate
- Export a signed IPA file
- Upload to TestFlight for testing
- Store the IPA as an artifact

This happens automatically on every push to `main` or `release` branches.

---

## Part 1: Apple Developer Account Setup

### 1.1 Create Apple Distribution Certificate

1. Open **Keychain Access** on your Mac
2. Go to **Keychain Access** → **Certificate Assistant** → **Request a Certificate from a Certificate Authority**
3. Enter your email, select "Saved to disk", click Continue
4. Save the `CertificateSigningRequest.certSigningRequest` file

5. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
6. Click **+** to add a new certificate
7. Select **Apple Distribution** (under Distribution)
8. Upload the CSR file you created
9. Download the certificate (e.g., `distribution.cer`)

10. Double-click the downloaded certificate to install it in Keychain Access
11. In Keychain Access, find the certificate (search "Apple Distribution")
12. Right-click → **Export** → Save as `.p12` file
13. Set a password (remember this - you'll need it for GitHub secrets)

### 1.2 Register App ID

1. Go to [App IDs](https://developer.apple.com/account/resources/identifiers/list)
2. Click **+** to create a new App ID
3. Select **App IDs** → **App**
4. **Description**: Your app name (e.g., "Solidi Test App")
5. **Bundle ID**: Explicit, enter your Bundle ID (e.g., `com.henry.soliditestapp`)
6. **Capabilities**: Enable these if needed:
   - Push Notifications
   - Apple Pay Payment Processing (if using Apple Pay)
   - Any other capabilities your app uses
7. Click **Continue** → **Register**

### 1.3 Create App Store Provisioning Profile

1. Go to [Provisioning Profiles](https://developer.apple.com/account/resources/profiles/list)
2. Click **+** to create a new profile
3. Select **App Store** (under Distribution)
4. **App ID**: Select your app (e.g., `com.henry.soliditestapp`)
5. **Certificates**: Select your Apple Distribution certificate
6. **Profile Name**: e.g., "YourApp TestFlight Profile"
7. Click **Generate**
8. **Download** the profile (e.g., `YourApp_TestFlight_Profile.mobileprovision`)

### 1.4 Create App Store Connect API Key

1. Go to [App Store Connect API Keys](https://appstoreconnect.apple.com/access/integrations/api)
2. Click **Generate API Key** (or **+** icon)
3. **Name**: "GitHub Actions"
4. **Access**: Select "Developer" or "App Manager"
5. Click **Generate**
6. **Download** the `.p8` key file (e.g., `AuthKey_XXXXXXXXXX.p8`)
   - ⚠️ You can only download this ONCE - save it securely!
7. Note the **Key ID** (e.g., `FG3B8T7RK9`)
8. Note the **Issuer ID** at the top of the page (UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 1.5 Create App in App Store Connect (if not exists)

1. Go to [App Store Connect - My Apps](https://appstoreconnect.apple.com/apps)
2. Click **+** → **New App**
3. **Platforms**: iOS
4. **Name**: Your app name
5. **Primary Language**: English
6. **Bundle ID**: Select the Bundle ID you registered
7. **SKU**: Any unique identifier (e.g., `com.henry.soliditestapp.001`)
8. **User Access**: Full Access
9. Click **Create**

---

## Part 2: GitHub Account & Billing Setup

### 2.0 GitHub Actions Billing Setup

GitHub Actions for macOS runners requires a paid plan:

**Free Tier Limitations:**
- Free accounts: 0 minutes for macOS runners
- GitHub Pro: 0 minutes for macOS runners (need to pay per minute)
- Team/Enterprise: Limited free minutes, then pay per minute

**macOS Runner Costs:**
- macOS runners: **$0.08 per minute** (10x multiplier)
- A typical iOS build takes ~15 minutes = ~$1.20 per build

**Steps to Enable macOS Runners:**

1. **Upgrade to GitHub Pro** (if on Free plan)
   - Go to [GitHub Pricing](https://github.com/pricing)
   - Click **Upgrade** → Select **Pro** ($4/month)
   - Or use existing Pro/Team/Enterprise account

2. **Set Up Billing**
   - Go to your repository **Settings** → **Billing and plans**
   - Or visit: `https://github.com/settings/billing`
   - Click **Set up a spending limit**
   - Add a payment method (credit card)

3. **Set Spending Limit** (Recommended)
   - Go to **Settings** → **Billing and plans** → **Spending limits**
   - Or visit: `https://github.com/settings/billing/spending_limit`
   - Set a monthly limit (e.g., $50/month = ~40 builds)
   - Enable email alerts when reaching limit
   - This prevents unexpected charges

4. **Enable Actions for Private Repositories** (if applicable)
   - Go to repository **Settings** → **Actions** → **General**
   - Under "Actions permissions", ensure Actions are enabled
   - Under "Workflow permissions", set appropriate permissions

**Cost Estimation:**
- 1 build ≈ 15 minutes ≈ $1.20
- Daily builds (30/month) ≈ $36/month
- 10 builds/month ≈ $12/month
- Set spending limit accordingly

**Tips to Reduce Costs:**
- Only run on `main` and `release` branches (already configured)
- Use workflow dispatch for manual triggers
- Don't run on pull requests to save money
- Cache dependencies (already configured - saves ~2 minutes)

## Part 3: GitHub Repository Setup

### 3.1 Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 6 secrets:

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `IOS_CERTIFICATE` | Base64-encoded `.p12` certificate | Run: `base64 -i path/to/certificate.p12 \| pbcopy` (macOS) |
| `IOS_CERTIFICATE_PASSWORD` | Password for the `.p12` file | The password you set when exporting the certificate |
| `IOS_PROVISIONING_PROFILE` | Base64-encoded `.mobileprovision` file | Run: `base64 -i path/to/profile.mobileprovision \| pbcopy` |
| `KEYCHAIN_PASSWORD` | Any secure password | Generate a random password (used temporarily in CI) |
| `APP_STORE_CONNECT_API_KEY` | Content of the `.p8` file | Run: `cat path/to/AuthKey_XXX.p8 \| pbcopy` |
| `APP_STORE_CONNECT_KEY_ID` | Your API Key ID | From App Store Connect (e.g., `FG3B8T7RK9`) |
| `APP_STORE_CONNECT_ISSUER_ID` | Your Issuer ID | From App Store Connect (UUID format) |

**Quick Commands to Add Secrets (using GitHub CLI):**

```bash
# Certificate
base64 -i ~/path/to/certificate.p12 | gh secret set IOS_CERTIFICATE --repo OWNER/REPO

# Certificate Password
echo "YOUR_P12_PASSWORD" | gh secret set IOS_CERTIFICATE_PASSWORD --repo OWNER/REPO

# Provisioning Profile
base64 -i ~/path/to/profile.mobileprovision | gh secret set IOS_PROVISIONING_PROFILE --repo OWNER/REPO

# Keychain Password (generate random)
openssl rand -base64 32 | gh secret set KEYCHAIN_PASSWORD --repo OWNER/REPO

# App Store Connect API Key
cat ~/path/to/AuthKey_XXX.p8 | gh secret set APP_STORE_CONNECT_API_KEY --repo OWNER/REPO

# App Store Connect Key ID
echo "YOUR_KEY_ID" | gh secret set APP_STORE_CONNECT_KEY_ID --repo OWNER/REPO

# App Store Connect Issuer ID
echo "YOUR_ISSUER_ID" | gh secret set APP_STORE_CONNECT_ISSUER_ID --repo OWNER/REPO
```

### 3.2 Configure Xcode Project

Update your `ios/YourApp.xcodeproj/project.pbxproj`:

**For Release configuration:**
```
CODE_SIGN_STYLE = Manual;
CODE_SIGN_IDENTITY = "Apple Distribution";
DEVELOPMENT_TEAM = YOUR_TEAM_ID;
PRODUCT_BUNDLE_IDENTIFIER = com.your.bundleid;
PROVISIONING_PROFILE_SPECIFIER = "Your Profile Name";
```

### 3.3 Configure Export Options

Create/update `ios/exportOptions.plist`:

```xml
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
    <key>compileBitcode</key>
    <false/>
    <key>destination</key>
    <string>export</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>com.your.bundleid</key>
        <string>Your Profile Name</string>
    </dict>
</dict>
</plist>
```

### 3.4 Create GitHub Actions Workflow

The workflow file should be at `.github/workflows/build-ios.yml`

Key steps in the workflow:
1. **Checkout code**
2. **Setup Node.js** (for React Native)
3. **Install dependencies** (npm/yarn)
4. **Install CocoaPods** dependencies
5. **Import code signing certificates** (from secrets)
6. **Build iOS app** (using xcodebuild)
7. **Export IPA** (with code signing)
8. **Upload to TestFlight** (automatic)
9. **Upload IPA artifact** (backup in GitHub)

---

## Part 4: TestFlight Setup

### 4.1 Wait for Build Processing

After GitHub Actions uploads the IPA:
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app → **TestFlight** tab
3. Wait 5-15 minutes for Apple to process the build
4. You'll receive an email when it's ready

### 4.2 Add Internal Testers

1. In TestFlight tab, click **Internal Testing** in sidebar
2. Click **+** to create a new test group (or use default)
3. **Group Name**: e.g., "Internal Testers"
4. Click **Testers** → **+** icon
5. Enter email addresses of testers
6. Click **Add**
7. Select the build version to test
8. Click **Start Testing**

### 4.3 Testers Install the App

Testers will:
1. Receive an email invitation
2. Click the link in the email
3. Install **TestFlight** app from App Store (if not installed)
4. Open TestFlight app
5. Accept the invitation
6. Install and test your app

---

## Verification Checklist

### GitHub Account ✓
- [ ] GitHub Pro (or higher) plan active
- [ ] Payment method added to billing
- [ ] Spending limit set for GitHub Actions
- [ ] Email alerts configured for spending limit
- [ ] Actions enabled for repository

### Apple Developer Account ✓
- [ ] Apple Distribution certificate created and exported as `.p12`
- [ ] App ID registered with required capabilities
- [ ] App Store provisioning profile created and downloaded
- [ ] App Store Connect API key created and `.p8` file downloaded
- [ ] Noted Key ID and Issuer ID
- [ ] App created in App Store Connect

### GitHub Repository ✓
- [ ] All 7 secrets added to GitHub repository
- [ ] Xcode project configured for manual signing
- [ ] `exportOptions.plist` configured correctly
- [ ] GitHub Actions workflow file exists at `.github/workflows/build-ios.yml`

### TestFlight ✓
- [ ] Build successfully uploaded (check GitHub Actions logs)
- [ ] Build processed in App Store Connect (wait 5-15 min)
- [ ] Test group created
- [ ] Testers added and invited

---

## Troubleshooting

### Build Fails: "No profiles found"
- Check that provisioning profile name in Xcode project matches exactly
- Verify provisioning profile includes all required capabilities
- Re-download provisioning profile and update GitHub secret

### Build Fails: "Signing certificate not found"
- Verify `.p12` certificate is valid and not expired
- Check certificate password is correct in secrets
- Ensure certificate is "Apple Distribution" type

### TestFlight Upload Fails
- Verify all 3 App Store Connect secrets are correct
- Check that API key has "Developer" or "App Manager" access
- Ensure app exists in App Store Connect with correct Bundle ID

### Build Succeeds but No Upload
- Check GitHub Actions logs for TestFlight upload step
- Verify the build was triggered by push to `main` or `release` branch
- Check App Store Connect for any error messages

---

## Maintenance

### Certificate Renewal
Apple Distribution certificates expire after 1 year:
1. Create new certificate following steps 1.1
2. Update `IOS_CERTIFICATE` and `IOS_CERTIFICATE_PASSWORD` secrets
3. Regenerate provisioning profile with new certificate
4. Update `IOS_PROVISIONING_PROFILE` secret

### Provisioning Profile Updates
If you add capabilities or change configuration:
1. Update App ID capabilities
2. Regenerate provisioning profile
3. Update `IOS_PROVISIONING_PROFILE` secret in GitHub

---

## Summary

Once set up, your workflow is:
1. **Develop** your app locally
2. **Push** to `main` or `release` branch
3. **GitHub Actions** automatically builds and signs
4. **TestFlight** receives the build
5. **Testers** get notified and can install

No manual building or uploading needed! 🎉

---

## Additional Resources

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [TestFlight User Guide](https://developer.apple.com/testflight/)
