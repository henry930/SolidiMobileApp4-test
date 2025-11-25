# Push Notification Setup for Android

## Prerequisites
- Firebase project created
- Android Studio installed

## Steps

### 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create new one)
3. Click "Add app" → Android
4. Enter package name: `co.solidi.mobile.test`
5. Download `google-services.json`
6. Place in `android/app/` folder

### 2. Update build.gradle Files

#### Project-level `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        // Add this line
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

#### App-level `android/app/build.gradle`:

```gradle
apply plugin: 'com.android.application'
// Add this line at the bottom
apply plugin: 'com.google.gms.google-services'

dependencies {
    // Firebase BOM
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    
    // Firebase Messaging
    implementation 'com.google.firebase:firebase-messaging'
    
    // Existing dependencies...
}
```

### 3. Update AndroidManifest.xml

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.INTERNET"/>
    
    <application>
        <!-- Firebase Messaging Service -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT"/>
            </intent-filter>
        </service>
        
        <!-- Default notification channel -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="default"/>
            
        <!-- Existing application code... -->
    </application>
</manifest>
```

### 4. Get FCM Server Key

1. Go to Firebase Console
2. Project Settings → Cloud Messaging
3. Copy "Server key"
4. Save for AWS SNS configuration

### 5. Upload to AWS SNS

```bash
aws sns create-platform-application \
  --name solidi-android-dev \
  --platform GCM \
  --attributes PlatformCredential="YOUR_FCM_SERVER_KEY"
```

### 6. Request Notification Permission (Android 13+)

The PushNotificationService already handles this, but ensure your app requests permission:

```javascript
import { PermissionsAndroid, Platform } from 'react-native';

if (Platform.OS === 'android' && Platform.Version >= 33) {
  await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
}
```

### 7. Build and Test

```bash
# Install dependencies
npm install

# Run on device or emulator
npm run android
```

## Testing

1. Run the app on device or emulator
2. Grant notification permission when prompted
3. Check logs for FCM token:
   ```bash
   adb logcat | grep FCM
   ```
4. Use the token to send a test notification

## Notification Channels (Android 8.0+)

The PushNotificationService creates a default channel. To customize:

```javascript
await notifee.createChannel({
  id: 'important',
  name: 'Important Notifications',
  importance: AndroidImportance.HIGH,
  sound: 'default',
  vibration: true,
  badge: true,
});
```

## Troubleshooting

### google-services.json Not Found
- Ensure file is in `android/app/` folder
- Check file name is exactly `google-services.json`
- Rebuild project

### No FCM Token
- Verify `google-services.json` package name matches app
- Check Firebase is initialized
- Ensure device has Google Play Services

### Notifications Not Received
- Check FCM server key is correct in AWS SNS
- Verify app has notification permissions
- Check device is connected to internet
- Review CloudWatch logs for errors

### Build Errors
- Clean build: `cd android && ./gradlew clean`
- Invalidate caches in Android Studio
- Check all gradle files are updated correctly

## Background Notifications

Android handles background notifications automatically. The notification will appear in the system tray even if the app is closed.

For custom handling:

```javascript
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background message:', remoteMessage);
  // Custom processing
});
```

## Data-Only Messages

To send data-only messages (no notification):

```json
{
  "data": {
    "key": "value"
  }
}
```

These won't show a notification but will trigger `onMessage` handler.
