# Complete Push Notification Setup Guide

This guide will help you set up **real push notifications** using AWS SNS + APNS/FCM.

## 📋 Prerequisites

- ✅ Apple Developer Account ($99/year)
- ✅ AWS Account with CLI configured
- ✅ Firebase Project (free)
- ✅ Physical iPhone device
- ✅ Xcode installed

---

## 🎯 Step 1: Firebase Setup (15 minutes)

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name: `Solidi Mobile App`
4. Disable Google Analytics (optional)
5. Click "Create project"

### 1.2 Add iOS App

1. In Firebase Console, click "Add app" → iOS
2. **Bundle ID**: `co.solidi.mobile.test`
3. **App nickname**: `Solidi Mobile Test`
4. Click "Register app"
5. **Download `GoogleService-Info.plist`**
6. Click "Next" → "Next" → "Continue to console"

### 1.3 Add Android App (Optional)

1. Click "Add app" → Android
2. **Package name**: `co.solidi.mobile.test`
3. Download `google-services.json`

### 1.4 Add Config Files to Project

```bash
# iOS
cp ~/Downloads/GoogleService-Info.plist ios/SolidiMobileApp4/

# Android (if needed)
cp ~/Downloads/google-services.json android/app/
```

### 1.5 Enable Cloud Messaging

