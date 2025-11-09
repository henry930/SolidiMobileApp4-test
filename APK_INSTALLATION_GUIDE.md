# APK Installation Guide

## Your APK is Ready! 📱

### APK Location
Your release APK has been built and is available at:
```
/Users/henry/Solidi/SolidiMobileApp4/SolidiMobileApp-release-20251109.apk
```

**Size:** 25 MB  
**Build Date:** November 9, 2025

### What's Included in This Build
✅ Biometric/PIN authentication enabled
✅ SolidiLoadingScreen with branded logo on all loading pages
✅ History page improvements (GBP as primary, pull-to-refresh, auto-load)
✅ All recent bug fixes and improvements

---

## Installation Options

### Option 1: Transfer via USB Cable (Recommended)

1. **Connect your Android phone to your Mac via USB**

2. **Enable File Transfer mode** on your phone
   - Swipe down from the top of your phone
   - Tap the "USB charging this device" notification
   - Select "File Transfer" or "Transfer files"

3. **Copy the APK to your phone**
   ```bash
   # Run this command to copy via ADB
   adb push /Users/henry/Solidi/SolidiMobileApp4/SolidiMobileApp-release-20251109.apk /sdcard/Download/
   ```
   
   Or use Android File Transfer app if you have it installed.

4. **Install on your phone**
   - Open the "Files" or "Downloads" app on your phone
   - Find `SolidiMobileApp-release-20251109.apk`
   - Tap to install
   - If prompted, enable "Install from unknown sources" for this app

### Option 2: Transfer via Email/Cloud

1. **Email yourself the APK**
   - Attach `/Users/henry/Solidi/SolidiMobileApp4/SolidiMobileApp-release-20251109.apk`
   - Open email on your phone
   - Download the attachment
   - Tap to install

2. **Or use Google Drive/Dropbox**
   - Upload the APK to your cloud storage
   - Download on your phone
   - Tap to install

### Option 3: Direct Install via ADB (Quick Method)

If your phone is already connected via USB:
```bash
cd /Users/henry/Solidi/SolidiMobileApp4
adb install SolidiMobileApp-release-20251109.apk
```

---

## Installation Steps on Phone

1. **Locate the APK file**
   - Usually in Downloads or Files app

2. **Tap the APK file**
   - You may see "For security, your phone is not allowed to install unknown apps from this source"

3. **Enable installation from this source**
   - Tap "Settings"
   - Toggle "Allow from this source" ON
   - Go back and tap the APK again

4. **Review permissions and install**
   - Review the requested permissions
   - Tap "Install"
   - Wait for installation to complete

5. **Open the app**
   - Tap "Open" or find the app in your app drawer
   - If you have biometric authentication set up, you'll be prompted to authenticate

---

## Important Notes

### ⚠️ Security Settings
- This is a release APK but not signed with a production certificate
- Your phone will warn about installing from "unknown sources" - this is normal
- Enable "Install unknown apps" only for the specific source you're using (Files app, Chrome, etc.)

### 🔐 First Launch
- The app will request biometric authentication on first launch
- You can use fingerprint, face unlock, or device PIN
- If you skip biometric setup, you can enable it later in settings

### 📱 Uninstalling Previous Version
If you have an older version installed:
```bash
# Via ADB
adb uninstall com.solidimobileapp4test

# Or manually on phone: Settings > Apps > SolidiMobileApp4 > Uninstall
```

### 🆕 Features to Test
1. **Biometric Authentication**
   - App should prompt for fingerprint/face/PIN on launch
   - Try putting app in background for 30+ seconds, then reopening
   - Test idle timeout (5 minutes)

2. **Branded Loading Screens**
   - Navigate to Wallet - should see Solidi logo while loading
   - Navigate to Transfer - should see Solidi logo while initializing
   - Login flow - should see Solidi logo during sign-in

3. **History Page**
   - Pull down to refresh
   - Scroll to bottom - should auto-load more items
   - GBP amounts should be displayed larger than crypto amounts

---

## Troubleshooting

### "App not installed" error
- Make sure you uninstalled any previous version first
- Check that you have enough storage space (at least 100MB free)

### "Parse error" or "There was a problem parsing the package"
- The APK file may be corrupted during transfer
- Try transferring again
- Make sure the file size is ~25MB

### App crashes on launch
- Clear app data: Settings > Apps > SolidiMobileApp4 > Storage > Clear Data
- Reinstall the app

### Biometric authentication not working
- Make sure you have biometric authentication set up on your device
- Go to phone Settings > Security > Biometric/Fingerprint
- The app will fall back to device PIN if biometrics are unavailable

---

## Version Information

**App Name:** SolidiMobileApp4  
**Package:** com.solidimobileapp4test  
**Build Date:** November 9, 2025  
**React Native Version:** 0.73.11  
**Android Target SDK:** 35

**Recent Changes:**
- ✅ Biometric authentication enabled (fingerprint/face/PIN)
- ✅ Branded loading screens with Solidi logo
- ✅ History page improvements (pull-to-refresh, auto-load)
- ✅ GBP displayed as primary currency
- ✅ Various bug fixes and performance improvements

---

## Quick Install Command

If your phone is connected via USB and ADB is working:
```bash
adb install -r /Users/henry/Solidi/SolidiMobileApp4/SolidiMobileApp-release-20251109.apk
```

The `-r` flag will replace any existing installation.

---

**Need Help?** Check the logcat output if you encounter issues:
```bash
adb logcat | grep -i "solidimobileapp"
```
