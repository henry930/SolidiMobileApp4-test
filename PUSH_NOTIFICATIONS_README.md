# Push Notification System

Complete push notification infrastructure for Solidi Mobile App using AWS SNS, Lambda, and DynamoDB.

## Architecture

```
Mobile App → API Gateway → Lambda → DynamoDB
                ↓
              AWS SNS → APNS/FCM → Devices
```

## Components

### Backend (AWS)
- **DynamoDB**: Stores device tokens and user associations
- **Lambda Functions**:
  - `register-device`: Registers device tokens
  - `send-notification`: Sends push notifications
- **API Gateway**: REST API endpoints
- **SNS**: Push notification delivery service

### Mobile App
- **PushNotificationService**: React Native service for handling notifications
- **Firebase Cloud Messaging**: Cross-platform notification delivery

## Setup

### 1. Prerequisites

- AWS Account with CLI configured
- Node.js 18+ installed
- iOS: Apple Developer account with APNS certificates
- Android: Firebase project with FCM configured

### 2. Deploy AWS Infrastructure

```bash
# Deploy to development environment
./scripts/deploy-push-notifications.sh dev us-east-1

# Deploy to production
./scripts/deploy-push-notifications.sh prod us-east-1
```

This will:
- Create DynamoDB table for device tokens
- Deploy Lambda functions
- Set up API Gateway endpoints
- Configure IAM roles and permissions

### 3. Configure Platform Applications

#### iOS (APNS)

1. Generate APNS certificate in Apple Developer Portal
2. Upload to AWS SNS:
```bash
aws sns create-platform-application \
  --name solidi-ios \
  --platform APNS \
  --attributes PlatformCredential=<certificate-arn>
```

3. Update CloudFormation stack with APNS ARN

#### Android (FCM)

1. Get FCM server key from Firebase Console
2. Create SNS platform application:
```bash
aws sns create-platform-application \
  --name solidi-android \
  --platform GCM \
  --attributes PlatformCredential=<fcm-server-key>
```

3. Update CloudFormation stack with FCM ARN

### 4. Mobile App Integration

#### Install Dependencies

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native
```

#### iOS Setup

1. Add to `ios/Podfile`:
```ruby
pod 'Firebase/Messaging'
```

2. Run:
```bash
cd ios && pod install
```

3. Enable Push Notifications capability in Xcode

#### Android Setup

1. Add to `android/app/build.gradle`:
```gradle
dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.0.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

2. Add `google-services.json` to `android/app/`

#### Initialize in App

```javascript
import PushNotificationService from './src/services/PushNotificationService';

// In your app initialization (after user logs in)
useEffect(() => {
  if (user?.id) {
    PushNotificationService.initialize(user.id);
  }
}, [user]);

// On logout
const handleLogout = async () => {
  await PushNotificationService.unregister();
  // ... rest of logout logic
};
```

## API Reference

### Register Device

**Endpoint**: `POST /register`

**Request**:
```json
{
  "userId": "user123",
  "deviceId": "device-unique-id",
  "platform": "ios",
  "token": "fcm-or-apns-token"
}
```

**Response**:
```json
{
  "success": true,
  "endpointArn": "arn:aws:sns:...",
  "message": "Device registered successfully"
}
```

### Send Notification

**Endpoint**: `POST /send`

**Request**:
```json
{
  "userIds": ["user123", "user456"],
  "title": "New Message",
  "body": "You have a new message",
  "data": {
    "screen": "Messages",
    "messageId": "msg123"
  }
}
```

**Response**:
```json
{
  "success": true,
  "summary": {
    "totalUsers": 2,
    "successfulUsers": 2,
    "failedUsers": 0
  },
  "results": [
    {
      "userId": "user123",
      "success": true,
      "devices": [...]
    }
  ]
}
```

## Testing

### Test Device Registration

```bash
curl -X POST https://your-api-gateway-url/dev/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "deviceId": "test-device",
    "platform": "ios",
    "token": "your-fcm-token"
  }'
```

### Test Sending Notification

```bash
curl -X POST https://your-api-gateway-url/dev/send \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["test-user"],
    "title": "Test Notification",
    "body": "This is a test notification"
  }'
```

## Monitoring

### CloudWatch Logs

- Lambda logs: `/aws/lambda/dev-register-device` and `/aws/lambda/dev-send-notification`
- API Gateway logs: Check API Gateway console

### DynamoDB

View registered devices:
```bash
aws dynamodb scan --table-name dev-device-tokens
```

### SNS Metrics

Check SNS console for:
- Number of notifications sent
- Delivery success rate
- Failed deliveries

## Troubleshooting

### Device Not Receiving Notifications

1. Check device is registered in DynamoDB
2. Verify SNS endpoint is enabled
3. Check CloudWatch logs for errors
4. Verify APNS/FCM credentials are correct

### Registration Fails

1. Check Lambda logs for errors
2. Verify API Gateway endpoint is correct
3. Check network connectivity
4. Verify FCM token is valid

### iOS Specific

- Ensure APNS certificate is not expired
- Check provisioning profile includes Push Notifications
- Verify app is using correct bundle ID

### Android Specific

- Verify `google-services.json` is correct
- Check FCM server key is valid
- Ensure app has notification permissions

## Cost Estimation

- **DynamoDB**: ~$0.25/month per 1000 devices (on-demand pricing)
- **Lambda**: ~$0.20 per 1 million requests
- **SNS**: ~$0.50 per 1 million notifications
- **API Gateway**: ~$3.50 per 1 million requests

**Total**: ~$5/month for 10,000 active devices with 100,000 notifications/month

## Security

- API Gateway should be secured with API keys or Cognito
- Lambda functions use least-privilege IAM roles
- Device tokens are encrypted at rest in DynamoDB
- SNS endpoints are validated before sending

## Next Steps

1. ✅ Deploy AWS infrastructure
2. ⏳ Configure APNS certificates
3. ⏳ Configure FCM server key
4. ⏳ Install mobile app dependencies
5. ⏳ Test device registration
6. ⏳ Test notification sending
7. ⏳ Add API authentication
8. ⏳ Set up monitoring alerts

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review this documentation
3. Check AWS SNS/Lambda documentation
4. Contact development team
