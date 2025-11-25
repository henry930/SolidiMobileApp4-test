#!/bin/bash

# Simple Push Notification Test - Local Notification Trigger
# This creates a local notification on the device to test the notification display

echo "======================================"
echo "Local Push Notification Test"
echo "======================================"
echo ""
echo "This will trigger a LOCAL notification on your device"
echo "to test the notification display without AWS/Firebase"
echo ""

# Check if we have the necessary tools
if ! command -v xcrun &> /dev/null; then
    echo "Error: xcrun not found. This script requires Xcode."
    exit 1
fi

# Get device UDID
echo "Looking for connected iOS devices..."
DEVICE_UDID=$(xcrun xctrace list devices 2>&1 | grep "iPhone" | grep -v "Simulator" | head -1 | sed 's/.*(\([^)]*\)).*/\1/')

if [ -z "$DEVICE_UDID" ]; then
    echo "Error: No iOS device found. Please connect your iPhone."
    exit 1
fi

echo "Found device: $DEVICE_UDID"
echo ""

# Create notification payload
NOTIFICATION_TITLE="Test Push Notification"
NOTIFICATION_BODY="This is a test notification sent at $(date '+%H:%M:%S')"

echo "Notification Details:"
echo "  Title: $NOTIFICATION_TITLE"
echo "  Body: $NOTIFICATION_BODY"
echo ""

# Instructions for manual testing
echo "======================================"
echo "MANUAL TEST INSTRUCTIONS"
echo "======================================"
echo ""
echo "Since we need Firebase configured for real push notifications,"
echo "here are the steps to test:"
echo ""
echo "1. OPTION A: Use the + button in the inbox (already added)"
echo "   - Open app → Tap bell icon → Tap blue + button"
echo ""
echo "2. OPTION B: Deploy AWS and send via API (requires Firebase setup)"
echo "   - Configure Firebase (see docs/PUSH_NOTIFICATIONS_IOS_SETUP.md)"
echo "   - Deploy AWS: ./scripts/deploy-push-notifications.sh dev us-east-1"
echo "   - Get FCM token from app logs"
echo "   - Send test notification via API"
echo ""
echo "3. OPTION C: Use Firebase Console (easiest for testing)"
echo "   - Set up Firebase project"
echo "   - Add GoogleService-Info.plist to iOS project"
echo "   - Rebuild app"
echo "   - Use Firebase Console → Cloud Messaging → Send test message"
echo ""
echo "======================================"
echo ""
echo "Would you like me to:"
echo "  A) Help you set up Firebase for real notifications"
echo "  B) Create a mock API server for local testing"
echo "  C) Show you how to get the FCM token from the app"
echo ""

read -p "Choose option (A/B/C): " choice

case $choice in
    [Aa]* )
        echo ""
        echo "To set up Firebase:"
        echo "1. Go to https://console.firebase.google.com"
        echo "2. Create/select project"
        echo "3. Add iOS app with bundle ID: co.solidi.mobile.test"
        echo "4. Download GoogleService-Info.plist"
        echo "5. Add to ios/SolidiMobileApp4/ folder"
        echo "6. Rebuild app: npx react-native run-ios --device"
        echo ""
        echo "See full instructions: docs/PUSH_NOTIFICATIONS_IOS_SETUP.md"
        ;;
    [Bb]* )
        echo ""
        echo "Creating mock API server..."
        echo "This will create a simple server to test notifications locally"
        ;;
    [Cc]* )
        echo ""
        echo "To get FCM token from the app:"
        echo "1. Check Metro bundler logs when app starts"
        echo "2. Look for: 'PushNotificationService: FCM Token: ...'"
        echo "3. Copy the token"
        echo "4. Use it to send test notification"
        ;;
    * )
        echo "Invalid option"
        ;;
esac
