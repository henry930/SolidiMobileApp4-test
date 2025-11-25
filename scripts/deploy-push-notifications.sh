#!/bin/bash

# Deploy Push Notification Infrastructure to AWS
# Usage: ./deploy-push-notifications.sh [environment] [region]

set -e

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
STACK_NAME="${ENVIRONMENT}-push-notification-stack"

echo "======================================"
echo "Push Notification Infrastructure Deploy"
echo "======================================"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Stack Name: $STACK_NAME"
echo "======================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    echo "Install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Error: AWS credentials not configured"
    echo "Run: aws configure"
    exit 1
fi

echo "✓ AWS credentials configured"

# Package Lambda functions
echo ""
echo "Packaging Lambda functions..."

# Package register-device
cd lambda/register-device
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for register-device..."
    npm install --production
fi
zip -r ../../register-device.zip . -x "*.git*" -x "node_modules/aws-sdk/*"
cd ../..
echo "✓ register-device packaged"

# Package send-notification
cd lambda/send-notification
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for send-notification..."
    npm install --production
fi
zip -r ../../send-notification.zip . -x "*.git*" -x "node_modules/aws-sdk/*"
cd ../..
echo "✓ send-notification packaged"

# Deploy CloudFormation stack
echo ""
echo "Deploying CloudFormation stack..."

aws cloudformation deploy \
    --template-file infrastructure/cloudformation-template.yaml \
    --stack-name "$STACK_NAME" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION" \
    --no-fail-on-empty-changeset

if [ $? -eq 0 ]; then
    echo "✓ CloudFormation stack deployed"
else
    echo "✗ CloudFormation deployment failed"
    exit 1
fi

# Get stack outputs
echo ""
echo "Getting stack outputs..."
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='APIEndpoint'].OutputValue" \
    --output text)

REGISTER_FUNCTION=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='RegisterDeviceFunctionArn'].OutputValue" \
    --output text)

SEND_FUNCTION=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='SendNotificationFunctionArn'].OutputValue" \
    --output text)

# Update Lambda function code
echo ""
echo "Updating Lambda function code..."

aws lambda update-function-code \
    --function-name "$REGISTER_FUNCTION" \
    --zip-file fileb://register-device.zip \
    --region "$REGION" > /dev/null

echo "✓ register-device code updated"

aws lambda update-function-code \
    --function-name "$SEND_FUNCTION" \
    --zip-file fileb://send-notification.zip \
    --region "$REGION" > /dev/null

echo "✓ send-notification code updated"

# Clean up zip files
rm -f register-device.zip send-notification.zip
echo "✓ Cleaned up temporary files"

# Display deployment information
echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo "API Endpoint: $API_ENDPOINT"
echo ""
echo "Endpoints:"
echo "  Register: POST $API_ENDPOINT/register"
echo "  Send:     POST $API_ENDPOINT/send"
echo ""
echo "Next Steps:"
echo "1. Configure APNS certificates (iOS)"
echo "2. Configure FCM server key (Android)"
echo "3. Update mobile app with API endpoint"
echo "4. Test device registration"
echo "======================================"

# Save configuration
cat > .push-notification-config.json <<EOF
{
  "environment": "$ENVIRONMENT",
  "region": "$REGION",
  "apiEndpoint": "$API_ENDPOINT",
  "registerFunction": "$REGISTER_FUNCTION",
  "sendFunction": "$SEND_FUNCTION"
}
EOF

echo ""
echo "Configuration saved to .push-notification-config.json"
