# Firebase Setup Guide - Android Push Notifications

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Enter project name: **SolidiMobileApp4**
4. (Optional) Enable Google Analytics
5. Click "Create project"

## Step 2: Add Android App to Firebase

1. In Firebase Console, click the Android icon or "Add app"
2. Enter Android package name: **`com.solidimobileapp4test`**
   - ⚠️ Must match exactly with your app's package name
3. (Optional) Enter app nickname: "Solidi Mobile App"
4. (Optional) Enter SHA-1 certificate (not required for FCM)
5. Click "Register app"

## Step 3: Download google-services.json

1. Click "Download google-services.json"
2. **IMPORTANT:** Place this file in:
   ```
   /Users/henry/Solidi/SolidiMobileApp4/android/app/google-services.json
   ```
3. Click "Next" and "Continue to console"

## Step 4: Get FCM Server Key (for AWS SNS)

1. In Firebase Console, click the gear icon ⚙️ → "Project settings"
2. Go to "Cloud Messaging" tab
3. Under "Cloud Messaging API (Legacy)", find:
   - **Server key** - Copy this for AWS SNS
   - **Sender ID** - Note this down
4. If "Cloud Messaging API" is disabled, enable it:
   - Click "Manage API in Google Cloud Console"
   - Enable "Firebase Cloud Messaging API"

## Step 5: Configure AWS SNS

### Create Platform Application

```bash
aws sns create-platform-application \
  --name SolidiMobileApp4-Android \
  --platform GCM \
  --attributes PlatformCredential="YOUR_FCM_SERVER_KEY"
```

Or via AWS Console:
1. Go to AWS SNS Console
2. Click "Mobile" → "Push notifications"
3. Click "Create platform application"
4. Settings:
   - Application name: `SolidiMobileApp4-Android`
   - Push notification platform: `Firebase Cloud Messaging (FCM)`
   - API key: [Paste FCM Server Key]
5. Click "Create platform application"
6. **Copy the ARN** - you'll need this

### Create SNS Topic (if needed)

```bash
aws sns create-topic --name solidi-mobile-notifications
```

## Step 6: Build and Test

### Clean and Rebuild

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Check for FCM Token

Look for this in logs:
```
adb logcat | grep "FCM Token"
```

You should see:
```
FCM Token: [long token string]
```

## Step 7: Test Notification

### Via Firebase Console

1. Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and text
4. Click "Send test message"
5. Enter FCM token from logs
6. Click "Test"

### Via AWS SNS

First, register device endpoint:
```bash
aws sns create-platform-endpoint \
  --platform-application-arn arn:aws:sns:REGION:ACCOUNT:app/GCM/SolidiMobileApp4-Android \
  --token YOUR_FCM_TOKEN
```

Then send notification:
```bash
aws sns publish \
  --target-arn ENDPOINT_ARN \
  --message '{"GCM":"{\"notification\":{\"title\":\"Test\",\"body\":\"Hello from AWS SNS\"}}"}' \
  --message-structure json
```

## Troubleshooting

### "Default FirebaseApp is not initialized"
- Ensure `google-services.json` is in `android/app/`
- Run `./gradlew clean` and rebuild

### No FCM token in logs
- Check permissions in AndroidManifest.xml
- Verify Firebase dependencies in build.gradle
- Check Google Services plugin is applied

### Notifications not received
- Verify FCM token is valid
- Check notification channel is created (Android 8+)
- Ensure app has notification permission (Android 13+)

### Build errors
- Run `cd android && ./gradlew clean`
- Delete `android/app/build` folder
- Rebuild: `npx react-native run-android`

## Files Created/Modified

### ✅ Created:
- `android/app/src/main/java/com/solidimobileapp4test/FCMService.java`
- `src/services/PushNotificationManager.js`

### ✅ Modified:
- `android/build.gradle` (added Google Services plugin)
- `android/app/build.gradle` (added Firebase dependencies)
- `android/app/src/main/AndroidManifest.xml` (added permissions and service)
- `package.json` (added Firebase packages)

### ⏳ Pending:
- `android/app/google-services.json` (download from Firebase)

## Next Steps

1. ✅ Complete Firebase setup and download `google-services.json`
2. ✅ Place file in `android/app/`
3. ✅ Get FCM Server Key
4. ✅ Configure AWS SNS with FCM credentials
5. ✅ Build and test app
6. ✅ Verify notifications work
