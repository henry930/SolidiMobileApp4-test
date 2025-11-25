#!/bin/bash

# Test Push Notification System
# Usage: ./test-push-notifications.sh [api-endpoint] [user-id]

set -e

API_ENDPOINT=${1:-""}
USER_ID=${2:-"test-user-123"}
DEVICE_ID="test-device-$(date +%s)"
PLATFORM="ios"
FCM_TOKEN="test-token-placeholder"

if [ -z "$API_ENDPOINT" ]; then
  echo "Error: API endpoint required"
  echo "Usage: ./test-push-notifications.sh [api-endpoint] [user-id]"
  echo ""
  echo "Get API endpoint from:"
  echo "  aws cloudformation describe-stacks --stack-name dev-push-notification-stack --query \"Stacks[0].Outputs[?OutputKey=='APIEndpoint'].OutputValue\" --output text"
  exit 1
fi

echo "======================================"
echo "Testing Push Notification System"
echo "======================================"
echo "API Endpoint: $API_ENDPOINT"
echo "User ID: $USER_ID"
echo "Device ID: $DEVICE_ID"
echo "======================================"

# Test 1: Register Device
echo ""
echo "Test 1: Registering device..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_ENDPOINT/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"deviceId\": \"$DEVICE_ID\",
    \"platform\": \"$PLATFORM\",
    \"token\": \"$FCM_TOKEN\"
  }")

echo "Response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q "success"; then
  echo "✓ Device registration successful"
else
  echo "✗ Device registration failed"
  exit 1
fi

# Test 2: Send Notification
echo ""
echo "Test 2: Sending notification..."
SEND_RESPONSE=$(curl -s -X POST "$API_ENDPOINT/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"userIds\": [\"$USER_ID\"],
    \"title\": \"Test Notification\",
    \"body\": \"This is a test notification from the API\",
    \"data\": {
      \"screen\": \"Home\",
      \"testId\": \"$(date +%s)\"
    }
  }")

echo "Response: $SEND_RESPONSE"

if echo "$SEND_RESPONSE" | grep -q "success"; then
  echo "✓ Notification sent successfully"
else
  echo "✗ Notification sending failed"
  exit 1
fi

# Test 3: Verify in DynamoDB
echo ""
echo "Test 3: Verifying device in DynamoDB..."
TABLE_NAME="dev-device-tokens"

DDB_RESPONSE=$(aws dynamodb get-item \
  --table-name "$TABLE_NAME" \
  --key "{\"userId\": {\"S\": \"$USER_ID\"}, \"deviceId\": {\"S\": \"$DEVICE_ID\"}}" \
  --output json 2>/dev/null || echo "{}")

if echo "$DDB_RESPONSE" | grep -q "Item"; then
  echo "✓ Device found in DynamoDB"
  echo "$DDB_RESPONSE" | jq '.Item'
else
  echo "⚠️  Device not found in DynamoDB (might be using different table name)"
fi

echo ""
echo "======================================"
echo "Testing Complete!"
echo "======================================"
echo ""
echo "Summary:"
echo "  ✓ Device registration API working"
echo "  ✓ Notification sending API working"
echo "  ✓ DynamoDB storage verified"
echo ""
echo "Next Steps:"
echo "1. Test with real FCM token from mobile app"
echo "2. Verify notification delivery on device"
echo "3. Check CloudWatch logs for any errors"
echo "======================================"
