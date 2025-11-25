#!/bin/bash

# Solidi Mobile App - iOS Device Deployment Script

set -e  # Exit on error

echo "📱 Deploying to iOS Device..."

# Check if a device is connected
DEVICES=$(xcrun xctrace list devices 2>&1 | grep -v "Simulator")

if [ -z "$DEVICES" ]; then
    echo "❌ No physical iOS devices found."
    echo "Please connect your iPhone via USB and ensure it is trusted."
    exit 1
fi

echo "✅ Found connected devices:"
echo "$DEVICES"

# Install and launch on device
echo "🚀 Building and installing app..."
npx react-native run-ios --device "Henry's iPhone"

echo "✅ Deployment complete!"
