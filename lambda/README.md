# Solidi Push Notification API

This Lambda-based API provides push notification functionality with persistent storage for the Solidi mobile app.

## Architecture

The API consists of 3 Lambda functions backed by DynamoDB:

1. **Register Device** - Registers user devices with SNS and stores device info
2. **Send Notification** - Sends push notifications and saves them to DynamoDB
3. **Get Notifications** - Retrieves notification history for a user

## DynamoDB Tables

### solidi-devices
- **Primary Key**: userId (HASH), deviceId (RANGE)
- **Purpose**: Store device registration info (FCM tokens, SNS endpoint ARNs)
- **TTL**: Not enabled (devices remain until explicitly removed)

### solidi-notifications
- **Primary Key**: userId (HASH), timestamp (RANGE)
- **Purpose**: Store all sent notifications for retrieval
- **TTL**: Enabled (notifications auto-deleted after 90 days)
- **Attributes**:
  - `notificationId`: Unique notification ID
  - `title`: Notification title
  - `body`: Notification body
  - `data`: Custom data object
  - `read`: Boolean - has user read notification
  - `sent`: Boolean - was notification sent successfully
  - `sentAt`: Timestamp when notification was sent
  - `ttl`: Unix timestamp for auto-deletion (90 days)

## API Endpoints

### 1. Register Device
```
POST /register
```

**Request Body:**
```json
{
  "userId": "user@example.com",
  "deviceId": "unique-device-id",
  "platform": "ios|android",
  "token": "fcm-or-apns-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "endpointArn": "arn:aws:sns:..."
}
```

### 2. Send Notification
```
POST /send
```

**Request Body:**
```json
{
  "userIds": ["user1@example.com", "user2@example.com"],
  "title": "Notification Title",
  "body": "Notification message",
  "data": {
    "type": "transaction",
    "amount": "100.00"
  }
}
```

**Response:**
```json
{
  "success": true,
  "notificationId": "notif_1234567890_abc123",
  "summary": {
    "totalUsers": 2,
    "successfulUsers": 2,
    "failedUsers": 0
  },
  "results": [
    {
      "userId": "user1@example.com",
      "success": true,
      "notificationId": "notif_1234567890_abc123",
      "devices": [
        {
          "deviceId": "device-1",
          "platform": "ios",
          "success": true
        }
      ]
    }
  ]
}
```

### 3. Get Notifications
```
GET /notifications?userId=user@example.com&limit=50&lastKey=1234567890
```

**Query Parameters:**
- `userId` (required): User identifier
- `limit` (optional): Number of notifications to return (default: 50, max: 100)
- `lastKey` (optional): Pagination token from previous response

**Response:**
```json
{
  "success": true,
  "count": 25,
  "hasMore": true,
  "lastKey": "1234567890",
  "notifications": [
    {
      "id": "notif_1234567890_abc123",
      "title": "Notification Title",
      "body": "Notification message",
      "data": {
        "type": "transaction",
        "amount": "100.00"
      },
      "timestamp": 1234567890000,
      "read": false
    }
  ]
}
```

## Deployment

### Prerequisites
1. Install AWS SAM CLI: `brew install aws-sam-cli`
2. Configure AWS CLI: `aws configure`
3. Create SNS Platform Applications for iOS and Android

### Deploy

```bash
cd lambda
./deploy.sh
```

The script will:
1. Create S3 bucket for deployment artifacts
2. Install npm dependencies for each Lambda
3. Build and deploy using AWS SAM
4. Create DynamoDB tables
5. Output the API endpoint URL

### Manual Deployment

```bash
# Build
sam build --template lambda/template.yaml

# Deploy
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name solidi-push-notification-api \
  --s3-bucket your-deployment-bucket \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
      Environment=dev \
      PlatformApplicationArnIOS=arn:aws:sns:... \
      PlatformApplicationArnAndroid=arn:aws:sns:...
```

## Testing

### Send Test Notification
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev/send \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["henry930@gmail.com"],
    "title": "Test Notification",
    "body": "This is a test!",
    "data": {
      "type": "test"
    }
  }'
```

### Get Notifications
```bash
curl "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev/notifications?userId=henry930@gmail.com&limit=10"
```

## Mobile App Integration

### PushNotificationService.js

Update the API URL:
```javascript
const API_BASE_URL = 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev';
```

### Get Notifications
```javascript
const response = await fetch(`${API_BASE_URL}/notifications?userId=${userId}&limit=50`);
const data = await response.json();

if (data.success) {
  console.log('Notifications:', data.notifications);
  
  // Pagination
  if (data.hasMore) {
    const nextResponse = await fetch(
      `${API_BASE_URL}/notifications?userId=${userId}&limit=50&lastKey=${data.lastKey}`
    );
  }
}
```

## Cost Estimate

Based on moderate usage (1000 users, 10 notifications/day):
- DynamoDB: ~$1-2/month (PAY_PER_REQUEST)
- Lambda: ~$0.20-0.50/month (1M requests free tier)
- SNS: $0.50/million notifications
- API Gateway: ~$3.50/million requests

**Estimated total: $2-5/month**

## Monitoring

### CloudWatch Metrics
- Lambda invocation count and duration
- DynamoDB read/write capacity units
- SNS delivery success/failure

### CloudWatch Logs
Each Lambda function creates log groups:
- `/aws/lambda/solidi-register-device-dev`
- `/aws/lambda/solidi-send-notification-dev`
- `/aws/lambda/solidi-get-notifications-dev`

## Security

- **CORS**: Enabled for all origins (configure for production)
- **Authentication**: Add API Gateway authorizer for production
- **Encryption**: DynamoDB encryption at rest enabled by default
- **IAM**: Least privilege roles for Lambda functions

## Troubleshooting

### Notifications not appearing in DynamoDB
- Check Lambda logs in CloudWatch
- Verify DynamoDB table name matches environment variable
- Check IAM permissions for Lambda role

### Notifications not delivered to devices
- Verify SNS endpoint ARN is valid
- Check device token is current
- Review SNS delivery logs

### API Gateway errors
- Check CORS configuration
- Verify Lambda function timeout (increase if needed)
- Review API Gateway logs

## Next Steps

1. Add mark-as-read endpoint
2. Add delete notification endpoint
3. Implement notification badge count
4. Add notification categories/filters
5. Set up CloudWatch alarms for errors
6. Implement API authentication
7. Add notification templates
8. Implement scheduled notifications
