#!/bin/bash

# Quick redeploy of register-device Lambda function only

set -e

FUNCTION_NAME="solidi-register-device-dev"
REGION="us-east-1"

echo "🚀 Redeploying register-device Lambda function..."
echo ""

cd /Users/henry/Solidi/SolidiMobileApp4/lambda/register-device

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production --silent

# Create deployment package
echo "📦 Creating deployment package..."
rm -f function.zip
zip -q -r function.zip index.js node_modules/

# Update Lambda function
echo "🚀 Updating Lambda function..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION \
    --output json > /dev/null

echo "✅ Lambda function updated successfully!"
echo ""
echo "Waiting for update to complete..."
aws lambda wait function-updated \
    --function-name $FUNCTION_NAME \
    --region $REGION

echo "✅ Function is ready!"
echo ""
echo "You can now test device registration again."
