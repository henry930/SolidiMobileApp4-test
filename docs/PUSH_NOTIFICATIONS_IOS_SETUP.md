# Push Notification Setup for iOS

## Prerequisites
- Apple Developer Account
- Xcode installed
- CocoaPods installed

## Steps

### 1. Enable Push Notifications Capability

1. Open `ios/SolidiMobileApp4.xcworkspace` in Xcode
2. Select your project in the navigator
3. Select your target
4. Go to "Signing & Capabilities" tab
5. Click "+ Capability"
6. Add "Push Notifications"
7. Add "Background Modes" and enable "Remote notifications"

### 2. Generate APNS Certificate

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to Certificates, Identifiers & Profiles
3. Click on "Identifiers"
4. Select your App ID (co.solidi.mobile.test)
5. Enable "Push Notifications"
6. Click "Configure" for Push Notifications
7. Create a new certificate:
   - Development: For testing
   - Production: For App Store
8. Download the certificate (.cer file)
9. Double-click to install in Keychain Access
10. Export as .p12 file (with password)

### 3. Upload Certificate to AWS SNS

```bash
# Convert .p12 to PEM format
openssl pkcs12 -in certificate.p12 -out certificate.pem -nodes -clcerts

# Upload to AWS SNS
aws sns create-platform-application \
  --name solidi-ios-dev \
  --platform APNS_SANDBOX \
  --attributes PlatformCredential="$(cat certificate.pem)"

# For production
aws sns create-platform-application \
  --name solidi-ios-prod \
  --platform APNS \
  --attributes PlatformCredential="$(cat certificate.pem)"
```

### 4. Install Firebase SDK

```bash
cd ios
pod install
cd ..
```

### 5. Add GoogleService-Info.plist

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create new one)
3. Add iOS app with bundle ID: `co.solidi.mobile.test`
4. Download `GoogleService-Info.plist`
5. Add to `ios/SolidiMobileApp4/` folder in Xcode
6. Ensure "Copy items if needed" is checked
7. Ensure target membership includes SolidiMobileApp4

### 6. Update AppDelegate

The app should already have Firebase initialization. Verify `ios/SolidiMobileApp4/AppDelegate.mm`:

```objc
#import <Firebase.h>
#import <UserNotifications/UserNotifications.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Initialize Firebase
  if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }
  
  // Request notification permissions
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;
  
  // ... rest of your code
}

// Handle notification received
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler
{
  completionHandler(UNNotificationPresentationOptionBanner | UNNotificationPresentationOptionSound | UNNotificationPresentationOptionBadge);
}

@end
```

### 7. Update Podfile

Ensure Firebase pods are included in `ios/Podfile`:

```ruby
pod 'Firebase/Core'
pod 'Firebase/Messaging'
```

### 8. Build and Test

```bash
# Install dependencies
npm install

# Install pods
cd ios && pod install && cd ..

# Run on device (required for push notifications)
npm run ios:device
```

## Testing

1. Run the app on a physical device (simulator doesn't support push)
2. Grant notification permission when prompted
3. Check logs for FCM token
4. Use the token to send a test notification via AWS SNS

## Troubleshooting

### No FCM Token
- Ensure GoogleService-Info.plist is added correctly
- Check Firebase is initialized in AppDelegate
- Verify bundle ID matches Firebase project

### Notifications Not Received
- Check APNS certificate is valid and not expired
- Verify app has notification permissions
- Check device is connected to internet
- Review CloudWatch logs for errors

### Build Errors
- Run `pod install` in ios folder
- Clean build folder in Xcode (Cmd+Shift+K)
- Delete DerivedData folder
