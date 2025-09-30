#!/bin/bash

# Setup environment
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Navigate to project directory
cd "$(dirname "$0")"

echo "Starting Metro bundler..."
# Start Metro in the background
npx react-native start &
METRO_PID=$!

# Wait a moment for Metro to start
sleep 5

echo "Building and running iOS app..."
# Build and install the app using xcodebuild directly
xcodebuild \
  -workspace ios/SolidiMobileApp4.xcworkspace \
  -scheme SolidiMobileApp4 \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro Max' \
  -derivedDataPath ios/build \
  clean build

if [ $? -eq 0 ]; then
  echo "Build successful! Installing app to simulator..."
  
  # Install the app to the simulator
  xcrun simctl install "iPhone 15 Pro Max" ios/build/Build/Products/Debug-iphonesimulator/SolidiMobileApp4.app
  
  # Launch the app
  xcrun simctl launch "iPhone 15 Pro Max" com.solidifx.SolidiMobileApp4
  
  echo "App launched successfully!"
else
  echo "Build failed!"
  kill $METRO_PID
  exit 1
fi

echo "Metro is running in the background (PID: $METRO_PID)"
echo "Press Ctrl+C to stop Metro and exit"

# Wait for user to stop Metro
wait $METRO_PID