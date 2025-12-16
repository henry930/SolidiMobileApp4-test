#!/bin/bash

# Test notification script for AWS Lambda
# This sends a push notification to specified user(s)

API_ENDPOINT="https://u4o3rayvl6.execute-api.us-east-1.amazonaws.com/dev/send"

# If no userId provided, get the most recent from DynamoDB
if [ -z "$1" ]; then
    echo "🔍 No userId provided, checking DynamoDB for recent registrations..."
    RECENT_USERS=$(aws dynamodb scan \
        --table-name solidi-devices-dev \
        --region us-east-1 \
        --limit 10 \
        --output json | jq -r '.Items[] | select(.active.BOOL == true) | .userId.S' | sort -u)
    
    echo ""
    echo "📱 Active users:"
    echo "$RECENT_USERS" | nl
    echo ""
    
    # Use the first one
    USER_ID=$(echo "$RECENT_USERS" | head -1)
    echo "Using first user: $USER_ID"
else
    USER_ID="$1"
fi

echo ""
echo "📤 Sending test notification to userId: $USER_ID"
echo "🔗 API Endpoint: $API_ENDPOINT"
echo ""
echo "⚠️  NOTE: iOS Simulator CANNOT receive push notifications!"
echo "   This will only work on a physical iOS device."
echo "   You can verify the notification was sent by checking CloudWatch logs."
echo ""

# Send notification
RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"userIds\": [\"$USER_ID\"],
    \"title\": \"Test Notification 🔔\",
    \"body\": \"Hello from Solidi! This is a test notification sent at $(date '+%H:%M:%S')\",
    \"data\": {
      \"type\": \"test\",
      \"timestamp\": $(date +%s),
      \"source\": \"manual_test\"
    }
  }")

echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo ""
    echo "✅ Notification sent successfully!"
    echo ""
    echo "To verify:"
    echo "  1. Check CloudWatch logs: aws logs tail /aws/lambda/solidi-send-notification-dev --follow"
    echo "  2. Check DynamoDB: aws dynamodb query --table-name solidi-notifications-dev --key-condition-expression 'userId = :uid' --expression-attribute-values '{\":uid\":{\"S\":\"$USER_ID\"}}' --region us-east-1"
else
    echo ""
    echo "❌ Failed to send notification"
fi

echo ""
