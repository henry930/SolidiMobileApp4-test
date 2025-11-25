#!/bin/bash

# Maestro E2E Test Runner Script
# Usage: ./run-maestro-tests.sh [platform] [flow]
# Examples:
#   ./run-maestro-tests.sh              # Run all tests on current platform
#   ./run-maestro-tests.sh ios          # Run all tests on iOS
#   ./run-maestro-tests.sh android      # Run all tests on Android
#   ./run-maestro-tests.sh ios login    # Run specific flow on iOS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_ID="com.solidimobileapp4test"
MAESTRO_DIR=".maestro"
RESULTS_DIR="maestro-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse arguments
PLATFORM=${1:-"auto"}
FLOW=${2:-""}

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Maestro E2E Test Runner             ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Check if Maestro is installed
if ! command -v maestro &> /dev/null; then
    echo -e "${RED}❌ Maestro is not installed!${NC}"
    echo -e "${YELLOW}Install with: curl -Ls \"https://get.maestro.mobile.dev\" | bash${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Maestro version: $(maestro --version)${NC}"
echo ""

# Detect platform if auto
if [ "$PLATFORM" == "auto" ]; then
    if [ "$(uname)" == "Darwin" ]; then
        # Check if iOS simulator is running
        if xcrun simctl list devices | grep -q "Booted"; then
            PLATFORM="ios"
            echo -e "${BLUE}📱 Detected iOS simulator${NC}"
        # Check if Android device/emulator is connected
        elif adb devices | grep -q "device$"; then
            PLATFORM="android"
            echo -e "${BLUE}🤖 Detected Android device/emulator${NC}"
        else
            echo -e "${YELLOW}⚠️  No device detected. Please start a simulator/emulator.${NC}"
            exit 1
        fi
    else
        PLATFORM="android"
        echo -e "${BLUE}🤖 Defaulting to Android${NC}"
    fi
fi

# Verify device is ready
echo -e "${BLUE}Checking device status...${NC}"
if [ "$PLATFORM" == "ios" ]; then
    if ! xcrun simctl list devices | grep -q "Booted"; then
        echo -e "${YELLOW}⚠️  No iOS simulator is running. Starting iPhone 15 Pro...${NC}"
        xcrun simctl boot "iPhone 15 Pro" || {
            echo -e "${RED}❌ Failed to boot simulator${NC}"
            exit 1
        }
        sleep 5
    fi
    DEVICE_NAME=$(xcrun simctl list devices | grep "Booted" | head -1 | sed 's/.*(\(.*\)).*/\1/')
    echo -e "${GREEN}✓ iOS Simulator ready: $DEVICE_NAME${NC}"
elif [ "$PLATFORM" == "android" ]; then
    if ! adb devices | grep -q "device$"; then
        echo -e "${RED}❌ No Android device/emulator connected${NC}"
        echo -e "${YELLOW}Start an emulator or connect a device${NC}"
        exit 1
    fi
    DEVICE_NAME=$(adb devices | grep "device$" | head -1 | awk '{print $1}')
    echo -e "${GREEN}✓ Android device ready: $DEVICE_NAME${NC}"
fi

# Check if app is installed
echo -e "${BLUE}Checking if app is installed...${NC}"
if [ "$PLATFORM" == "ios" ]; then
    if ! xcrun simctl listapps booted | grep -q "$APP_ID"; then
        echo -e "${YELLOW}⚠️  App not installed. Building and installing...${NC}"
        npm run ios -- --simulator="iPhone 15 Pro" &
        BUILD_PID=$!
        sleep 60
        kill $BUILD_PID 2>/dev/null || true
    fi
elif [ "$PLATFORM" == "android" ]; then
    if ! adb shell pm list packages | grep -q "$APP_ID"; then
        echo -e "${YELLOW}⚠️  App not installed. Building and installing...${NC}"
        npm run android
        sleep 10
    fi
fi
echo -e "${GREEN}✓ App is installed${NC}"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR/$TIMESTAMP"

# Determine which flows to run
if [ -n "$FLOW" ]; then
    # Run specific flow
    FLOW_FILE="$MAESTRO_DIR/${FLOW}.yaml"
    if [ ! -f "$FLOW_FILE" ]; then
        FLOW_FILE="$MAESTRO_DIR/$FLOW"
    fi
    
    if [ ! -f "$FLOW_FILE" ]; then
        echo -e "${RED}❌ Flow not found: $FLOW${NC}"
        echo -e "${YELLOW}Available flows:${NC}"
        ls -1 "$MAESTRO_DIR"/*.yaml | xargs -n 1 basename
        exit 1
    fi
    
    echo -e "${BLUE}Running flow: $(basename $FLOW_FILE)${NC}"
    echo ""
    
    maestro test --output "$RESULTS_DIR/$TIMESTAMP" "$FLOW_FILE"
    TEST_RESULT=$?
else
    # Run all flows
    echo -e "${BLUE}Running all flows in $MAESTRO_DIR/${NC}"
    echo ""
    
    maestro test --output "$RESULTS_DIR/$TIMESTAMP" "$MAESTRO_DIR/"
    TEST_RESULT=$?
fi

# Organize results
echo ""
echo -e "${BLUE}Organizing test results...${NC}"

# Move screenshots to results directory
if ls *.png 1> /dev/null 2>&1; then
    mv *.png "$RESULTS_DIR/$TIMESTAMP/" 2>/dev/null || true
fi

# Move videos to results directory
if ls *.mp4 1> /dev/null 2>&1; then
    mv *.mp4 "$RESULTS_DIR/$TIMESTAMP/" 2>/dev/null || true
fi

# Create summary
SUMMARY_FILE="$RESULTS_DIR/$TIMESTAMP/summary.txt"
{
    echo "Maestro Test Run Summary"
    echo "========================"
    echo "Date: $(date)"
    echo "Platform: $PLATFORM"
    echo "Device: $DEVICE_NAME"
    echo "App ID: $APP_ID"
    echo ""
    if [ $TEST_RESULT -eq 0 ]; then
        echo "Result: ✅ PASSED"
    else
        echo "Result: ❌ FAILED"
    fi
    echo ""
    echo "Artifacts:"
    ls -lh "$RESULTS_DIR/$TIMESTAMP"
} > "$SUMMARY_FILE"

# Display results
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Test Results                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ All tests PASSED!${NC}"
else
    echo -e "${RED}❌ Some tests FAILED${NC}"
fi

echo ""
echo -e "${BLUE}Results saved to: $RESULTS_DIR/$TIMESTAMP${NC}"
echo -e "${BLUE}Summary:${NC}"
cat "$SUMMARY_FILE"

# Open results directory
if [ "$(uname)" == "Darwin" ]; then
    echo ""
    echo -e "${YELLOW}Opening results directory...${NC}"
    open "$RESULTS_DIR/$TIMESTAMP"
fi

exit $TEST_RESULT
