# Push Notification System - File Structure

Complete overview of all files created for the push notification system.

## Directory Structure

```
SolidiMobileApp4/
│
├── lambda/                                    # AWS Lambda Functions
│   ├── register-device/
│   │   ├── index.js                          # Device registration Lambda
│   │   └── package.json
│   └── send-notification/
│       ├── index.js                          # Notification sending Lambda
│       └── package.json
│
├── infrastructure/                            # Infrastructure as Code
│   └── cloudformation-template.yaml          # Complete AWS stack definition
│
├── scripts/                                   # Automation Scripts
│   ├── deploy-push-notifications.sh          # Deploy AWS infrastructure
│   ├── install-push-notifications.sh         # Install mobile dependencies
│   └── test-push-notifications.sh            # Test the system
│
├── src/
│   └── services/
│       └── PushNotificationService.js        # Mobile app service
│
├── docs/                                      # Documentation
│   ├── PUSH_NOTIFICATIONS_QUICK_START.md     # Quick start guide
│   ├── PUSH_NOTIFICATIONS_IOS_SETUP.md       # iOS setup instructions
│   ├── PUSH_NOTIFICATIONS_ANDROID_SETUP.md   # Android setup instructions
│   ├── PUSH_NOTIFICATIONS_APP_INTEGRATION.md # App integration examples
│   └── PUSH_NOTIFICATIONS_FILE_STRUCTURE.md  # This file
│
├── PUSH_NOTIFICATIONS_README.md              # Main documentation
└── package.json                               # Updated with dependencies
```

## File Descriptions

### Backend (AWS)

#### `lambda/register-device/index.js`
- **Purpose**: Register device tokens for push notifications
- **Functionality**:
  - Validates input (userId, deviceId, platform, token)
  - Creates or updates SNS platform endpoints
  - Stores device information in DynamoDB
  - Handles both iOS (APNS) and Android (FCM)
  - Returns endpoint ARN on success
- **Environment Variables**:
  - `DEVICE_TOKENS_TABLE`: DynamoDB table name
  - `APNS_PLATFORM_ARN`: iOS platform application ARN
  - `FCM_PLATFORM_ARN`: Android platform application ARN

#### `lambda/send-notification/index.js`
- **Purpose**: Send push notifications to users
- **Functionality**:
  - Accepts array of user IDs and notification content
  - Queries DynamoDB for user devices
  - Formats platform-specific messages (APNS/FCM)
  - Publishes to SNS for delivery
  - Handles failed deliveries
  - Marks inactive devices
  - Returns detailed delivery results
- **Environment Variables**:
  - `DEVICE_TOKENS_TABLE`: DynamoDB table name

#### `infrastructure/cloudformation-template.yaml`
- **Purpose**: Define all AWS resources
- **Resources Created**:
  - DynamoDB table: `{env}-device-tokens`
  - SNS platform applications (iOS & Android)
  - Lambda functions with IAM roles
  - API Gateway with REST endpoints
  - Lambda permissions for API Gateway
- **Parameters**:
  - `Environment`: dev/staging/prod
  - `APNSCertificateArn`: iOS certificate ARN
  - `FCMServerKey`: Android server key
- **Outputs**:
  - API Gateway endpoint URL
  - Lambda function ARNs
  - DynamoDB table name
  - SNS platform ARNs

### Mobile App

#### `src/services/PushNotificationService.js`
- **Purpose**: Handle all push notification logic in React Native
- **Features**:
  - Request notification permissions
  - Get FCM token
  - Register device with backend
  - Handle foreground notifications
  - Handle background notifications
  - Handle notification opened events
  - Token refresh handling
  - Badge management (iOS)
  - Notification channels (Android)
  - Unregister on logout
- **Dependencies**:
  - `@react-native-firebase/messaging`
  - `@notifee/react-native`
  - `react-native-device-info`
  - `@react-native-async-storage/async-storage`
- **Configuration**:
  - `API_BASE_URL`: API Gateway endpoint

### Scripts

#### `scripts/deploy-push-notifications.sh`
- **Purpose**: Automated AWS deployment
- **Actions**:
  1. Validates AWS credentials
  2. Packages Lambda functions
  3. Deploys CloudFormation stack
  4. Updates Lambda function code
  5. Displays deployment information
  6. Saves configuration to `.push-notification-config.json`
