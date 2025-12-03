# Setting up FCM for Android Push Notifications (HTTP v1 API)

## Problem
The Android device registration is failing with a 500 error because the `FCM_PLATFORM_ARN` environment variable is not set in the Lambda function. The legacy Cloud Messaging API cannot be enabled.

## Solution: Use Firebase HTTP v1 API

Firebase has deprecated the legacy Server Key API. We'll use the new HTTP v1 API with a service account instead.

### Step 1: Get Firebase Service Account JSON

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **SolidiMobileApp4**
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file (e.g., `firebase-service-account.json`)

### Step 2: Create SNS Platform Application for FCM (HTTP v1)

AWS SNS now supports FCM HTTP v1 API. You need to create the platform application manually:

```bash
# First, extract the service account JSON content
# Replace with your actual service account JSON file path
SERVICE_ACCOUNT_JSON=$(cat ~/Downloads/firebase-service-account.json)

# Create SNS Platform Application for FCM HTTP v1
aws sns create-platform-application \
  --name dev-solidi-android \
  --platform GCM \
  --attributes \
    PlatformCredential="$SERVICE_ACCOUNT_JSON"

# This will output the Platform Application ARN - save it!
# Example: arn:aws:sns:us-east-1:123456789012:app/GCM/dev-solidi-android
```

### Step 3: Update Lambda Environment Variables

Update the `dev-register-device` Lambda function with the FCM Platform ARN:

```bash
# Replace with the ARN from Step 2
FCM_PLATFORM_ARN="arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:app/GCM/dev-solidi-android"

aws lambda update-function-configuration \
  --function-name dev-register-device \
  --environment "Variables={
    DEVICE_TOKENS_TABLE=dev-device-tokens,
    APNS_PLATFORM_ARN=YOUR_APNS_ARN,
    FCM_PLATFORM_ARN=$FCM_PLATFORM_ARN,
    ENVIRONMENT=dev
  }"
```

### Step 4: Verify Lambda Configuration

Check that the environment variable is set:

```bash
aws lambda get-function-configuration \
  --function-name dev-register-device \
  --query 'Environment.Variables'
```

You should see:
```json
{
  "DEVICE_TOKENS_TABLE": "dev-device-tokens",
  "FCM_PLATFORM_ARN": "arn:aws:sns:us-east-1:...:app/GCM/dev-solidi-android",
  "APNS_PLATFORM_ARN": "...",
  "ENVIRONMENT": "dev"
}
```

### Step 5: Test Registration

1. **Restart your Android app**
2. **Complete biometric authentication**
3. **Check logs:**

```bash
adb logcat -d | grep -E "✅ Android device registered|📤 Registering Android"
```

You should see:
```
✅ Android device registered successfully
```

### Step 6: Send Test Notification

```bash
cd /Users/henry/Solidi/SolidiMobileApp4
./send-test-notification.sh henry930@gmail.com
```

You should see the custom notification banner slide down! 🎉

---

## Alternative: Use AWS Console (Easier)

If you prefer using the AWS Console:

### 1. Create SNS Platform Application

1. Go to [AWS SNS Console](https://console.aws.amazon.com/sns/)
2. Click **Mobile** → **Push notifications** → **Create platform application**
3. Fill in:
   - **Application name:** `dev-solidi-android`
   - **Push notification platform:** Google Firebase Cloud Messaging (FCM)
   - **API key:** Paste your Firebase service account JSON
4. Click **Create platform application**
5. **Copy the ARN** (e.g., `arn:aws:sns:us-east-1:123456789012:app/GCM/dev-solidi-android`)

### 2. Update Lambda Environment Variable

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
2. Find function: `dev-register-device`
3. Go to **Configuration** → **Environment variables**
4. Click **Edit**
5. Add or update: `FCM_PLATFORM_ARN` = `<ARN from step 1>`
6. Click **Save**

### 3. Test

Restart your Android app and complete biometric auth. The device should register successfully!

---

## Troubleshooting

**If you still get a 500 error:**

Check Lambda logs:
```bash
aws logs tail /aws/lambda/dev-register-device --follow
```

**Common issues:**
- Service account JSON is malformed
- Wrong permissions on service account
- FCM API not enabled in Google Cloud Console

**Enable FCM API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Library**
4. Search for "Firebase Cloud Messaging API"
5. Click **Enable**
