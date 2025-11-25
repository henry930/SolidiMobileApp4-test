# Push Notifications - Quick Start Guide

Get your push notification system up and running in 5 steps!

## Prerequisites

- ✅ AWS Account with CLI configured
- ✅ Node.js 18+ installed
- ✅ Xcode (for iOS)
- ✅ Android Studio (for Android)

## Step 1: Install Dependencies (5 minutes)

```bash
# Run the installation script
./scripts/install-push-notifications.sh

# Or manually:
npm install @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native react-native-device-info
cd ios && pod install && cd ..
```

## Step 2: Deploy AWS Infrastructure (10 minutes)

```bash
# Deploy to development environment
./scripts/deploy-push-notifications.sh dev us-east-1

# Save the API endpoint from the output
# Example: https://abc123.execute-api.us-east-1.amazonaws.com/dev
```

## Step 3: Configure Firebase (15 minutes)

### iOS

1. Create iOS app in [Firebase Console](https://console.firebase.google.com)
2. Download `GoogleService-Info.plist`
3. Add to `ios/SolidiMobileApp4/` in Xcode
4. Enable Push Notifications capability in Xcode
5. Generate APNS certificate:
   ```bash
   # Follow guide in docs/PUSH_NOTIFICATIONS_IOS_SETUP.md
   ```

### Android

1. Create Android app in [Firebase Console](https://console.firebase.google.com)
2. Download `google-services.json`
3. Place in `android/app/`
4. Update gradle files (see `docs/PUSH_NOTIFICATIONS_ANDROID_SETUP.md`)
5. Get FCM server key from Firebase Console

## Step 4: Configure AWS SNS (5 minutes)

### iOS (APNS)

```bash
# Upload APNS certificate
aws sns create-platform-application \
  --name solidi-ios-dev \
  --platform APNS_SANDBOX \
  --attributes PlatformCredential="$(cat certificate.pem)"

# Update CloudFormation with the ARN
```

### Android (FCM)

```bash
# Upload FCM server key
aws sns create-platform-application \
  --name solidi-android-dev \
  --platform GCM \
  --attributes PlatformCredential="YOUR_FCM_SERVER_KEY"

# Update CloudFormation with the ARN
```

## Step 5: Update App Configuration (2 minutes)

Edit `src/services/PushNotificationService.js`:

```javascript
// Line 8: Update with your API Gateway endpoint
const API_BASE_URL = 'https://your-api-gateway-url/dev';
```

## Test It! (5 minutes)

### 1. Run the App

```bash
# iOS (requires physical device)
npm run ios:device

# Android
npm run android
```

### 2. Grant Permissions

- Allow notifications when prompted
- Check logs for FCM token

### 3. Test Registration

```bash
# Use the FCM token from app logs
./scripts/test-push-notifications.sh \
  https://your-api-gateway-url/dev \
  your-user-id
```

### 4. Send Test Notification

```bash
curl -X POST https://your-api-gateway-url/dev/send \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["your-user-id"],
    "title": "Hello!",
    "body": "Your first push notification!"
  }'
```

## Verify Success ✅

You should see:
- ✅ App logs show FCM token
- ✅ Device registered in DynamoDB
- ✅ Notification appears on device
- ✅ Tapping notification opens app

## Troubleshooting

### No FCM Token
- Check `GoogleService-Info.plist` / `google-services.json` is added
- Verify Firebase is initialized
- Check bundle ID / package name matches Firebase project

### Registration Fails
- Verify API endpoint is correct
- Check CloudWatch logs: `/aws/lambda/dev-register-device`
- Ensure device has internet connection

### No Notification Received
- Verify APNS/FCM credentials in AWS SNS
- Check app has notification permissions
- Review CloudWatch logs: `/aws/lambda/dev-send-notification`
- For iOS: Must use physical device (not simulator)

## Next Steps

1. **Integrate in App**: Add to your login flow (see `docs/PUSH_NOTIFICATIONS_APP_INTEGRATION.md`)
2. **Add Authentication**: Secure API Gateway with Cognito or API keys
3. **Set Up Monitoring**: CloudWatch alarms for failures
4. **Production Deploy**: Deploy to production environment
5. **Test at Scale**: Send notifications to multiple users

## Useful Commands

```bash
# View Lambda logs
aws logs tail /aws/lambda/dev-register-device --follow
aws logs tail /aws/lambda/dev-send-notification --follow

# Check DynamoDB
aws dynamodb scan --table-name dev-device-tokens

# Test API
./scripts/test-push-notifications.sh https://your-api-url/dev user-123

# Redeploy infrastructure
./scripts/deploy-push-notifications.sh dev us-east-1
```

## Documentation

- 📖 [Complete README](../PUSH_NOTIFICATIONS_README.md)
- 🍎 [iOS Setup Guide](./PUSH_NOTIFICATIONS_IOS_SETUP.md)
- 🤖 [Android Setup Guide](./PUSH_NOTIFICATIONS_ANDROID_SETUP.md)
- 📱 [App Integration Guide](./PUSH_NOTIFICATIONS_APP_INTEGRATION.md)
- 🔍 [Walkthrough](../.gemini/antigravity/brain/.../walkthrough.md)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review CloudWatch logs for errors
3. Verify all configuration steps completed
4. Check Firebase Console for any alerts
5. Review AWS SNS platform application status

---

**Total Setup Time**: ~45 minutes

**Status**: Ready to deploy! 🚀
