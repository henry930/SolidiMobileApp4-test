#!/bin/bash

# Fast Debug Build and Install Script for iOS
# This script optimizes the build-install-launch cycle for development
#
# Usage:
#   1. Edit the configuration variables below for your environment
#   2. Run: ./build-and-install.sh

set -e  # Exit on error

# ============================================================================
# CONFIGURATION - Edit these variables for your environment
# ============================================================================
DEVICE_ID="00008030-000669240A91402E"  # Your device UDID (find with: xcrun devicectl list devices)
BUNDLE_ID="co.solidi.mobile.test"      # App bundle identifier
WORKSPACE="ios/SolidiMobileApp4.xcworkspace"
SCHEME="SolidiMobileApp4"              # Xcode scheme name
CONFIGURATION="Debug"                   # Build configuration (Debug or Release)
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Fast iOS Debug Build & Install${NC}"
echo ""

# Step 1: Check Metro is running
echo -e "${YELLOW}📦 Checking Metro bundler...${NC}"
if ! nc -z localhost 8081 2>/dev/null; then
    echo -e "${RED}❌ Metro is not running on port 8081${NC}"
    echo -e "${YELLOW}💡 Start Metro in another terminal: npm start${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Metro is running${NC}"
echo ""

# Step 2: Build (only changed files will be recompiled)
echo -e "${YELLOW}🔨 Building app (incremental build)...${NC}"
START_BUILD=$(date +%s)

xcodebuild \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -sdk iphoneos \
    -destination "id=$DEVICE_ID" \
    build \
    ONLY_ACTIVE_ARCH=YES \
    2>&1 | grep -E "(Building|Linking|CodeSign|BUILD)" || true

END_BUILD=$(date +%s)
BUILD_TIME=$((END_BUILD - START_BUILD))
echo -e "${GREEN}✅ Build completed in ${BUILD_TIME}s${NC}"
echo ""

# Step 3: Install
echo -e "${YELLOW}📲 Installing app on device...${NC}"
START_INSTALL=$(date +%s)

APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/SolidiMobileApp4-*/Build/Products/Debug-iphoneos -name "SolidiMobileApp4.app" -type d 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
    echo -e "${RED}❌ Error: Could not find built app${NC}"
    exit 1
fi

xcrun devicectl device install app \
    --device "$DEVICE_ID" \
    "$APP_PATH" \
    2>&1 | grep -E "(Complete|installed|%)" || true

END_INSTALL=$(date +%s)
INSTALL_TIME=$((END_INSTALL - START_INSTALL))
echo -e "${GREEN}✅ Installation completed in ${INSTALL_TIME}s${NC}"
echo ""

# Step 4: Launch
echo -e "${YELLOW}🎯 Launching app...${NC}"
xcrun devicectl device process launch \
    --device "$DEVICE_ID" \
    "$BUNDLE_ID" \
    > /dev/null 2>&1

echo -e "${GREEN}✅ App launched successfully${NC}"
echo ""

# Summary
TOTAL_TIME=$((BUILD_TIME + INSTALL_TIME))
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Total time: ${TOTAL_TIME}s (Build: ${BUILD_TIME}s + Install: ${INSTALL_TIME}s)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 Tips for faster iterations:${NC}"
echo -e "  • For JS-only changes: Just save the file (Fast Refresh ~2s)"
echo -e "  • For native changes: Run this script again"
echo -e "  • Keep Metro running to avoid restart delays"
