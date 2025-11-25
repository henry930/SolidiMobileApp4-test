#!/bin/bash

# Install Push Notification Dependencies
# Run this script to install all required packages

set -e

echo "======================================"
echo "Installing Push Notification Dependencies"
echo "======================================"

# Install npm packages
echo ""
echo "Installing npm packages..."
npm install \
  @react-native-firebase/app@^18.7.3 \
  @react-native-firebase/messaging@^18.7.3 \
  @notifee/react-native@^7.8.2 \
  react-native-device-info@^10.13.1

echo "✓ npm packages installed"

# iOS setup
if [ -d "ios" ]; then
  echo ""
  echo "Setting up iOS..."
  cd ios
  
  # Install pods
  echo "Installing CocoaPods..."
  pod install
  
  cd ..
  echo "✓ iOS setup complete"
  
  echo ""
  echo "⚠️  iOS Additional Steps Required:"
  echo "1. Add GoogleService-Info.plist to ios/SolidiMobileApp4/"
  echo "2. Enable Push Notifications capability in Xcode"
  echo "3. Enable Background Modes > Remote notifications in Xcode"
  echo "4. Generate APNS certificate and upload to AWS SNS"
  echo ""
  echo "See docs/PUSH_NOTIFICATIONS_IOS_SETUP.md for details"
fi

# Android setup
if [ -d "android" ]; then
  echo ""
  echo "⚠️  Android Additional Steps Required:"
  echo "1. Add google-services.json to android/app/"
  echo "2. Update android/build.gradle (add google-services plugin)"
  echo "3. Update android/app/build.gradle (add Firebase dependencies)"
  echo "4. Get FCM server key and upload to AWS SNS"
  echo ""
  echo "See docs/PUSH_NOTIFICATIONS_ANDROID_SETUP.md for details"
fi

echo ""
echo "======================================"
echo "Installation Complete!"
echo "======================================"
echo ""
echo "Next Steps:"
echo "1. Follow platform-specific setup guides in docs/"
echo "2. Deploy AWS infrastructure: ./scripts/deploy-push-notifications.sh"
echo "3. Configure APNS and FCM in AWS SNS"
echo "4. Update API endpoint in src/services/PushNotificationService.js"
echo "5. Test device registration and notification sending"
echo ""
echo "======================================"