- **Usage**: `./scripts/deploy-push-notifications.sh [env] [region]`
- **Example**: `./scripts/deploy-push-notifications.sh dev us-east-1`

#### `scripts/install-push-notifications.sh`
- **Purpose**: Install mobile app dependencies
- **Actions**:
  1. Installs npm packages
  2. Runs `pod install` for iOS
  3. Displays next steps for platform configuration
- **Usage**: `./scripts/install-push-notifications.sh`

#### `scripts/test-push-notifications.sh`
- **Purpose**: Test the push notification system
- **Tests**:
  1. Device registration API
  2. Notification sending API
  3. DynamoDB storage verification
- **Usage**: `./scripts/test-push-notifications.sh [api-endpoint] [user-id]`
- **Example**: `./scripts/test-push-notifications.sh https://abc.execute-api.us-east-1.amazonaws.com/dev user-123`

### Documentation

#### `PUSH_NOTIFICATIONS_README.md`
- Complete system documentation
- Architecture overview
- Setup instructions
- API reference
- Testing guide
- Troubleshooting
- Cost estimation
- Security considerations

#### `docs/PUSH_NOTIFICATIONS_QUICK_START.md`
- 5-step quick start guide
- Minimal setup instructions
- Common commands
- Quick troubleshooting

#### `docs/PUSH_NOTIFICATIONS_IOS_SETUP.md`
- iOS-specific setup
- APNS certificate generation
- Xcode configuration
- Firebase setup
- Testing on device

#### `docs/PUSH_NOTIFICATIONS_ANDROID_SETUP.md`
- Android-specific setup
- FCM configuration
- Gradle file updates
- AndroidManifest changes
- Notification channels

#### `docs/PUSH_NOTIFICATIONS_APP_INTEGRATION.md`
- Example integration code
- App.js modifications
- Login/logout handling
- Notification handling examples

## Configuration Files

### `.push-notification-config.json` (Generated)
Created by deployment script, contains:
```json
{
  "environment": "dev",
  "region": "us-east-1",
  "apiEndpoint": "https://...",
  "registerFunction": "arn:aws:lambda:...",
  "sendFunction": "arn:aws:lambda:..."
}
```

### `package.json` (Modified)
Added dependencies:
- `@react-native-firebase/app`: ^18.7.3
- `@react-native-firebase/messaging`: ^18.7.3
- `@notifee/react-native`: ^7.8.2
- `react-native-device-info`: ^10.13.1

## Platform-Specific Files (To Be Added)

### iOS
- `ios/SolidiMobileApp4/GoogleService-Info.plist` - Firebase config
- APNS certificate (.p12 or .pem) - For AWS SNS

### Android
- `android/app/google-services.json` - Firebase config
- FCM server key - For AWS SNS

## AWS Resources Created

### DynamoDB
- Table: `{env}-device-tokens`
- Partition Key: `userId` (String)
- Sort Key: `deviceId` (String)
- GSI: `endpointArn-index`

### Lambda Functions
- `{env}-register-device`
- `{env}-send-notification`

### API Gateway
- API: `{env}-push-notification-api`
- Endpoints:
  - `POST /register`
  - `POST /send`

### SNS
- Platform Application (iOS): `{env}-solidi-ios`
- Platform Application (Android): `{env}-solidi-android`

### IAM
- Role: `{env}-push-notification-lambda-role`
- Policies: DynamoDB access, SNS access

## Total Files Created

- **Backend**: 5 files
- **Mobile**: 1 file
- **Scripts**: 3 files
- **Documentation**: 6 files
- **Modified**: 1 file (package.json)

**Total**: 16 files

## Dependencies Added

- **npm packages**: 4
- **iOS CocoaPods**: 2 (Firebase/Core, Firebase/Messaging)
- **Android Gradle**: 2 (Firebase BOM, Firebase Messaging)

## Next Steps

1. ✅ All files created
2. ⏳ Run `./scripts/install-push-notifications.sh`
3. ⏳ Run `./scripts/deploy-push-notifications.sh dev us-east-1`
4. ⏳ Configure Firebase (iOS & Android)
5. ⏳ Configure AWS SNS (APNS & FCM)
6. ⏳ Update API endpoint in PushNotificationService.js
7. ⏳ Test with `./scripts/test-push-notifications.sh`
8. ⏳ Integrate in app (see PUSH_NOTIFICATIONS_APP_INTEGRATION.md)

---

**Status**: All infrastructure code complete ✅
