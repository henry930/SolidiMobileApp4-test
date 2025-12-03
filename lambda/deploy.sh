#!/bin/bash

# Deploy Solidi Push Notification API to AWS Lambda
# This script deploys the Lambda functions and creates DynamoDB tables using AWS SAM

set -e

# Configuration
STACK_NAME="solidi-push-notification-api"
ENVIRONMENT="dev"
REGION="us-east-1"
S3_BUCKET="solidi-lambda-deployments"

echo "🚀 Deploying Solidi Push Notification API"
echo "=========================================="
echo "Stack Name: $STACK_NAME"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo ""

# Check if AWS SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ AWS SAM CLI is not installed"
    echo "📥 Install it with: brew install aws-sam-cli"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured"
    echo "📥 Run: aws configure"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Create S3 bucket if it doesn't exist
echo "📦 Checking S3 bucket..."
if ! aws s3 ls "s3://$S3_BUCKET" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "✅ S3 bucket exists: $S3_BUCKET"
else
    echo "📦 Creating S3 bucket: $S3_BUCKET"
    aws s3 mb "s3://$S3_BUCKET" --region $REGION
fi

# Install dependencies for each Lambda function
echo ""
echo "📦 Installing Lambda dependencies..."
for dir in lambda/*/; do
    if [ -f "${dir}package.json" ]; then
        echo "  Installing dependencies for $(basename $dir)..."
        (cd "$dir" && npm install --production)
    fi
done

# Build SAM application
echo ""
echo "🔨 Building SAM application..."
sam build --template template.yaml

# Deploy SAM application
echo ""
echo "🚀 Deploying to AWS..."
sam deploy \
    --template-file .aws-sam/build/template.yaml \
    --stack-name "$STACK_NAME" \
    --s3-bucket "$S3_BUCKET" \
    --capabilities CAPABILITY_IAM \
    --region "$REGION" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

# Get API endpoint
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Stack Outputs:"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs' \
    --output table

# Get API URL
API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text)

echo ""
echo "🎉 API deployed successfully!"
echo "📍 API URL: $API_URL"
echo ""
echo "Available endpoints:"
echo "  POST   $API_URL/register        - Register device"
echo "  POST   $API_URL/send            - Send notification"
echo "  GET    $API_URL/notifications   - Get user notifications"
echo ""
