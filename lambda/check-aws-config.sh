#!/bin/bash

# Check AWS Configuration for Push Notifications
# This script helps diagnose the 500 error by checking if SNS Platform Applications are configured

set -e

STACK_NAME="solidi-push-notification-api"
REGION="us-east-1"

echo "🔍 Checking AWS Push Notification Configuration"
echo "=============================================="
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured"
    echo "📥 Run: aws configure"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# Check SNS Platform Applications
echo "📱 Checking SNS Platform Applications..."
echo ""

PLATFORM_APPS=$(aws sns list-platform-applications --region $REGION --output json)

if [ "$(echo $PLATFORM_APPS | jq '.PlatformApplications | length')" -eq 0 ]; then
    echo "❌ No SNS Platform Applications found!"
    echo ""
    echo "You need to create SNS Platform Applications for iOS and Android:"
    echo ""
    echo "For iOS (APNs):"
    echo "  1. Go to AWS SNS Console → Platform applications"
    echo "  2. Create platform application"
    echo "  3. Platform: Apple iOS (APNs)"
    echo "  4. Upload your APNs certificate (.p12 file)"
    echo ""
    echo "For Android (FCM):"
    echo "  1. Go to AWS SNS Console → Platform applications"
    echo "  2. Create platform application"
    echo "  3. Platform: Google Firebase Cloud Messaging (FCM)"
    echo "  4. Enter your FCM Server Key (from Firebase Console)"
    echo ""
else
    echo "✅ Found SNS Platform Applications:"
    echo ""
    echo "$PLATFORM_APPS" | jq -r '.PlatformApplications[] | "  ARN: \(.Arn)"'
fi

echo ""

# Check Lambda function environment variables
echo "⚙️  Checking Lambda function environment variables..."
echo ""

FUNCTION_NAME="solidi-register-device-dev"

FUNCTION_CONFIG=$(aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --output json 2>/dev/null || echo "{}")

if [ "$(echo $FUNCTION_CONFIG | jq -r '.FunctionName')" != "$FUNCTION_NAME" ]; then
    echo "❌ Lambda function '$FUNCTION_NAME' not found"
    echo "   Run lambda/deploy.sh first to deploy the stack"
else
    echo "✅ Lambda function exists: $FUNCTION_NAME"
    echo ""
    echo "Environment Variables:"
    
    IOS_ARN=$(echo $FUNCTION_CONFIG | jq -r '.Environment.Variables.PLATFORM_APPLICATION_ARN_IOS // "NOT SET"')
    ANDROID_ARN=$(echo $FUNCTION_CONFIG | jq -r '.Environment.Variables.PLATFORM_APPLICATION_ARN_ANDROID // "NOT SET"')
    
    echo "  PLATFORM_APPLICATION_ARN_IOS: $IOS_ARN"
    echo "  PLATFORM_APPLICATION_ARN_ANDROID: $ANDROID_ARN"
    echo ""
    
    if [ "$IOS_ARN" = "NOT SET" ] || [ "$IOS_ARN" = "" ]; then
        echo "⚠️  iOS Platform ARN not configured"
    fi
    
    if [ "$ANDROID_ARN" = "NOT SET" ] || [ "$ANDROID_ARN" = "" ]; then
        echo "⚠️  Android Platform ARN not configured"
    fi
fi

echo ""

# Check DynamoDB tables
echo "💾 Checking DynamoDB tables..."
echo ""

DEVICES_TABLE="solidi-devices-dev"
NOTIFICATIONS_TABLE="solidi-notifications-dev"

if aws dynamodb describe-table --table-name $DEVICES_TABLE --region $REGION &> /dev/null; then
    echo "  ✅ $DEVICES_TABLE exists"
else
    echo "  ❌ $DEVICES_TABLE not found"
fi

if aws dynamodb describe-table --table-name $NOTIFICATIONS_TABLE --region $REGION &> /dev/null; then
    echo "  ✅ $NOTIFICATIONS_TABLE exists"
else
    echo "  ❌ $NOTIFICATIONS_TABLE not found"
fi

echo ""

# Check CloudWatch Logs for recent errors
echo "📊 Checking recent CloudWatch logs for errors..."
echo ""

LOG_GROUP="/aws/lambda/$FUNCTION_NAME"

RECENT_ERRORS=$(aws logs filter-log-events \
    --log-group-name $LOG_GROUP \
    --start-time $(($(date +%s) - 3600))000 \
    --filter-pattern "ERROR" \
    --region $REGION \
    --max-items 5 \
    --output json 2>/dev/null | jq -r '.events[]?.message' || echo "")

if [ -z "$RECENT_ERRORS" ]; then
    echo "  No recent errors found (or no logs available)"
else
    echo "  Recent errors:"
    echo "$RECENT_ERRORS" | head -20
fi

echo ""
echo "=============================================="
echo ""

# Provide fix instructions
echo "🔧 HOW TO FIX THE 500 ERROR:"
echo ""
echo "If Platform Application ARNs are missing, you have two options:"
echo ""
echo "Option 1: Update Lambda environment variables directly"
echo "  aws lambda update-function-configuration \\"
echo "    --function-name solidi-register-device-dev \\"
echo "    --region us-east-1 \\"
echo "    --environment Variables=\"{DEVICES_TABLE=solidi-devices-dev,PLATFORM_APPLICATION_ARN_IOS=<YOUR_IOS_ARN>,PLATFORM_APPLICATION_ARN_ANDROID=<YOUR_ANDROID_ARN>}\""
echo ""
echo "Option 2: Redeploy stack with parameters (recommended)"
echo "  Edit lambda/deploy.sh and add to --parameter-overrides:"
echo "    PlatformApplicationArnIOS=<YOUR_IOS_ARN> \\"
echo "    PlatformApplicationArnAndroid=<YOUR_ANDROID_ARN>"
echo ""
