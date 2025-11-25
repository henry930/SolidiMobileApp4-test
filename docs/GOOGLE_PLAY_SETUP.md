# Google Play Console API Setup Guide

This guide explains how to set up automated uploads to Google Play Console for the Solidi Mobile App.

## Quick Start (Manual Upload)

The `release-internal.sh` script works immediately for building releases. If Google Play API is not configured, it will:
1. Build the AAB file
2. Open Google Play Console in browser
3. Open distribution folder with the AAB file
4. Show manual upload instructions

## Automated Upload Setup (Optional)

To enable fully automated uploads, follow these steps:

### Step 1: Install Fastlane

```bash
# Using Homebrew (recommended for macOS)
brew install fastlane

# Or using RubyGems
sudo gem install fastlane
```

### Step 2: Create Google Cloud Service Account

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google Play developer account

2. **Create or Select Project**
   - Click project dropdown at top
   - Create new project or select existing one linked to Google Play

3. **Enable Google Play Android Developer API**
   - Go to: APIs & Services > Library
   - Search for "Google Play Android Developer API"
   - Click "Enable"

4. **Create Service Account**
   - Go to: APIs & Services > Credentials
   - Click "Create Credentials" > "Service Account"
   - Fill in details:
     - Name: `solidi-app-upload`
     - Description: `Service account for automated app uploads`
   - Click "Create and Continue"
   - Grant role: "Service Account User"
   - Click "Done"

5. **Create JSON Key**
   - Find your new service account in the list
   - Click on it to open details
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Click "Create"
   - **Save the downloaded JSON file**

### Step 3: Link Service Account to Google Play Console

1. **Go to Google Play Console**
   - Visit: https://play.google.com/console
   - Select your app (Solidi Mobile App)

2. **Add Service Account**
   - Go to: Settings (⚙️) > API access
   - Under "Service accounts", click "Link"
   - Find your service account (created in Step 2)
   - Click "Link service account"

3. **Grant Permissions**
   - After linking, click "Manage Play Console permissions"
   - Go to "App permissions" tab
   - Select your app: "Solidi Mobile App"
   - Grant these permissions:
     - ✅ View app information and download bulk reports
     - ✅ Create and edit draft releases
     - ✅ Release to testing tracks (internal, closed, open)
   - Click "Apply" then "Save"

### Step 4: Configure Project

1. **Move JSON Key to Project**
   ```bash
   # Move the downloaded JSON to your project
   mv ~/Downloads/your-service-account-*.json /Users/henry/Solidi/SolidiMobileApp4/android/google-play-service-account.json
   ```

2. **Update Package Name (if needed)**
   - Open `release-internal.sh`
   - Find line: `PACKAGE_NAME="com.solidimobileapp4"`
   - Update to match your actual package name (found in `app/build.gradle`)

3. **Add to .gitignore**
   ```bash
   echo "android/google-play-service-account.json" >> .gitignore
   ```

### Step 5: Test Upload

```bash
# Run the release script
./release-internal.sh

# Or manually test fastlane
cd android
fastlane supply init \
  --package_name "com.solidimobileapp4" \
  --json_key "google-play-service-account.json"
```

## Usage

### Build and Upload

```bash
# Run the complete release process
./release-internal.sh

# The script will:
# 1. Increment version code automatically
# 2. Prompt for version name (optional)
# 3. Clean previous builds
# 4. Build release AAB
# 5. Copy to distribution folder
# 6. Upload to Google Play internal testing (if configured)
```

### Manual Upload (Fallback)

If automated upload is not configured or fails:

1. Run the script - it will build the AAB
2. Go to: https://play.google.com/console
3. Navigate to: Release > Testing > Internal testing
4. Click "Create new release"
5. Upload the AAB from `distribution/` folder
6. Add release notes
7. Click "Review release" > "Start rollout to Internal testing"

## Troubleshooting

### Error: "The caller does not have permission"

**Solution:** Re-check service account permissions in Google Play Console (Step 3.3)

### Error: "APK specifies a version code that has already been used"

**Solution:** Version code must be unique. The script auto-increments, but if you manually uploaded, increment further:
```bash
# Edit android/app/build.gradle
versionCode 39  # Increase to next available number
```

### Error: "Service account JSON not found"

**Solution:** Ensure JSON file is at:
```
/Users/henry/Solidi/SolidiMobileApp4/android/google-play-service-account.json
```

### Fastlane Not Found

**Solution:** Install fastlane:
```bash
brew install fastlane
```

## Security Best Practices

1. **Never commit service account JSON to git**
   - Already in `.gitignore`
   - Treat it like a password

2. **Use least privilege**
   - Only grant permissions needed for uploads
   - Don't grant "Admin" access

3. **Rotate keys periodically**
   - Delete old keys in Google Cloud Console
   - Create new ones every 6-12 months

4. **Monitor API usage**
   - Check Google Cloud Console for unusual activity
   - Review Play Console audit logs

## Alternative: GitHub Actions

For CI/CD automation, consider using GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release to Internal Testing

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm install
      - name: Build release AAB
        run: cd android && ./gradlew bundleRelease
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
          packageName: com.solidimobileapp4
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: internal
```

## Resources

- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Google Play Developer API](https://developers.google.com/android-publisher)
- [Supply (Fastlane Upload Tool)](https://docs.fastlane.tools/actions/upload_to_play_store/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Play Console](https://play.google.com/console)

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review fastlane logs: `~/.fastlane/logs/`
3. Check Google Play Console audit logs
4. Fall back to manual upload process
