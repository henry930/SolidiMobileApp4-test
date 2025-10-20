#!/bin/bash

# Device Build Script for SolidiMobileApp4
# Builds and installs the app on iPhone device with proper IP configuration

set -e  # Exit on error

echo "� Building SolidiMobileApp4 for iPhone device..."

# Get the local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo "� Local development server IP: $LOCAL_IP"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd ios
xcodebuild clean -workspace SolidiMobileApp4.xcworkspace -scheme SolidiMobileApp4 > /dev/null 2>&1
cd ..

# Build and install on device
echo "� Building and installing on device..."
npx react-native run-ios --device

echo "✅ Build completed!"
echo "� The app should now connect to Metro server at $LOCAL_IP:8081"
echo ""
echo "Make sure:"
echo "  1. Your iPhone is connected via USB"
echo "  2. Developer Mode is enabled on iPhone"
echo "  3. This computer is trusted on iPhone"
echo "  4. Both devices are on the same WiFi network"
echo "  5. Metro server is running: npx react-native start --host 0.0.0.0"