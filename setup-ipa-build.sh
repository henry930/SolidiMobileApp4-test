#!/bin/bash

# Quick IPA Build Setup for SolidiMobileApp4
# Run this before attempting to build IPA

echo "🔧 Setting up SolidiMobileApp4 for IPA build..."

# Navigate to project directory
cd /Users/henry/Documents/SolidiMobileApp4

# 1. Check current app configuration
echo "📱 Current App Information:"
echo "   Display Name: SolidiTest"
echo "   Version: 1.2.0"
echo "   Bundle ID: (from project settings)"

# 2. Setup Node environment
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    echo "✅ Node.js: $(node --version)"
else
    echo "⚠️ NVM not found - ensure Node.js is available"
fi

# 3. Install/update dependencies
echo "📦 Installing dependencies..."
npm install

echo "🍎 Installing iOS dependencies..."
cd ios
pod install --repo-update
cd ..

# 4. Check Xcode project
echo "🔍 Checking Xcode configuration..."
if [ -f "ios/SolidiMobileApp4.xcworkspace" ]; then
    echo "✅ Workspace file found"
else
    echo "❌ Workspace file missing - run 'pod install' in ios folder"
    exit 1
fi

# 5. Pre-build checklist
echo ""
echo "📋 Pre-build Checklist:"
echo "   [ ] Apple Developer account active"
echo "   [ ] App created in App Store Connect"
echo "   [ ] Bundle ID configured and matches App Store Connect"
echo "   [ ] Code signing certificates installed"
echo "   [ ] Provisioning profiles downloaded"
echo "   [ ] App icons added to project"
echo ""
echo "🎯 Next Steps:"
echo "   1. Open ios/SolidiMobileApp4.xcworkspace in Xcode"
echo "   2. Configure code signing in project settings"
echo "   3. Run ./build-ipa.sh to build and upload"
echo "   OR"
echo "   4. Use Xcode: Product → Archive → Distribute App"
echo ""
echo "✅ Setup complete! Ready to build IPA."