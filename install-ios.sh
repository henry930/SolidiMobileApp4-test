#!/bin/bash

echo "Building and installing iOS app..."

# Find the built app
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "SolidiMobileApp4.app" -type d | head -1)

if [ -z "$APP_PATH" ]; then
    echo "No built app found. Trying to build..."
    cd ios
    xcodebuild -workspace SolidiMobileApp4.xcworkspace -scheme SolidiMobileApp4 -sdk iphonesimulator build
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "SolidiMobileApp4.app" -type d | head -1)
fi

if [ ! -z "$APP_PATH" ]; then
    echo "Found app at: $APP_PATH"
    echo "Installing to iPhone 14 Pro Max simulator..."
    xcrun simctl install 07AC46F6-1AF5-431C-BC18-853D9AF3EF39 "$APP_PATH"
    echo "Launching app..."
    xcrun simctl launch 07AC46F6-1AF5-431C-BC18-853D9AF3EF39 co.solidi.mobile.test
else
    echo "Build failed - no app found"
fi