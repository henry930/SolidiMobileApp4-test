#!/bin/bash

# Test notification script for AWS Lambda
# This sends a push notification to specified user(s)

API_ENDPOINT="https://u4o3rayvl6.execute-api.us-east-1.amazonaws.com/dev/send"

# Get userId from command line or use default
USER_ID="${1:-user@example.com}"

echo "📤 Sending test notification to userId: $USER_ID"
echo "🔗 API Endpoint: $API_ENDPOINT"
echo ""

# Send notification
curl -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"userIds\": [\"$USER_ID\"],
    \"title\": \"Test Notification\",
    \"body\": \"This is a test notification from AWS Lambda! 🎉\",
    \"data\": {
      \"type\": \"test\",
      \"timestamp\": $(date +%s)
    }
  }" | jq '.'

echo ""
echo "✅ Request sent!"
