#!/bin/bash

# AWS SNS Setup Script
# Creates SNS Platform Application for iOS push notifications

echo "======================================"
echo "AWS SNS Platform Application Setup"
echo "======================================"
echo ""

# Check if .p12 file exists
if [ ! -f ~/Desktop/apns_dev_cert.p12 ]; then
    echo "❌ ERROR: apns_dev_cert.p12 not found at ~/Desktop/"
    echo "Please run ./scripts/setup-apns-cert.sh first"
    exit 1
fi

echo "✅ Found APNS certificate"
echo ""

# Get AWS region
AWS_REGION="${1:-us-east-1}"
echo "Using AWS Region: $AWS_REGION"
echo ""

# Convert .p12 to base64
echo "Converting certificate to base64..."
CERT_BASE64=$(cat ~/Desktop/apns_dev_cert.p12 | base64)

if [ -z "$CERT_BASE64" ]; then
    echo "❌ ERROR: Failed to convert certificate to base64"
    exit 1
fi

echo "✅ Certificate converted"
echo ""

# Create SNS Platform Application
echo "Creating AWS SNS Platform Application..."
echo ""

PLATFORM_ARN=$(aws sns create-platform-application \
  --name solidi-mobile-apns-dev \
  --platform APNS_SANDBOX \
  --attributes PlatformCredential="$CERT_BASE64" \
  --region "$AWS_REGION" \
  --query 'PlatformApplicationArn' \
  --output text 2>&1)

if [ $? -eq 0 ]; then
    echo "✅ SUCCESS! Platform Application created"
    echo ""
    echo "======================================"
    echo "IMPORTANT - SAVE THIS ARN:"
    echo "======================================"
    echo "$PLATFORM_ARN"
    echo "======================================"
    echo ""
    
    # Save to file
    echo "$PLATFORM_ARN" > infrastructure/apns-platform-arn.txt
    echo "✅ ARN saved to: infrastructure/apns-platform-arn.txt"
    echo ""
    
    # Update CloudFormation template
    echo "Updating CloudFormation template..."
    
    # Check if template exists
    if [ -f infrastructure/cloudformation-template.yaml ]; then
        # Create backup
        cp infrastructure/cloudformation-template.yaml infrastructure/cloudformation-template.yaml.backup
        
        # Update the ARN in the template
        sed -i.bak "s|arn:aws:sns:.*:app/APNS_SANDBOX/.*|$PLATFORM_ARN|g" infrastructure/cloudformation-template.yaml
        
        echo "✅ CloudFormation template updated"
        echo ""
    fi
    
    echo "Next step: Deploy AWS Infrastructure"
    echo "Run: ./scripts/deploy-push-notifications.sh dev $AWS_REGION"
else
    echo "❌ ERROR: Failed to create platform application"
    echo "$PLATFORM_ARN"
    exit 1
fi
