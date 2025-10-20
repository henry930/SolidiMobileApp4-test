#!/bin/bash

# Complete App Setup Script for localhost
# Builds and runs the app, then tests reload

PROJECT_DIR="/Users/henry/Solidi/SolidiMobileApp4"
cd "$PROJECT_DIR"

echo "🚀 Complete SolidiMobileApp4 Setup"
echo "=================================="

# Step 1: Ensure Metro is running on localhost
echo "1️⃣ Checking Metro status..."
if curl -s http://localhost:8081/status >/dev/null 2>&1; then
    echo "✅ Metro is running on localhost"
else
    echo "❌ Metro not running, starting it..."
    ./restart-localhost.sh
    sleep 5
fi

# Step 2: Check if simulator is running
echo ""
echo "2️⃣ Checking iOS Simulator..."
SIMULATOR_STATUS=$(xcrun simctl list devices | grep "Booted" || echo "none")
if [[ "$SIMULATOR_STATUS" == *"iPhone"* ]]; then
    echo "✅ iOS Simulator is running"
else
    echo "🔄 Starting iOS Simulator..."
    open -a Simulator
    sleep 5
fi

# Step 3: Build and install the app
echo ""
echo "3️⃣ Building and installing app..."
echo "This may take a minute..."
npx react-native run-ios --simulator="iPhone 15" --no-packager

# Step 4: Test reload functionality
echo ""
echo "4️⃣ Testing reload functionality..."
sleep 3
./reload.sh

echo ""
echo "🎉 Setup complete!"
echo "💡 Your app should now be running and connected to Metro"
echo "💡 Try making a code change and run: ./reload.sh"