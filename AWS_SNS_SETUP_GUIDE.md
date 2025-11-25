# AWS SNS Push Notifications Setup Guide (No Firebase!)

## ✅ What You Have
- Apple Developer Account
- AWS CLI credentials  
- iPhone device
- **NO Firebase needed!**

## 🚀 Complete Setup (30 minutes)

### Step 1: Create APNS Certificate (15 minutes)

#### 1.1 Create App ID
1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Certificates, Identifiers & Profiles → Identifiers → "+"
3. Select "App IDs" → Continue
4. **Description**: `Solidi Mobile App`
5. **Bundle ID**: `co.solidi.mobile.test` (Explicit)
6. **Capabilities**: Check "Push Notifications"
7. Continue → Register

#### 1.2 Create APNS Certificate
1. Select your App ID → Configure Push Notifications
2. Development SSL Certificate → "Create Certificate"
3. Create CSR (Certificate Signing Request):
   ```bash
   # Open Keychain Access
   # Menu: Keychain Access → Certificate Assistant → Request Certificate from CA
   # Email: your@email.com
   # Common Name: Solidi APNS Dev
   # Save to disk: ~/Desktop/CertificateSigningRequest.certSigningRequest
   ```
4. Upload CSR → Download certificate (`aps_development.cer`)
5. Double-click `aps_development.cer` to install in Keychain

#### 1.3 Export as .p12
1. Open Keychain Access
2. Find "Apple Development iOS Push Services: co.solidi.mobile.test"
3. Right-click → Export "Apple Development iOS Push Services..."
4. Save as: `~/Desktop/apns_dev_cert.p12`
5. **Password**: (create a password, remember it!)
6. Save

---

### Step 2: AWS SNS Setup (5 minutes)

#### 2.1 Create Platform Application

```bash
# Navigate to project
cd /Users/henry/Solidi/SolidiMobileApp4

# Create SNS platform application for iOS
aws sns create-platform-application \
  --name solidi-mobile-apns-dev \
  --platform APNS_SANDBOX \
  --attributes \
    PlatformCredential="$(cat ~/Desktop/apns_dev_cert.p12 | base64)" \
  --region us-east-1

# SAVE THE ARN - you'll need it!
# Example: arn:aws:sns:us-east-1:123456789:app/APNS_SANDBOX/solidi-mobile-apns-dev
```

#### 2.2 Update CloudFormation Template

Edit `infrastructure/cloudformation-template.yaml`:

```yaml
Parameters:
  APNSPlatformArn:
    Type: String
    Default: "YOUR_ARN_FROM_STEP_2.1_HERE"
    Description: APNS Platform Application ARN
```

---

### Step 3: Deploy AWS Infrastructure (5 minutes)

```bash
# Make script executable
chmod +x scripts/deploy-push-notifications.sh

# Deploy to dev environment
./scripts/deploy-push-notifications.sh dev us-east-1

# Wait for deployment (2-3 minutes)
# Stack will create: Lambda functions, DynamoDB table, API Gateway
```

#### Get API Endpoint

```bash
# Get your API Gateway URL
aws cloudformation describe-stacks \
  --stack-name dev-push-notification-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text

# Example output: https://abc123.execute-api.us-east-1.amazonaws.com/dev
```

---

### Step 4: Update Mobile App (2 minutes)

#### 4.1 Update API URL

Edit `src/services/PushNotificationService.js`:

```javascript
// Line 9 - Replace with your API Gateway URL
const API_BASE_URL = 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev';
```

#### 4.2 Rebuild App

```bash
# Install pods
cd ios && pod install && cd ..

# Build and run on device
npx react-native run-ios --device "iPhone"
```

---

### Step 5: Test! (3 minutes)

#### 5.1 Check Device Registration

1. Open app on iPhone
2. Allow notifications when prompted
3. Check Metro logs for:
   ```
   📱 Device token received: <your-device-token>
   ✅ Device registered successfully
   ```

#### 5.2 Send Test Notification

```bash
# Get your API URL from Step 3
API_URL="https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev"

# Get device token from Metro logs (Step 5.1)
DEVICE_TOKEN="your-device-token-here"

# Send test notification
curl -X POST "$API_URL/send" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceTokens": ["'$DEVICE_TOKEN'"],
    "notification": {
      "title": "Test from AWS SNS!",
      "body": "100% AWS - No Firebase! 🎉"
    },
    "data": {
      "screen": "Home"
    }
  }'
```

#### 5.3 Verify

- ✅ Notification appears on iPhone
- ✅ Tap bell icon → see in inbox
- ✅ Badge count updates

---

## 🎯 Architecture (100% AWS)

```
Your Backend
    ↓
AWS Lambda
    ↓
AWS SNS
    ↓
Apple APNS
    ↓
Your iPhone (Native iOS)
    ↓
React Native App
```

**No Firebase. No Google. Pure AWS + Apple!**

---

## 📊 Monitoring

### View Lambda Logs
```bash
aws logs tail /aws/lambda/dev-register-device-function --follow
aws logs tail /aws/lambda/dev-send-notification-function --follow
```

### Check Registered Devices
```bash
aws dynamodb scan \
  --table-name dev-device-tokens \
  --region us-east-1
```

### SNS Metrics
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/SNS \
  --metric-name NumberOfNotificationsDelivered \
  --dimensions Name=Application,Value=solidi-mobile-apns-dev \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## 🔧 Troubleshooting

### "Device token not received"
- Check notification permissions are granted
- Verify app is built for device (not simulator)
- Check Xcode signing & capabilities

### "Registration failed"
- Verify API_BASE_URL is correct
- Check AWS Lambda logs
- Ensure internet connection

### "Notification not delivered"
- Verify APNS certificate is valid
- Check device token is correct
- Use APNS_SANDBOX for development

---

## ✅ Success Checklist

- [ ] APNS certificate created and exported
- [ ] AWS SNS platform application created
- [ ] CloudFormation stack deployed
- [ ] API Gateway URL obtained
- [ ] Mobile app updated with API URL
- [ ] App rebuilt and installed on device
- [ ] Device token received
- [ ] Device registered in DynamoDB
- [ ] Test notification sent
- [ ] Notification received on device
- [ ] Notification appears in inbox

---

## 🚀 Production Deployment

For production, repeat with:
- Production APNS certificate (not sandbox)
- `APNS` platform (not `APNS_SANDBOX`)
- Production environment: `./scripts/deploy-push-notifications.sh prod us-east-1`

---

## 💰 Cost Estimate

- **AWS SNS**: $0.50 per million notifications
- **AWS Lambda**: Free tier covers most usage
- **DynamoDB**: Free tier covers most usage
- **API Gateway**: $3.50 per million requests

**Estimated monthly cost for 10,000 notifications: < $1**

---

## 📚 What We Removed

- ❌ Firebase SDK
- ❌ Firebase Cloud Messaging
- ❌ Google dependencies
- ❌ Notifee library

## ✅ What We're Using

- ✅ Native iOS Push Notifications
- ✅ AWS SNS
- ✅ AWS Lambda
- ✅ AWS DynamoDB
- ✅ AWS API Gateway
- ✅ Apple APNS

**100% AWS + Apple. Single provider. Easy to manage!**
