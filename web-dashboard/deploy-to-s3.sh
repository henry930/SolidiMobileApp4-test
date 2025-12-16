#!/bin/bash

# Deploy Solidi Notification Dashboard to S3 with CloudFront

set -e

BUCKET_NAME="solidi-notification-dashboard"
REGION="us-east-1"

echo "🚀 Deploying Solidi Notification Dashboard to S3"
echo "================================================"
echo ""

# Check if bucket exists
if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "📦 Creating S3 bucket: $BUCKET_NAME"
    aws s3 mb "s3://$BUCKET_NAME" --region $REGION
    
    # Enable static website hosting
    echo "🌐 Enabling static website hosting..."
    aws s3 website "s3://$BUCKET_NAME" \
        --index-document index.html \
        --error-document index.html
    
    # Set bucket policy for public read access
    echo "🔓 Setting public read access..."
    cat > /tmp/bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
    
    aws s3api put-bucket-policy \
        --bucket $BUCKET_NAME \
        --policy file:///tmp/bucket-policy.json
    
    # Disable block public access
    aws s3api put-public-access-block \
        --bucket $BUCKET_NAME \
        --public-access-block-configuration \
        "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
else
    echo "✅ S3 bucket exists: $BUCKET_NAME"
fi

# Upload dashboard
echo ""
echo "📤 Uploading dashboard files..."
aws s3 cp index.html "s3://$BUCKET_NAME/index.html" \
    --content-type "text/html" \
    --cache-control "no-cache"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Dashboard URL:"
echo "   http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo ""
echo "🔗 Direct S3 URL:"
echo "   https://$BUCKET_NAME.s3.$REGION.amazonaws.com/index.html"
echo ""