1. In Firebase Console → Project Settings → Cloud Messaging
2. Under "Cloud Messaging API (Legacy)" → Enable
3. Copy the **Server Key** (you'll need this for AWS SNS)

---

## 🍎 Step 2: Apple APNS Setup (20 minutes)

### 2.1 Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Certificates, Identifiers & Profiles → Identifiers
3. Click "+" → App IDs → Continue
4. **Description**: `Solidi Mobile App`
5. **Bundle ID**: `co.solidi.mobile.test` (Explicit)
6. **Capabilities**: Check "Push Notifications"
7. Click "Continue" → "Register"

### 2.2 Create APNS Certificate

1. In Identifiers, select your App ID
2. Scroll to "Push Notifications" → Configure
3. Under "Development SSL Certificate" → "Create Certificate"
4. Follow instructions to create CSR:
   ```bash
   # Open Keychain Access → Certificate Assistant → Request Certificate from CA
   # User Email: your@email.com
   # Common Name: Solidi APNS Dev
   # Save to disk
   ```
5. Upload CSR → Download certificate (`aps_development.cer`)
6. Double-click to install in Keychain

### 2.3 Export APNS Certificate as .p12

1. Open Keychain Access
2. Find "Apple Development iOS Push Services: co.solidi.mobile.test"
3. Right-click → Export
4. Save as: `apns_dev_cert.p12`
5. **Set password**: (remember this!)
6. Save to `~/Desktop/apns_dev_cert.p12`

### 2.4 Update Provisioning Profile

1. In Apple Developer Portal → Profiles
2. Create new Development Profile
3. Select your App ID
4. Select your development certificate
5. Select your iPhone device
6. Download and install profile

---

## ☁️ Step 3: AWS SNS Setup (10 minutes)

### 3.1 Install AWS CLI (if not installed)

```bash
# macOS
brew install awscli

# Configure
aws configure
# AWS Access Key ID: [your-key]
# AWS Secret Access Key: [your-secret]
# Default region: us-east-1
# Default output format: json
```

### 3.2 Create SNS Platform Application (iOS)

```bash
# Upload APNS certificate to AWS SNS
aws sns create-platform-application \
  --name solidi-mobile-apns-dev \
  --platform APNS_SANDBOX \
  --attributes PlatformCredential="$(cat ~/Desktop/apns_dev_cert.p12 | base64)",PlatformPrincipal="$(cat ~/Desktop/apns_dev_cert.p12 | base64)" \
  --region us-east-1

# Save the ARN that's returned - you'll need it!
```

### 3.3 Create SNS Platform Application (Android - Optional)

```bash
# Using Firebase Server Key
aws sns create-platform-application \
  --name solidi-mobile-fcm-dev \
  --platform GCM \
  --attributes PlatformCredential="YOUR_FIREBASE_SERVER_KEY" \
  --region us-east-1
```

---

## 🚀 Step 4: Deploy AWS Infrastructure (5 minutes)

### 4.1 Update CloudFormation Template

Edit `infrastructure/cloudformation-template.yaml`:

```yaml
Parameters:
  APNSPlatformArn:
    Type: String
    Default: "arn:aws:sns:us-east-1:ACCOUNT:app/APNS_SANDBOX/solidi-mobile-apns-dev"
    Description: ARN from step 3.2
  
  FCMPlatformArn:
    Type: String
    Default: "arn:aws:sns:us-east-1:ACCOUNT:app/GCM/solidi-mobile-fcm-dev"
    Description: ARN from step 3.3 (optional)
```

### 4.2 Deploy Stack

```bash
cd /Users/henry/Solidi/SolidiMobileApp4

# Deploy to dev environment
./scripts/deploy-push-notifications.sh dev us-east-1

# Wait for deployment to complete (2-3 minutes)
```

### 4.3 Get API Endpoint

```bash
# Get the API Gateway URL
aws cloudformation describe-stacks \
  --stack-name dev-push-notification-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text
```

---

## 📱 Step 5: Configure Mobile App (5 minutes)

### 5.1 Update PushNotificationService

Edit `src/services/PushNotificationService.js`:

```javascript
// Replace with your API Gateway URL from Step 4.3
const API_BASE_URL = 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev';
```

### 5.2 Rebuild App

```bash
# iOS
cd ios && pod install && cd ..
npx react-native run-ios --device "iPhone"

# Android (if needed)
npx react-native run-android
```

---

## 🧪 Step 6: Test End-to-End (10 minutes)

### 6.1 Check Device Registration

1. Open the app on your iPhone
2. Check Metro logs for:
   ```
   PushNotificationService: FCM Token: [YOUR_TOKEN]
   PushNotificationService: Device registered successfully
   ```
3. Copy the FCM token

### 6.2 Verify in DynamoDB

```bash
# Check if device is registered
aws dynamodb scan \
  --table-name dev-device-tokens \
  --region us-east-1
```

### 6.3 Send Test Notification via API

```bash
# Get your API URL from Step 4.3
API_URL="https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev"

# Send test notification
curl -X POST "$API_URL/send" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceTokens": ["YOUR_FCM_TOKEN_FROM_STEP_6.1"],
    "notification": {
      "title": "Test from AWS SNS!",
      "body": "This is a real push notification"
    },
    "data": {
      "screen": "Home",
      "timestamp": "'$(date +%s)'"
    }
  }'
```

### 6.4 Verify Notification Received

1. **On device**: You should see a notification banner
2. **In app**: Tap bell icon → see notification in inbox
3. **In logs**: Check Metro for notification handling logs

---

## 🔧 Troubleshooting

### Issue: "Firebase not configured"

**Solution**: Make sure `GoogleService-Info.plist` is in `ios/SolidiMobileApp4/` and rebuild

### Issue: "APNS certificate invalid"

**Solution**: 
1. Check certificate is for correct Bundle ID
2. Verify .p12 password is correct
3. Use APNS_SANDBOX for development, APNS for production

### Issue: "Device token not registering"

**Solution**:
1. Check internet connection
2. Verify API_BASE_URL is correct
3. Check AWS Lambda logs in CloudWatch

### Issue: "Notification not appearing"

**Solution**:
1. Check notification permissions are granted
2. Verify device is not in Do Not Disturb mode
3. Check AWS SNS delivery logs

---

## 📊 Monitoring

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/dev-register-device-function --follow

aws logs tail /aws/lambda/dev-send-notification-function --follow
```

### SNS Delivery Status

```bash
# Check SNS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/SNS \
  --metric-name NumberOfNotificationsFailed \
  --dimensions Name=Application,Value=solidi-mobile-apns-dev \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## 🎉 Success Checklist

- [ ] Firebase project created
- [ ] GoogleService-Info.plist added to iOS project
- [ ] APNS certificate created and exported as .p12
- [ ] AWS SNS platform applications created (APNS + FCM)
- [ ] CloudFormation stack deployed successfully
- [ ] Mobile app rebuilt with Firebase config
- [ ] Device registered (check DynamoDB)
- [ ] Test notification sent and received
- [ ] Notification appears in inbox
- [ ] Badge count updates correctly

---

## 📚 Next Steps

1. **Production Setup**: Repeat for production with APNS (not APNS_SANDBOX)
2. **User Targeting**: Implement user-based targeting in Lambda
3. **Analytics**: Add notification analytics tracking
4. **Rich Notifications**: Add images, actions, categories
5. **Scheduling**: Implement scheduled notifications

---

## 🔗 Useful Links

- [Firebase Console](https://console.firebase.google.com)
- [Apple Developer Portal](https://developer.apple.com/account)
- [AWS SNS Documentation](https://docs.aws.amazon.com/sns/)
- [React Native Firebase](https://rnfirebase.io/)
- [Project Documentation](./PUSH_NOTIFICATIONS_README.md)

---

**Need Help?** Check the detailed guides:
- iOS Setup: `PUSH_NOTIFICATIONS_IOS_SETUP.md`
- Android Setup: `PUSH_NOTIFICATIONS_ANDROID_SETUP.md`
- App Integration: `PUSH_NOTIFICATIONS_APP_INTEGRATION.md`
