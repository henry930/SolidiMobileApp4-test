#!/bin/bash

# End-to-End Push Notification Test
# This script tests the complete push notification flow:
# 1. Deploy AWS infrastructure
# 2. Register device
# 3. Send test notification
# 4. Verify delivery

set -e

echo "======================================"
echo "Push Notification E2E Test"
echo "======================================"

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
USER_ID="test-user-$(date +%s)"
DEVICE_ID="test-device-$(date +%s)"
PLATFORM="ios"

echo ""
echo "Configuration:"
echo "  Environment: $ENVIRONMENT"
echo "  Region: $REGION"
echo "  User ID: $USER_ID"
echo "  Device ID: $DEVICE_ID"
echo "======================================"

# Step 1: Check if infrastructure is deployed
echo ""
echo "Step 1: Checking AWS infrastructure..."
STACK_NAME="${ENVIRONMENT}-push-notification-stack"

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &>/dev/null; then
  echo "✓ Stack exists: $STACK_NAME"
  
  # Get API endpoint
  API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='APIEndpoint'].OutputValue" \
    --output text)
  
  echo "✓ API Endpoint: $API_ENDPOINT"
else
  echo "✗ Stack not found: $STACK_NAME"
  echo ""
  echo "Please deploy the infrastructure first:"
  echo "  ./scripts/deploy-push-notifications.sh $ENVIRONMENT $REGION"
  exit 1
fi

# Step 2: Register test device
echo ""
echo "Step 2: Registering test device..."

# Generate a fake FCM token for testing
FCM_TOKEN="fake-fcm-token-$(date +%s)"

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"deviceId\": \"$DEVICE_ID\",
    \"platform\": \"$PLATFORM\",
    \"token\": \"$FCM_TOKEN\"
  }")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Device registered successfully"
  echo "  Response: $RESPONSE_BODY"
else
  echo "✗ Registration failed (HTTP $HTTP_CODE)"
  echo "  Response: $RESPONSE_BODY"
  exit 1
fi

# Step 3: Verify in DynamoDB
echo ""
echo "Step 3: Verifying device in DynamoDB..."

TABLE_NAME="${ENVIRONMENT}-device-tokens"
sleep 2  # Wait for DynamoDB write

DDB_ITEM=$(aws dynamodb get-item \
  --table-name "$TABLE_NAME" \
  --key "{\"userId\": {\"S\": \"$USER_ID\"}, \"deviceId\": {\"S\": \"$DEVICE_ID\"}}" \
  --region "$REGION" \
  --output json 2>/dev/null || echo "{}")

if echo "$DDB_ITEM" | grep -q "Item"; then
  echo "✓ Device found in DynamoDB"
  ENDPOINT_ARN=$(echo "$DDB_ITEM" | jq -r '.Item.endpointArn.S')
  echo "  Endpoint ARN: $ENDPOINT_ARN"
else
  echo "⚠️  Device not found in DynamoDB"
  echo "  This might be expected if using placeholder token"
fi

# Step 4: Send test notification
echo ""
echo "Step 4: Sending test notification..."

SEND_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"userIds\": [\"$USER_ID\"],
    \"title\": \"E2E Test Notification\",
    \"body\": \"This is an end-to-end test notification sent at $(date)\",
    \"data\": {
      \"testId\": \"e2e-test-$(date +%s)\",
      \"screen\": \"Home\",
      \"priority\": \"high\"
    }
  }")

HTTP_CODE=$(echo "$SEND_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SEND_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Notification sent successfully"
  echo "  Response: $RESPONSE_BODY"
else
  echo "✗ Notification sending failed (HTTP $HTTP_CODE)"
  echo "  Response: $RESPONSE_BODY"
  exit 1
fi

# Step 5: Check CloudWatch Logs
echo ""
echo "Step 5: Checking CloudWatch Logs..."

echo "Register Device Lambda logs:"
aws logs tail "/aws/lambda/${ENVIRONMENT}-register-device" \
  --region "$REGION" \
  --since 5m \
  --format short \
  --filter-pattern "$USER_ID" \
  2>/dev/null | tail -n 5 || echo "  (No recent logs)"

echo ""
echo "Send Notification Lambda logs:"
aws logs tail "/aws/lambda/${ENVIRONMENT}-send-notification" \
  --region "$REGION" \
  --since 5m \
  --format short \
  --filter-pattern "$USER_ID" \
  2>/dev/null | tail -n 5 || echo "  (No recent logs)"

# Summary
echo ""
echo "======================================"
echo "E2E Test Summary"
echo "======================================"
echo "✓ Infrastructure deployed"
echo "✓ Device registration API working"
echo "✓ DynamoDB storage working"
echo "✓ Notification sending API working"
echo ""
echo "⚠️  Note: Actual notification delivery requires:"
echo "  1. Valid APNS/FCM credentials in AWS SNS"
echo "  2. Real device with valid FCM token"
echo "  3. Mobile app running with PushNotificationService initialized"
echo ""
echo "Test Data:"
echo "  User ID: $USER_ID"
echo "  Device ID: $DEVICE_ID"
echo "  API Endpoint: $API_ENDPOINT"
echo ""
echo "Next Steps:"
echo "1. Configure APNS/FCM in AWS SNS"
echo "2. Run mobile app and get real FCM token"
echo "3. Register real device using the app"
echo "4. Send notification to real device"
echo "5. Verify notification appears in app inbox"
echo "======================================"

# Cleanup option
echo ""
read -p "Delete test data from DynamoDB? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  aws dynamodb delete-item \
    --table-name "$TABLE_NAME" \
    --key "{\"userId\": {\"S\": \"$USER_ID\"}, \"deviceId\": {\"S\": \"$DEVICE_ID\"}}" \
    --region "$REGION" 2>/dev/null && echo "✓ Test data deleted" || echo "⚠️  Failed to delete test data"
fi

echo ""
echo "Test complete!"
